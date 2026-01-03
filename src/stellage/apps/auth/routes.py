from typing import Annotated

from fastapi import APIRouter, status, Depends

from stellage.apps.auth.schemas import UserReturnData, RegisterUser
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
    user: RegisterUser,
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