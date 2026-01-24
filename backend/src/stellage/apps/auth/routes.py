from typing import Annotated

from fastapi import APIRouter, status, Depends
from starlette.responses import JSONResponse

from stellage.apps.auth.depends import get_current_user
from stellage.apps.auth.schemas import UserReturnData, AuthUser, UserVerifySchema
from stellage.apps.auth.services import UserService

auth_router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

@auth_router.post(
    path="/register",
    response_model=UserReturnData,
    status_code=status.HTTP_201_CREATED,
)
async def registration(
    user: AuthUser,
    service: Annotated[
        UserService,
        Depends(UserService)
    ]
) -> UserReturnData:
    return await service.register_user(user)


@auth_router.get(
    path="/register_confirm/",
    response_model=dict[str, str],
    status_code=status.HTTP_200_OK,
)
async def confirm_registration(
    token: str,
    service: Annotated[
        UserService,
        Depends(UserService)
    ]
) -> dict[str, str]:
    await service.confirm_user(token=token)
    return {"message": "User confirmed successfully"}


@auth_router.post(
    path="/login",
    status_code=status.HTTP_200_OK,
)
async def login_user(
    user: AuthUser,
    service: Annotated[
        UserService,
        Depends(UserService)
    ],
) -> JSONResponse:
    return await service.login_user(user=user)


@auth_router.get(
    path="/logout",
    status_code=status.HTTP_200_OK,
)
async def logout(
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user)
    ],
    service: Annotated[
        UserService,
        Depends(UserService)
    ],
) -> JSONResponse:
    return await service.logout_user(user=user)


@auth_router.get(
    path="/get-user",
    status_code=status.HTTP_200_OK,
    response_model=UserVerifySchema,
)
async def get_auth_user(
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user)
    ],
) -> UserVerifySchema:
    return user