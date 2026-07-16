from typing import Annotated
from fastapi import Depends, HTTPException, status
from starlette.responses import JSONResponse

from stellage.apps.auth.handlers import AuthHandler
from stellage.apps.auth.schemas import UserVerifySchema
from stellage.apps.profile.avatar import AvatarManager
from stellage.apps.profile.managers import ProfileManager
from stellage.apps.profile.schemas import (
    AvatarCompleteRequest,
    AvatarInitiateRequest,
    AvatarUploadTarget,
    ChangeEmailRequest,
    ConfirmationCodeRequest,
    ChangePasswordRequest,
    PublicProfile,
    PublicUser,
    UpdateProfileRequest,
)
from stellage.apps.profile.tasks import send_confirmation_code
from stellage.apps.shelves.managers import ShelfManager
from stellage.core.settings import settings


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
    ) -> None:
        self.manager = manager
        self.handler = handler
        self.shelf_manager = shelf_manager
        self.avatar_manager = avatar_manager


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


    async def change_email_request(
        self,
        data: ChangeEmailRequest,
    ) -> JSONResponse:
        confirmation_code = await self.handler.generate_confirmation_code(
            length=settings.confirmation_code_length,
        )

        confirmation_code_request = ConfirmationCodeRequest(
            email=data.new_email,
            confirmation_code=confirmation_code,
        )

        await self.manager.store_confirmation_code(
            confirmation_code_request=confirmation_code_request
        )

        try:
            send_confirmation_code.delay(
                to_email=str(data.new_email),
                confirmation_code=confirmation_code
            )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Confirmation code could not be sent. Please try again later.",
            )

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
        email = await self.manager.get_new_email_by_confirmation_code(
            confirmation_code=confirmation_code,
        )
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid confirmation code"
            )

        await self.manager.update_user_fields(
            user_id=user.id,
            email=email,
        )

        await self.manager.remove_confirmation_code(
            confirmation_code=confirmation_code
        )

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