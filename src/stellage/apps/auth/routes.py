from typing import Annotated

from fastapi import APIRouter, status, Depends

from stellage.apps.auth.schemas import UserReturnData, RegisterUser
from stellage.apps.auth.services import UserService

auth_router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

@auth_router.post(
    "/register",
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
