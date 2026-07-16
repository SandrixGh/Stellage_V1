import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status

from stellage.apps.auth.schemas import UserVerifySchema
from stellage.apps.notifications.services import NotificationService
from stellage.apps.profile.avatar import AvatarManager
from stellage.apps.profile.managers import ProfileManager
from stellage.apps.profile.schemas import PublicUser
from stellage.apps.social.repositories import FollowRepository
from stellage.apps.social.schemas import FollowActionResult, FollowCounts
from stellage.database.enums.notification_type import NotificationTypeEnum


class SocialService:
    def __init__(
        self,
        repository: Annotated[FollowRepository, Depends(FollowRepository)],
        profile_manager: Annotated[ProfileManager, Depends(ProfileManager)],
        avatar_manager: Annotated[AvatarManager, Depends(AvatarManager)],
        notifications: Annotated[NotificationService, Depends(NotificationService)],
    ) -> None:
        self.repository = repository
        self.profile_manager = profile_manager
        self.avatar_manager = avatar_manager
        self.notifications = notifications

    async def _to_public_users(self, users: list) -> list[PublicUser]:
        result: list[PublicUser] = []
        for user in users:
            pub = PublicUser.model_validate(user)
            if user.avatar_key:
                pub.avatar_url = await self.avatar_manager.get_avatar_url(
                    avatar_key=user.avatar_key,
                )
            result.append(pub)
        return result

    async def _resolve_user_id(self, username: str) -> uuid.UUID:
        user = await self.profile_manager.get_user_by_username(username=username)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        return user.id

    async def follow(
        self,
        follower: UserVerifySchema,
        username: str,
    ) -> FollowActionResult:
        target_id = await self._resolve_user_id(username)
        if target_id == follower.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot follow yourself",
            )
        # Уведомляем только о НОВОЙ подписке — повторный follow не шлёт спам.
        already = await self.repository.is_following(
            follower_id=follower.id,
            following_id=target_id,
        )
        await self.repository.follow(follower_id=follower.id, following_id=target_id)
        if not already:
            await self.notifications.notify(
                recipient_id=target_id,
                actor_id=follower.id,
                type_=NotificationTypeEnum.FOLLOW,
            )
        followers = await self.repository.count_followers(user_id=target_id)
        return FollowActionResult(is_following=True, followers=followers)

    async def unfollow(
        self,
        follower: UserVerifySchema,
        username: str,
    ) -> FollowActionResult:
        target_id = await self._resolve_user_id(username)
        await self.repository.unfollow(follower_id=follower.id, following_id=target_id)
        followers = await self.repository.count_followers(user_id=target_id)
        return FollowActionResult(is_following=False, followers=followers)

    async def get_counts(
        self,
        username: str,
        viewer: UserVerifySchema | None,
    ) -> FollowCounts:
        target_id = await self._resolve_user_id(username)
        followers = await self.repository.count_followers(user_id=target_id)
        following = await self.repository.count_following(user_id=target_id)

        is_following: bool | None = None
        if viewer is not None and viewer.id != target_id:
            is_following = await self.repository.is_following(
                follower_id=viewer.id,
                following_id=target_id,
            )
        return FollowCounts(
            followers=followers,
            following=following,
            is_following=is_following,
        )

    async def list_followers(self, username: str) -> list[PublicUser]:
        target_id = await self._resolve_user_id(username)
        users = await self.repository.list_followers(user_id=target_id)
        return await self._to_public_users(users)

    async def list_following(self, username: str) -> list[PublicUser]:
        target_id = await self._resolve_user_id(username)
        users = await self.repository.list_following(user_id=target_id)
        return await self._to_public_users(users)
