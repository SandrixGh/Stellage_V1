from typing import Annotated

from fastapi import APIRouter, status
from fastapi.params import Depends
from starlette.responses import JSONResponse

from stellage.apps.auth.depends import get_current_user
from stellage.apps.auth.schemas import UserVerifySchema
from stellage.apps.profile.schemas import (
    AvatarCompleteRequest,
    AvatarInitiateRequest,
    AvatarUploadTarget,
    ChangeEmailRequest,
    ChangePasswordRequest,
    PublicProfile,
    PublicUser,
    UpdateProfileRequest,
    AddCoinsRequest,
    GiftCoinsRequest,
)
from stellage.apps.profile.services import ProfileService
from stellage.core.rate_limit import rate_limit

profile_router = APIRouter(
    prefix="/profile",
    tags=["profile"]
)


@profile_router.get(
    path="/search",
    status_code=status.HTTP_200_OK,
    response_model=list[PublicUser],
    dependencies=[Depends(rate_limit(max_calls=30, window_seconds=60))],
)
async def search_users(
    q: str,
    service: Annotated[
        ProfileService,
        Depends(ProfileService)
    ],
) -> list[PublicUser]:
    return await service.search_users(query=q)


@profile_router.get(
    path="/me",
    status_code=status.HTTP_200_OK,
    response_model=PublicProfile,
)
async def get_my_profile(
    service: Annotated[
        ProfileService,
        Depends(ProfileService)
    ],
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user)
    ],
) -> PublicProfile:
    return await service.get_my_profile(user=user)


@profile_router.get(
    path="/public/{username}",
    status_code=status.HTTP_200_OK,
    response_model=PublicProfile,
)
async def get_public_profile(
    username: str,
    service: Annotated[
        ProfileService,
        Depends(ProfileService)
    ],
) -> PublicProfile:
    return await service.get_public_profile(username=username)

@profile_router.post(
    path="/change-email-request",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit(max_calls=5, window_seconds=300))],
)
async def change_email_request(
    data: ChangeEmailRequest,
    service: Annotated[
        ProfileService,
        Depends(ProfileService)
    ],
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user)
    ],
) -> JSONResponse:
    # Только для себя: код смены привязывается к текущему пользователю, чужой
    # e-mail так не «занять» и письмами не завалить (плюс rate limit).
    return await service.change_email_request(data=data, user=user)


@profile_router.post(
    path="/confirm-new-email",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit(max_calls=10, window_seconds=300))],
)
async def confirm_new_email(
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
    dependencies=[Depends(rate_limit(max_calls=5, window_seconds=300))],
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


@profile_router.patch(
    path="/update",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit(max_calls=20, window_seconds=60))],
)
async def update_profile(
    data: UpdateProfileRequest,
    service: Annotated[
        ProfileService,
        Depends(ProfileService)
    ],
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user)
    ]
) -> JSONResponse:
    return await service.update_profile(
        data=data,
        user=user,
    )


@profile_router.post(
    path="/avatar/initiate",
    status_code=status.HTTP_200_OK,
    response_model=AvatarUploadTarget,
)
async def initiate_avatar_upload(
    data: AvatarInitiateRequest,
    service: Annotated[
        ProfileService,
        Depends(ProfileService)
    ],
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user)
    ]
) -> AvatarUploadTarget:
    return await service.initiate_avatar_upload(user=user, data=data)


@profile_router.post(
    path="/avatar/complete",
    status_code=status.HTTP_200_OK,
)
async def complete_avatar_upload(
    data: AvatarCompleteRequest,
    service: Annotated[
        ProfileService,
        Depends(ProfileService)
    ],
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user)
    ]
) -> JSONResponse:
    return await service.complete_avatar_upload(user=user, data=data)


@profile_router.post(
    path="/coins/add",
    status_code=status.HTTP_200_OK,
)
async def add_coins(
    data: AddCoinsRequest,
    service: Annotated[
        ProfileService,
        Depends(ProfileService)
    ],
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user)
    ]
) -> JSONResponse:
    return await service.add_coins(amount=data.amount, user=user)


@profile_router.post(
    path="/public/{username}/coins/gift",
    status_code=status.HTTP_200_OK,
)
async def gift_coins(
    username: str,
    data: GiftCoinsRequest,
    service: Annotated[
        ProfileService,
        Depends(ProfileService)
    ],
    user: Annotated[
        UserVerifySchema,
        Depends(get_current_user)
    ]
) -> JSONResponse:
    return await service.gift_coins(target_username=username, amount=data.amount, sender=user)