import logging

from fastapi import Depends, HTTPException, status
from itsdangerous import BadData, BadSignature, URLSafeTimedSerializer
from starlette.responses import JSONResponse

from stellage.apps.auth.handlers import AuthHandler
from stellage.apps.auth.managers import UserManager
from stellage.apps.auth.schemas import (
    AuthUser,
    ChangePasswordSchema,
    CreateUser,
    DeviceAccount,
    DeviceAccountView,
    UserReturnData,
    UserVerifySchema,
)
from stellage.apps.invites.repositories import InviteRepository
from stellage.apps.invites.services import InviteService
from stellage.apps.profile.avatar import AvatarManager
from stellage.apps.profile.managers import ProfileManager
from stellage.core.settings import settings

from .tasks import send_confirmation_email

logger = logging.getLogger(__name__)

class UserService:
    def __init__(
        self,
        manager: UserManager = Depends(UserManager),
        handler: AuthHandler = Depends(AuthHandler),
        profile_manager: ProfileManager = Depends(ProfileManager),
        avatar_manager: AvatarManager = Depends(AvatarManager),
    ):
        self.manager = manager
        self.handler = handler
        self.profile_manager = profile_manager
        self.avatar_manager = avatar_manager
        self.serializer = URLSafeTimedSerializer(secret_key=settings.secret_key.get_secret_value())

    async def register_user(self, user: AuthUser) -> UserReturnData:
        inv_repo = InviteRepository(self.manager.db)
        invite = await inv_repo.get_by_code(user.invite_code)
        if not invite or not invite.is_active or invite.uses_count >= invite.max_uses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Недействительный или уже использованный инвайт-код",
            )

        hashed_password = await self.handler.get_hashed_password(user.password)

        new_user = CreateUser(
            email=user.email,
            hashed_password=hashed_password,
            username=user.username,
            invited_by_id=invite.creator_id,
        )

        user_data = await self.manager.create_user(new_user)

        # Отмечаем инвайт-код как использованный данным пользователем
        await inv_repo.use_invite(invite.id, user_data.id)

        # Выдаем новому пользователю 3 инвайт-кода для приглашения друзей
        inv_service = InviteService(inv_repo)
        await inv_service.create_user_default_invites(user_data.id, count=3)

        logger.info("User registered via invite code %s: %s", user.invite_code, user_data.email)

        confirmation_token = self.serializer.dumps(user_data.email)
        try:
            send_confirmation_email.delay(user_data.email, confirmation_token)
        except Exception as err:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Registration succeeded but confirmation email could not be sent. Please try again later.",
            ) from err

        return user_data


    async def confirm_user(self, token: str) -> None:
        try:
            email = self.serializer.loads(token, max_age=3600)

        except BadSignature as err:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired token"
            ) from err

        await self.manager.confirm_user(email)


    # Refresh-cookie ограничена путём /api.v1/auth, чтобы длинный токен не
    # гонялся в каждом запросе — только на /auth/refresh и /auth/logout.
    REFRESH_COOKIE_PATH = "/api.v1/auth"

    # Реестр аккаунтов, залогиненных на этом устройстве, для мгновенного
    # переключения без пароля. Храним ТОЛЬКО id+session_id, подписанные секретом
    # (itsdangerous) — секретов/паролей внутри нет. Подпись не даёт подделать
    # список; сам доступ к аккаунту всё равно проверяется по живой refresh-сессии
    # в Redis, поэтому «протухшая» запись переключение не даст.
    DEVICE_COOKIE = "DeviceAccounts"
    DEVICE_COOKIE_MAX = 8  # разумный предел аккаунтов на устройстве

    def _read_device_accounts(self, cookie_value: str | None) -> list[DeviceAccount]:
        if not cookie_value:
            return []
        try:
            raw = self.serializer.loads(
                cookie_value,
                max_age=settings.refresh_token_expire,
            )
        except (BadSignature, BadData):
            return []
        accounts: list[DeviceAccount] = []
        seen: set[str] = set()
        for item in raw if isinstance(raw, list) else []:
            try:
                acc = DeviceAccount(**item)
            except Exception:
                continue
            key = f"{acc.id}:{acc.session_id}"
            if key in seen:
                continue
            seen.add(key)
            accounts.append(acc)
        return accounts

    def _set_device_cookie(
        self,
        response: JSONResponse,
        accounts: list[DeviceAccount],
    ) -> None:
        payload = [{"id": str(a.id), "session_id": a.session_id} for a in accounts]
        value = self.serializer.dumps(payload)
        response.set_cookie(
            key=self.DEVICE_COOKIE,
            value=value,
            httponly=True,
            secure=settings.cookie_secure,
            samesite="lax",
            max_age=settings.refresh_token_expire,
            path=self.REFRESH_COOKIE_PATH,
        )

    def _upsert_device_account(
        self,
        accounts: list[DeviceAccount],
        user_id,
        session_id: str,
    ) -> list[DeviceAccount]:
        """Ставит (обновляет) запись аккаунта в начало списка. Один аккаунт на
        устройстве = одна активная запись (перелогин заменяет старую сессию)."""
        uid = str(user_id)
        rest = [a for a in accounts if str(a.id) != uid]
        head = DeviceAccount(id=uid, session_id=session_id)
        return [head, *rest][: self.DEVICE_COOKIE_MAX]

    def _set_access_cookie(self, response: JSONResponse, token: str) -> None:
        response.set_cookie(
            key="Authorization",
            value=token,
            httponly=True,
            secure=settings.cookie_secure,
            samesite="lax",
            max_age=settings.access_token_expire,
        )

    def _set_refresh_cookie(self, response: JSONResponse, token: str) -> None:
        response.set_cookie(
            key="RefreshToken",
            value=token,
            httponly=True,
            secure=settings.cookie_secure,
            samesite="lax",
            max_age=settings.refresh_token_expire,
            path=self.REFRESH_COOKIE_PATH,
        )

    async def _issue_session(
        self,
        user_id,
        session_id: str | None = None,
    ) -> tuple[str, str, str]:
        """Выпускает пару access+refresh для (новой или существующей) сессии и
        сохраняет обе в Redis. Возвращает (access, refresh, session_id)."""
        access, session_id = await self.handler.create_access_token(
            user_id=user_id,
            session_id=session_id,
        )
        refresh = await self.handler.create_refresh_token(
            user_id=user_id,
            session_id=session_id,
        )
        await self.manager.store_access_token(
            user_id=user_id,
            token=access,
            session_id=session_id,
        )
        await self.manager.store_refresh_token(
            user_id=user_id,
            token=refresh,
            session_id=session_id,
        )
        return access, refresh, session_id

    async def login_user(
        self,
        user: AuthUser,
        device_cookie: str | None = None,
    ) -> JSONResponse:
        exist_user = await self.manager.get_user_by_email(email=str(user.email))

        is_invalid_exist_user: bool = (
            not exist_user
            or not await self.handler.verify_password(
                raw_password=user.password,
                hashed_password=exist_user.hashed_password,
            )
        )

        if is_invalid_exist_user:
            logger.warning("Failed login attempt for email: %s", user.email)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Wrong email or password",
            )

        if not exist_user.is_verified:
            logger.warning("Login attempt by unverified user: %s", user.email)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Exist user is not verified",
            )

        access, refresh, session_id = await self._issue_session(user_id=exist_user.id)

        logger.info("User logged in: %s", exist_user.email)
        response = JSONResponse(content={"message": "Login is successful"})
        self._set_access_cookie(response, access)
        self._set_refresh_cookie(response, refresh)

        # Добавляем аккаунт в реестр устройства — чтобы дальше переключаться на
        # него без пароля, пока жива refresh-сессия (по умолчанию месяц).
        accounts = self._read_device_accounts(device_cookie)
        accounts = self._upsert_device_account(accounts, exist_user.id, session_id)
        self._set_device_cookie(response, accounts)

        return response


    async def refresh_session(
        self,
        refresh_token: str | None,
        device_cookie: str | None = None,
    ) -> JSONResponse:
        """Тихое продление сессии: по валидному refresh-токену из cookie
        перевыпускает и access, и refresh (ротация), обновляя обе cookie."""
        if not refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token is missing",
            )

        payload = await self.handler.decode_refresh_token(refresh_token)
        user_id = payload["user_id"]
        session_id = payload["session_id"]

        stored = await self.manager.get_refresh_token(
            user_id=user_id,
            session_id=session_id,
        )
        if not stored or stored != refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token is invalid",
            )

        access, refresh, _ = await self._issue_session(
            user_id=user_id,
            session_id=session_id,
        )

        response = JSONResponse(content={"message": "Session refreshed"})
        self._set_access_cookie(response, access)
        self._set_refresh_cookie(response, refresh)

        # Держим запись активного аккаунта на месте (продлеваем TTL cookie).
        accounts = self._read_device_accounts(device_cookie)
        accounts = self._upsert_device_account(accounts, user_id, session_id)
        self._set_device_cookie(response, accounts)
        return response


    async def list_device_accounts(
        self,
        current_user_id,
        device_cookie: str | None,
    ) -> list[DeviceAccountView]:
        """Аккаунты этого устройства для меню переключения. Оставляем только те,
        у кого refresh-сессия ещё жива в Redis (иначе переключение всё равно
        невозможно). Собираем отображаемые данные + presigned-аватар."""
        accounts = self._read_device_accounts(device_cookie)
        views: list[DeviceAccountView] = []
        for acc in accounts:
            stored = await self.manager.get_refresh_token(
                user_id=acc.id,
                session_id=acc.session_id,
            )
            if not stored:
                continue
            full = await self.profile_manager.get_user_by_id(user_id=acc.id)
            if not full:
                continue
            avatar_url = None
            if full.avatar_key:
                avatar_url = await self.avatar_manager.get_avatar_url(
                    avatar_key=full.avatar_key,
                )
            views.append(
                DeviceAccountView(
                    id=str(full.id),
                    email=full.email,
                    username=full.username,
                    nickname=full.nickname,
                    avatar_url=avatar_url,
                    is_current=str(full.id) == str(current_user_id),
                )
            )
        return views


    async def switch_account(
        self,
        target_user_id: str,
        device_cookie: str | None,
    ) -> JSONResponse:
        """Мгновенное переключение на другой аккаунт устройства БЕЗ пароля:
        находим его живую refresh-сессию, перевыпускаем access+refresh и ставим
        cookie. Пароль не нужен — доверие даёт ранее выполненный логин, чью
        refresh-сессию мы храним в Redis (истекает через месяц)."""
        accounts = self._read_device_accounts(device_cookie)
        target = next((a for a in accounts if str(a.id) == str(target_user_id)), None)
        if target is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account is not linked to this device",
            )

        stored = await self.manager.get_refresh_token(
            user_id=target.id,
            session_id=target.session_id,
        )
        if not stored:
            # Сессия истекла — убираем запись и просим войти заново.
            remaining = [a for a in accounts if str(a.id) != str(target_user_id)]
            response = JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Session expired, please log in again"},
            )
            self._set_device_cookie(response, remaining)
            return response

        access, refresh, session_id = await self._issue_session(
            user_id=target.id,
            session_id=target.session_id,
        )

        response = JSONResponse(content={"message": "Switched"})
        self._set_access_cookie(response, access)
        self._set_refresh_cookie(response, refresh)
        accounts = self._upsert_device_account(accounts, target.id, session_id)
        self._set_device_cookie(response, accounts)
        logger.info("Switched active account to user_id=%s", target.id)
        return response


    async def unlink_device_account(
        self,
        target_user_id: str,
        current_user_id,
        device_cookie: str | None,
    ) -> JSONResponse:
        """Убрать аккаунт из устройства: revoke его refresh-сессии + удалить из
        cookie. Текущий активный аккаунт так не отвязываем (для этого — logout)."""
        if str(target_user_id) == str(current_user_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Use logout to sign out of the current account",
            )
        accounts = self._read_device_accounts(device_cookie)
        target = next((a for a in accounts if str(a.id) == str(target_user_id)), None)
        if target is not None:
            await self.manager.revoke_refresh_token(
                user_id=target.id,
                session_id=target.session_id,
            )
        remaining = [a for a in accounts if str(a.id) != str(target_user_id)]
        response = JSONResponse(content={"message": "Account unlinked"})
        self._set_device_cookie(response, remaining)
        return response


    async def logout_user(
        self,
        user: UserVerifySchema,
        device_cookie: str | None = None,
    ) -> JSONResponse:
        await self.manager.revoke_access_token(
            user_id=user.id,
            session_id=user.session_id,
        )
        await self.manager.revoke_refresh_token(
            user_id=user.id,
            session_id=user.session_id,
        )

        response = JSONResponse(content={"message": "Logged out"})
        response.delete_cookie(key="Authorization")
        response.delete_cookie(key="RefreshToken", path=self.REFRESH_COOKIE_PATH)

        # Убираем текущий аккаунт из реестра устройства (но остальные оставляем —
        # можно тут же переключиться на другой без пароля).
        accounts = self._read_device_accounts(device_cookie)
        remaining = [a for a in accounts if str(a.id) != str(user.id)]
        self._set_device_cookie(response, remaining)

        return response


    async def change_password(
        self,
        user_id: str,
        payload: ChangePasswordSchema,
    ) -> None:
        current_hash = await self.manager.get_user_password_hash(user_id)
        if not current_hash or not await self.handler.verify_password(
            raw_password=payload.current_password,
            hashed_password=current_hash,
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Текущий пароль указан неверно",
            )
        new_hash = await self.handler.get_hashed_password(payload.new_password)
        await self.manager.update_password(user_id, new_hash)
        logger.info("Password changed for user_id=%s", user_id)

    async def delete_account(
        self,
        user: UserVerifySchema,
        device_cookie: str | None = None,
    ) -> JSONResponse:
        await self.manager.revoke_access_token(
            user_id=user.id,
            session_id=user.session_id,
        )
        await self.manager.revoke_refresh_token(
            user_id=user.id,
            session_id=user.session_id,
        )
        await self.manager.delete_account(
            user_id=user.id,
        )
        logger.info("Account deleted: user_id=%s", user.id)

        response = JSONResponse(content={"message": "Deleting the account was successful"})
        response.delete_cookie(key="Authorization")
        response.delete_cookie(key="RefreshToken", path=self.REFRESH_COOKIE_PATH)
        accounts = self._read_device_accounts(device_cookie)
        remaining = [a for a in accounts if str(a.id) != str(user.id)]
        self._set_device_cookie(response, remaining)
        return response
