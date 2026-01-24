from typing import Annotated

from fastapi import APIRouter, status
from fastapi.params import Depends
from starlette.responses import JSONResponse

from stellage.apps.auth.depends import get_current_user
from stellage.apps.auth.schemas import UserVerifySchema
from stellage.apps.profile.schemas import ChangeEmailRequest, ChangePasswordRequest
from stellage.apps.profile.services import ProfileService

profile_router = APIRouter(
    prefix="/profile",
    tags=["profile"]
)

@profile_router.post(
    path="/change-email-request",
    status_code=status.HTTP_200_OK,
)
async def change_email_request(
    data: ChangeEmailRequest,
    service: Annotated[
        ProfileService,
        Depends(ProfileService)
    ]
) -> JSONResponse:
    return await service.change_email_request(data=data)


@profile_router.post(
    path="/confirm-new-email",
    status_code=status.HTTP_200_OK,
)
async def change_email_request(
    confirmation_code: str,
    service: Annotated[
        ProfileService,
        Depends(ProfileService)
    ],
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user)
    ]
) -> JSONResponse:
    return await service.confirm_new_email(
        confirmation_code=confirmation_code,
        user=user
    )


@profile_router.post(
    path="/change-password",
    status_code=status.HTTP_200_OK,
)
async def change_password(
    data: ChangePasswordRequest,
    service: Annotated[
        ProfileService,
        Depends(ProfileService)
    ],
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user)
    ]
) -> JSONResponse:
    return await service.change_password(
        data=data,
        user=user,
    )