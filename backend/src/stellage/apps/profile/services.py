from typing import Annotated
from fastapi import Depends, HTTPException, status
from starlette.responses import JSONResponse

from stellage.apps.auth.handlers import AuthHandler
from stellage.apps.auth.schemas import UserVerifySchema
from stellage.apps.profile.managers import ProfileManager
from stellage.apps.profile.schemas import ChangeEmailRequest, ConfirmationCodeRequest, ChangePasswordRequest
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
    ) -> None:
        self.manager = manager
        self.handler = handler


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
            content="Email changing was successful"
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

        response = JSONResponse(content="Changing password was successful")

        return response