import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from stellage.apps.auth.depends import get_current_user, get_optional_current_user
from stellage.apps.auth.schemas import UserVerifySchema
from stellage.apps.profile.schemas import PublicUser
from stellage.apps.social.comment_services import CommentService
from stellage.apps.social.like_services import LikeService
from stellage.apps.social.schemas import (
    CommentCreate,
    CommentReturn,
    FollowActionResult,
    FollowCounts,
    LikeActionResult,
    LikeState,
)
from stellage.apps.social.services import SocialService
from stellage.core.rate_limit import rate_limit

social_router = APIRouter(
    prefix="/social",
    tags=["social"],
)


@social_router.post(
    path="/follow/{username}",
    status_code=status.HTTP_200_OK,
    response_model=FollowActionResult,
    dependencies=[Depends(rate_limit(max_calls=30, window_seconds=60))],
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


# ── Лайки коробок и шаблонов ──

@social_router.get(
    path="/box-likes/{instance_id}",
    status_code=status.HTTP_200_OK,
    response_model=LikeState,
)
async def get_box_likes(
    instance_id: uuid.UUID,
    service: Annotated[LikeService, Depends(LikeService)],
    viewer: Annotated[UserVerifySchema | None, Depends(get_optional_current_user)],
) -> LikeState:
    return await service.get_state(instance_id=instance_id, viewer=viewer)


@social_router.post(
    path="/box-likes/{instance_id}",
    status_code=status.HTTP_200_OK,
    response_model=LikeActionResult,
    dependencies=[Depends(rate_limit(max_calls=60, window_seconds=60))],
)
async def like_box(
    instance_id: uuid.UUID,
    service: Annotated[LikeService, Depends(LikeService)],
    user: Annotated[UserVerifySchema, Depends(get_current_user)],
) -> LikeActionResult:
    return await service.like(user=user, instance_id=instance_id)


@social_router.delete(
    path="/box-likes/{instance_id}",
    status_code=status.HTTP_200_OK,
    response_model=LikeActionResult,
)
async def unlike_box(
    instance_id: uuid.UUID,
    service: Annotated[LikeService, Depends(LikeService)],
    user: Annotated[UserVerifySchema, Depends(get_current_user)],
) -> LikeActionResult:
    return await service.unlike(user=user, instance_id=instance_id)


@social_router.get(
    path="/template-likes/{template_id}",
    status_code=status.HTTP_200_OK,
    response_model=LikeState,
)
async def get_template_likes(
    template_id: uuid.UUID,
    service: Annotated[LikeService, Depends(LikeService)],
    viewer: Annotated[UserVerifySchema | None, Depends(get_optional_current_user)],
) -> LikeState:
    return await service.get_template_state(template_id=template_id, viewer=viewer)


@social_router.post(
    path="/template-likes/{template_id}",
    status_code=status.HTTP_200_OK,
    response_model=LikeActionResult,
    dependencies=[Depends(rate_limit(max_calls=60, window_seconds=60))],
)
async def like_template(
    template_id: uuid.UUID,
    service: Annotated[LikeService, Depends(LikeService)],
    user: Annotated[UserVerifySchema, Depends(get_current_user)],
) -> LikeActionResult:
    return await service.like_template(user=user, template_id=template_id)


@social_router.delete(
    path="/template-likes/{template_id}",
    status_code=status.HTTP_200_OK,
    response_model=LikeActionResult,
)
async def unlike_template(
    template_id: uuid.UUID,
    service: Annotated[LikeService, Depends(LikeService)],
    user: Annotated[UserVerifySchema, Depends(get_current_user)],
) -> LikeActionResult:
    return await service.unlike_template(user=user, template_id=template_id)


# ── Комментарии ──

@social_router.get(
    path="/comments",
    status_code=status.HTTP_200_OK,
    response_model=list[CommentReturn],
)
async def list_comments(
    service: Annotated[CommentService, Depends(CommentService)],
    template_id: uuid.UUID | None = Query(None),
    instance_id: uuid.UUID | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> list[CommentReturn]:
    return await service.list_comments(
        template_id=template_id,
        instance_id=instance_id,
        limit=limit,
        offset=offset,
    )


@social_router.post(
    path="/comments",
    status_code=status.HTTP_201_CREATED,
    response_model=CommentReturn,
    dependencies=[Depends(rate_limit(max_calls=30, window_seconds=60))],
)
async def create_comment(
    data: CommentCreate,
    service: Annotated[CommentService, Depends(CommentService)],
    user: Annotated[UserVerifySchema, Depends(get_current_user)],
) -> CommentReturn:
    return await service.create_comment(user=user, data=data)


@social_router.delete(
    path="/comments/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_comment(
    comment_id: uuid.UUID,
    service: Annotated[CommentService, Depends(CommentService)],
    user: Annotated[UserVerifySchema, Depends(get_current_user)],
) -> None:
    await service.delete_comment(user=user, comment_id=comment_id)
