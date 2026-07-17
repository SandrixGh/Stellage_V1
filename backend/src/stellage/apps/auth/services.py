import logging

from fastapi import Depends, HTTPException, status
from itsdangerous import URLSafeTimedSerializer, BadSignature
from starlette.responses import JSONResponse

from stellage.apps.auth.handlers import AuthHandler
from stellage.apps.auth.managers import UserManager
from stellage.apps.auth.schemas import AuthUser, CreateUser, UserReturnData, UserVerifySchema
from stellage.core.settings import settings

from .tasks import send_confirmation_email

logger = logging.getLogger(__name__)

class UserService:
    def __init__(
        self,
        manager: UserManager = Depends(UserManager),
        handler: AuthHandler = Depends(AuthHandler),
    ):
        self.manager = manager
        self.handler = handler
        self.serializer = URLSafeTimedSerializer(secret_key=settings.secret_key.get_secret_value())

    async def register_user(self, user: AuthUser) -> UserReturnData:
        hashed_password = await self.handler.get_hashed_password(user.password)

        new_user = CreateUser(
            email=user.email,
            hashed_password=hashed_password,
            username=user.username,
        )

        user_data = await self.manager.create_user(new_user)
        logger.info("User registered: %s", user_data.email)

        confirmation_token = self.serializer.dumps(user_data.email)
        try:
            send_confirmation_email.delay(user_data.email, confirmation_token)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Registration succeeded but confirmation email could not be sent. Please try again later.",
            )

        return user_data


    async def confirm_user(self, token: str) -> None:
        try:
            email = self.serializer.loads(token, max_age=3600)

        except BadSignature:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired token"
            )

        await self.manager.confirm_user(email)


    # Refresh-cookie ограничена путём /api.v1/auth, чтобы длинный токен не
    # гонялся в каждом запросе — только на /auth/refresh и /auth/logout.
    REFRESH_COOKIE_PATH = "/api.v1/auth"

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

    async def login_user(self, user: AuthUser) -> JSONResponse:
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

        access, refresh, _ = await self._issue_session(user_id=exist_user.id)

        logger.info("User logged in: %s", exist_user.email)
        response = JSONResponse(content={"message": "Login is successful"})
        self._set_access_cookie(response, access)
        self._set_refresh_cookie(response, refresh)

        return response


    async def refresh_session(self, refresh_token: str | None) -> JSONResponse:
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
        return response


    async def logout_user(
        self,
        user: UserVerifySchema,
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

        return response


    async def delete_account(
        self,
        user: UserVerifySchema,
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
        return response
