from typing import Annotated

from fastapi import Depends, HTTPException, status
from starlette.responses import JSONResponse

from stellage.apps.auth.handlers import AuthHandler
from stellage.apps.auth.schemas import UserVerifySchema
from stellage.apps.messaging.services import MessageService
from stellage.apps.notifications.services import NotificationService
from stellage.apps.profile.avatar import AvatarManager
from stellage.apps.profile.managers import ProfileManager
from stellage.apps.profile.schemas import (
    AvatarCompleteRequest,
    AvatarInitiateRequest,
    AvatarUploadTarget,
    ChangeEmailRequest,
    ChangePasswordRequest,
    GiftItemReturn,
    GiftSenderView,
    PublicProfile,
    PublicUser,
    UpdateProfileRequest,
)
from stellage.apps.profile.tasks import send_confirmation_code
from stellage.apps.shelves.managers import ShelfManager
from stellage.core.settings import settings
from stellage.database.enums.notification_type import NotificationTypeEnum


class ProfileService:
    def __init__(
        self,
        manager: Annotated[
            ProfileManager,
            Depends(ProfileManager),
        ],
        handler: Annotated[
            AuthHandler,
            Depends(AuthHandler),
        ],
        shelf_manager: Annotated[
            ShelfManager,
            Depends(ShelfManager),
        ],
        avatar_manager: Annotated[
            AvatarManager,
            Depends(AvatarManager),
        ],
        notifications: Annotated[
            NotificationService,
            Depends(NotificationService),
        ],
        messages: Annotated[
            MessageService,
            Depends(MessageService),
        ],
    ) -> None:
        self.manager = manager
        self.handler = handler
        self.shelf_manager = shelf_manager
        self.avatar_manager = avatar_manager
        self.notifications = notifications
        self.messages = messages


    async def _to_public_users(self, users: list) -> list[PublicUser]:
        """Собирает PublicUser со свежими presigned-ссылками на аватары.
        Presigned-подпись локальна (не сетевой вызов), поэтому дёшева даже для
        списка."""
        result: list[PublicUser] = []
        for user in users:
            pub = PublicUser.model_validate(user)
            if user.avatar_key:
                pub.avatar_url = await self.avatar_manager.get_avatar_url(
                    avatar_key=user.avatar_key,
                )
            result.append(pub)
        return result

    async def search_users(
        self,
        query: str,
    ) -> list[PublicUser]:
        cleaned = query.strip()
        if not cleaned:
            return []

        users = await self.manager.search_users(query=cleaned)
        return await self._to_public_users(users)


    async def get_public_profile(
        self,
        username: str,
    ) -> PublicProfile:
        user = await self.manager.get_user_by_username(username=username)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        # Показываем главный стеллаж только если он публичный.
        shelf = await self.shelf_manager.get_main_shelf_with_boxes(
            user_id=user.id,
        )
        if shelf is not None and not shelf.is_public:
            shelf = None

        profile = PublicProfile.model_validate(user)
        profile.shelf = shelf
        profile.stats = await self.manager.get_user_stats(user_id=user.id)
        if user.avatar_key:
            profile.avatar_url = await self.avatar_manager.get_avatar_url(
                avatar_key=user.avatar_key,
            )
        if user.banner_key:
            profile.banner_url = await self.avatar_manager.get_banner_url(
                banner_key=user.banner_key,
            )
        return profile


    async def get_my_profile(
        self,
        user: UserVerifySchema,
    ) -> PublicProfile:
        """Свой профиль для витрины: карточка + статистика + presigned-аватар.
        Главный стеллаж показываем всегда (свой вижу независимо от публичности)."""
        full_user = await self.manager.get_user_by_id(user_id=user.id)
        if not full_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        shelf = await self.shelf_manager.get_main_shelf_with_boxes(
            user_id=user.id,
        )

        profile = PublicProfile.model_validate(full_user)
        profile.shelf = shelf
        profile.stats = await self.manager.get_user_stats(user_id=user.id)
        if full_user.avatar_key:
            profile.avatar_url = await self.avatar_manager.get_avatar_url(
                avatar_key=full_user.avatar_key,
            )
        if full_user.banner_key:
            profile.banner_url = await self.avatar_manager.get_banner_url(
                banner_key=full_user.banner_key,
            )
        return profile


    async def initiate_avatar_upload(
        self,
        user: UserVerifySchema,
        data: AvatarInitiateRequest,
    ) -> AvatarUploadTarget:
        return await self.avatar_manager.initiate_upload(
            user_id=user.id,
            mime=data.mime,
            size_bytes=data.size_bytes,
        )


    async def complete_avatar_upload(
        self,
        user: UserVerifySchema,
        data: AvatarCompleteRequest,
    ) -> JSONResponse:
        await self.avatar_manager.complete_upload(
            user_id=user.id,
            key=data.key,
            mime=data.mime,
            size_bytes=data.size_bytes,
        )
        return JSONResponse(content={"message": "Avatar updated successfully"})


    async def initiate_banner_upload(
        self,
        user: UserVerifySchema,
        data: AvatarInitiateRequest,
    ) -> AvatarUploadTarget:
        return await self.avatar_manager.initiate_banner_upload(
            user_id=user.id,
            mime=data.mime,
            size_bytes=data.size_bytes,
        )


    async def complete_banner_upload(
        self,
        user: UserVerifySchema,
        data: AvatarCompleteRequest,
    ) -> JSONResponse:
        await self.avatar_manager.complete_banner_upload(
            user_id=user.id,
            key=data.key,
            mime=data.mime,
            size_bytes=data.size_bytes,
            banner_pos_y=data.banner_pos_y,
        )
        return JSONResponse(content={"message": "Banner uploaded successfully"})


    async def change_email_request(
        self,
        data: ChangeEmailRequest,
        user: UserVerifySchema,
    ) -> JSONResponse:
        # Нельзя запросить смену на уже занятый другим аккаунтом e-mail —
        # иначе подтверждение упало бы на unique-constraint (500) в самом конце.
        if await self.manager.is_email_taken(
            email=str(data.new_email),
            exclude_user_id=user.id,
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already in use",
            )

        confirmation_code = await self.handler.generate_confirmation_code(
            length=settings.confirmation_code_length,
        )

        # Код привязан к пользователю (ключ email_change:{user_id}): подтвердить
        # смену можно только для СВОЕГО аккаунта, чужим кодом чужой e-mail не занять.
        await self.manager.store_email_change(
            user_id=user.id,
            new_email=str(data.new_email),
            confirmation_code=confirmation_code,
        )

        try:
            send_confirmation_code.delay(
                to_email=str(data.new_email),
                confirmation_code=confirmation_code
            )
        except Exception as err:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Confirmation code could not be sent. Please try again later.",
            ) from err

        response = JSONResponse(
            content={
                "message": f"A confirmation code has been sent to {data.new_email}"
            }
        )

        return response


    async def confirm_new_email(
        self,
        confirmation_code: str,
        user: UserVerifySchema,
    ) -> JSONResponse:
        pending = await self.manager.get_email_change(user_id=user.id)
        # Код сверяется с сохранённым ИМЕННО для этого пользователя. Нет
        # незавершённой смены или код не совпал — 400, без утечки чужих кодов.
        if pending is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid confirmation code",
            )
        stored_code, new_email = pending
        if confirmation_code != stored_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid confirmation code",
            )

        # Гонка: e-mail мог быть занят между request и confirm — отдаём 409, а не 500.
        if await self.manager.is_email_taken(
            email=new_email,
            exclude_user_id=user.id,
        ):
            await self.manager.remove_email_change(user_id=user.id)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already in use",
            )

        await self.manager.update_user_fields(
            user_id=user.id,
            email=new_email,
        )

        await self.manager.remove_email_change(user_id=user.id)

        response = JSONResponse(
            content={"message": "Email changing was successful"}
        )

        return response


    async def change_password(
        self,
        data: ChangePasswordRequest,
        user: UserVerifySchema,
    ) -> JSONResponse:
        current_hashed_password = await self.manager.get_user_hashed_password(
            user_id=user.id
        )

        is_invalid_password: bool = not (
            await self.handler.verify_password(
                raw_password=data.old_password,
                hashed_password=current_hashed_password,
            )
        )

        if is_invalid_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid password"
            )

        new_hashed_password = await self.handler.get_hashed_password(
            password=data.new_password,
        )

        await self.manager.update_user_fields(
            user_id=user.id,
            hashed_password=new_hashed_password,
        )

        # Смена пароля выкидывает все ОСТАЛЬНЫЕ сессии (кроме текущей): если
        # аккаунт был скомпрометирован, чужая сессия перестаёт работать сразу.
        await self.manager.revoke_all_sessions(
            user_id=user.id,
            keep_session_id=str(user.session_id) if user.session_id else None,
        )

        response = JSONResponse(content={"message": "Changing password was successful"})

        return response


    async def update_profile(
        self,
        data: UpdateProfileRequest,
        user: UserVerifySchema,
    ) -> JSONResponse:
        if data.username is not None and await self.manager.is_username_taken(
            username=data.username,
            exclude_user_id=user.id,
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already taken",
            )

        fields = data.model_dump(exclude_none=True)

        if fields:
            await self.manager.update_user_fields(
                user_id=user.id,
                **fields,
            )

        response = JSONResponse(content={"message": "Profile updated successfully"})

        return response


    async def add_coins(self, amount: int, user: UserVerifySchema) -> JSONResponse:
        if not user.username or user.username.lower() != "sandrix":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Sandrix can mint coins.",
            )

        full_user = await self.manager.get_user_by_id(user_id=user.id)
        if not full_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        add_amount = amount if amount > 0 else 1
        new_balance = full_user.stella_coins + add_amount
        await self.manager.update_user_fields(
            user_id=user.id,
            stella_coins=new_balance,
        )
        return JSONResponse(content={
            "message": f"Added {add_amount} Stellacoin successfully.",
            "stella_coins": new_balance,
        })


    async def gift_coins(
        self,
        target_username: str,
        amount: int,
        sender: UserVerifySchema,
    ) -> JSONResponse:
        if amount <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Amount must be positive.")

        if sender.username == target_username:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot gift coins to yourself.")

        target_user = await self.manager.get_user_by_username(username=target_username)
        if not target_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target user not found")

        sender_user = await self.manager.get_user_by_id(user_id=sender.id)

        if sender_user.stella_coins < amount:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Недостаточно Stellacoin.")

        # Ideal implementation uses a single transaction.
        await self.manager.update_user_fields(
            user_id=sender.id,
            stella_coins=sender_user.stella_coins - amount,
        )
        await self.manager.update_user_fields(
            user_id=target_user.id,
            stella_coins=target_user.stella_coins + amount,
        )

        # Сохранение записи подарка Stellacoin
        await self.manager.create_coin_gift(
            sender_id=sender.id,
            recipient_id=target_user.id,
            amount=amount,
        )

        # Отправка уведомления получателю
        await self.notifications.notify(
            recipient_id=target_user.id,
            actor_id=sender.id,
            type_=NotificationTypeEnum.GIFT,
        )

        # Системное карточка-сообщение подарка Stellacoin в чат с WebSocket broadcast
        await self.messages.create_coin_gift_message(
            giver_id=sender.id,
            recipient_id=target_user.id,
            amount=amount,
        )

        return JSONResponse(content={"message": f"Successfully gifted {amount} Stellacoin to {target_username}."})

    async def get_public_gifts(
        self,
        target_username: str,
        viewer: UserVerifySchema | None = None,
    ) -> list[GiftItemReturn]:
        target_user = await self.manager.get_user_by_username(username=target_username)
        if not target_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        is_owner = viewer is not None and str(viewer.id) == str(target_user.id)
        instances = await self.manager.get_user_gifts(
            user_id=target_user.id,
            include_private=is_owner,
        )
        coin_gifts = await self.manager.get_user_coin_gifts(
            user_id=target_user.id,
            include_private=is_owner,
        )

        gifts: list[GiftItemReturn] = []
        for inst in instances:
            sender_view = None
            if inst.gifted_by:
                avatar_url = None
                if inst.gifted_by.avatar_key:
                    avatar_url = await self.avatar_manager.get_avatar_url(
                        avatar_key=inst.gifted_by.avatar_key
                    )
                sender_view = GiftSenderView(
                    id=inst.gifted_by.id,
                    username=inst.gifted_by.username,
                    nickname=inst.gifted_by.nickname,
                    avatar_url=avatar_url,
                )

            gifts.append(
                GiftItemReturn(
                    id=inst.id,
                    serial_number=inst.serial_number,
                    is_sealed=inst.is_sealed.value if hasattr(inst.is_sealed, 'value') else str(inst.is_sealed),
                    is_public=inst.is_public.value if hasattr(inst.is_public, 'value') else str(inst.is_public),
                    is_gift_public=inst.is_gift_public,
                    created_at=inst.created_at,
                    template_id=inst.template_id,
                    template_title=inst.template.title,
                    template_rarity=inst.template.rarity.value if hasattr(inst.template.rarity, 'value') else str(inst.template.rarity),
                    gift_type="box",
                    sender=sender_view,
                )
            )

        for cg in coin_gifts:
            sender_view = None
            if cg.sender:
                avatar_url = None
                if cg.sender.avatar_key:
                    avatar_url = await self.avatar_manager.get_avatar_url(
                        avatar_key=cg.sender.avatar_key
                    )
                sender_view = GiftSenderView(
                    id=cg.sender.id,
                    username=cg.sender.username,
                    nickname=cg.sender.nickname,
                    avatar_url=avatar_url,
                )

            gifts.append(
                GiftItemReturn(
                    id=cg.id,
                    is_gift_public=cg.is_gift_public,
                    created_at=cg.created_at,
                    gift_type="coins",
                    coins_amount=cg.amount,
                    template_title=f"+{cg.amount} Stellacoin",
                    sender=sender_view,
                )
            )

        gifts.sort(key=lambda g: g.created_at, reverse=True)
        return gifts

    async def toggle_gift_visibility(
        self,
        instance_id: str,
        is_gift_public: bool,
        user: UserVerifySchema,
    ) -> JSONResponse:
        await self.manager.toggle_gift_visibility(
            instance_id=instance_id,
            user_id=user.id,
            is_gift_public=is_gift_public,
        )
        return JSONResponse(content={"message": "Gift visibility updated"})