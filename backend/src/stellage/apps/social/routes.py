from typing import Annotated

from fastapi import APIRouter, Depends, status

from stellage.apps.auth.depends import get_current_user, get_optional_current_user
from stellage.apps.auth.schemas import UserVerifySchema
from stellage.apps.profile.schemas import PublicUser
from stellage.apps.social.schemas import FollowActionResult, FollowCounts
from stellage.apps.social.services import SocialService

social_router = APIRouter(
    prefix="/social",
    tags=["social"],
)


@social_router.post(
    path="/follow/{username}",
    status_code=status.HTTP_200_OK,
    response_model=FollowActionResult,
)
async def follow_user(
    username: str,
    service: Annotated[SocialService, Depends(SocialService)],
    user: Annotated[UserVerifySchema, Depends(get_current_user)],
) -> FollowActionResult:
    return await service.follow(follower=user, username=username)


@social_router.delete(
    path="/follow/{username}",
    status_code=status.HTTP_200_OK,
    response_model=FollowActionResult,
)
async def unfollow_user(
    username: str,
    service: Annotated[SocialService, Depends(SocialService)],
    user: Annotated[UserVerifySchema, Depends(get_current_user)],
) -> FollowActionResult:
    return await service.unfollow(follower=user, username=username)


@social_router.get(
    path="/follow-counts/{username}",
    status_code=status.HTTP_200_OK,
    response_model=FollowCounts,
)
async def get_follow_counts(
    username: str,
    service: Annotated[SocialService, Depends(SocialService)],
    viewer: Annotated[UserVerifySchema | None, Depends(get_optional_current_user)],
) -> FollowCounts:
    return await service.get_counts(username=username, viewer=viewer)


@social_router.get(
    path="/followers/{username}",
    status_code=status.HTTP_200_OK,
    response_model=list[PublicUser],
)
async def get_followers(
    username: str,
    service: Annotated[SocialService, Depends(SocialService)],
) -> list[PublicUser]:
    return await service.list_followers(username=username)


@social_router.get(
    path="/following/{username}",
    status_code=status.HTTP_200_OK,
    response_model=list[PublicUser],
)
async def get_following(
    username: str,
    service: Annotated[SocialService, Depends(SocialService)],
) -> list[PublicUser]:
    return await service.list_following(username=username)
