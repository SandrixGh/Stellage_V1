from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from starlette.responses import JSONResponse

from stellage.apps.auth.depends import get_current_user
from stellage.apps.auth.schemas import (
    AuthUser,
    ChangePasswordSchema,
    DeviceAccountView,
    LoginUserSchema,
    UserReturnData,
    UserVerifySchema,
)
from stellage.apps.auth.services import UserService
from stellage.core.rate_limit import rate_limit

auth_router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

DEVICE_COOKIE = "DeviceAccounts"

@auth_router.post(
    path="/register",
    response_model=UserReturnData,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit(max_calls=3, window_seconds=60))],
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
    dependencies=[Depends(rate_limit(max_calls=10, window_seconds=60))],
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
    dependencies=[Depends(rate_limit(max_calls=5, window_seconds=60))],
)
async def login_user(
    user: LoginUserSchema,
    request: Request,
    service: Annotated[
        UserService,
        Depends(UserService)
    ],
) -> JSONResponse:
    return await service.login_user(
        user=user,
        device_cookie=request.cookies.get(DEVICE_COOKIE),
    )


@auth_router.post(
    path="/refresh",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit(max_calls=30, window_seconds=60))],
)
async def refresh_session(
    request: Request,
    service: Annotated[
        UserService,
        Depends(UserService)
    ],
) -> JSONResponse:
    refresh_token = request.cookies.get("RefreshToken")
    return await service.refresh_session(
        refresh_token=refresh_token,
        device_cookie=request.cookies.get(DEVICE_COOKIE),
    )


@auth_router.get(
    path="/sessions",
    status_code=status.HTTP_200_OK,
    response_model=list[DeviceAccountView],
)
async def list_sessions(
    request: Request,
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user)
    ],
    service: Annotated[
        UserService,
        Depends(UserService)
    ],
) -> list[DeviceAccountView]:
    """Аккаунты этого устройства для меню быстрого переключения."""
    return await service.list_device_accounts(
        current_user_id=user.id,
        device_cookie=request.cookies.get(DEVICE_COOKIE),
    )


@auth_router.post(
    path="/switch/{target_user_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit(max_calls=20, window_seconds=60))],
)
async def switch_account(
    target_user_id: str,
    request: Request,
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user)
    ],
    service: Annotated[
        UserService,
        Depends(UserService)
    ],
) -> JSONResponse:
    """Мгновенно переключиться на другой аккаунт устройства без пароля."""
    return await service.switch_account(
        target_user_id=target_user_id,
        device_cookie=request.cookies.get(DEVICE_COOKIE),
    )


@auth_router.delete(
    path="/sessions/{target_user_id}",
    status_code=status.HTTP_200_OK,
)
async def unlink_session(
    target_user_id: str,
    request: Request,
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user)
    ],
    service: Annotated[
        UserService,
        Depends(UserService)
    ],
) -> JSONResponse:
    """Убрать чужой аккаунт из устройства (revoke + удаление из cookie)."""
    return await service.unlink_device_account(
        target_user_id=target_user_id,
        current_user_id=user.id,
        device_cookie=request.cookies.get(DEVICE_COOKIE),
    )


@auth_router.post(
    path="/logout",
    status_code=status.HTTP_200_OK,
)
async def logout(
    request: Request,
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user)
    ],
    service: Annotated[
        UserService,
        Depends(UserService)
    ],
) -> JSONResponse:
    return await service.logout_user(
        user=user,
        device_cookie=request.cookies.get(DEVICE_COOKIE),
    )


@auth_router.post(
    path="/change-password",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit(max_calls=5, window_seconds=60))],
)
async def change_password(
    data: ChangePasswordSchema,
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user)
    ],
    service: Annotated[
        UserService,
        Depends(UserService)
    ],
) -> dict[str, str]:
    await service.change_password(user_id=str(user.id), payload=data)
    return {"message": "Пароль успешно изменён"}


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


@auth_router.delete(
    path="/delete-account",
    status_code=status.HTTP_200_OK
)
async def delete_account(
    request: Request,
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user)
    ],
    service: Annotated[
        UserService,
        Depends(UserService)
    ],
) -> JSONResponse:
    return await service.delete_account(
        user=user,
        device_cookie=request.cookies.get(DEVICE_COOKIE),
    )