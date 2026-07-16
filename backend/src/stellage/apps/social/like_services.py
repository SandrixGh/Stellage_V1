import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status

from stellage.apps.auth.schemas import UserVerifySchema
from stellage.apps.boxes.assets.authorization import can_view_box_content
from stellage.apps.social.like_repositories import LikeRepository
from stellage.apps.social.schemas import LikeActionResult, LikeState


class LikeService:
    def __init__(
        self,
        repository: Annotated[LikeRepository, Depends(LikeRepository)],
    ) -> None:
        self.repository = repository

    async def _require_visible_box(
        self,
        instance_id: uuid.UUID,
        viewer: UserVerifySchema | None,
    ) -> None:
        """Лайкать/видеть лайки можно только у коробки, которую зритель видит.
        Невидимая или несуществующая — одинаковый 404 (без оракула)."""
        access = await self.repository.get_box_access(instance_id=instance_id)
        if access is None or not can_view_box_content(
            viewer_id=viewer.id if viewer else None,
            owner_id=access.owner_id,
            is_public=access.is_public,
            is_sealed=access.is_sealed,
            shelf_id=access.shelf_id,
            shelf_is_public=access.shelf_is_public,
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Box not found",
            )

    async def like(
        self,
        user: UserVerifySchema,
        instance_id: uuid.UUID,
    ) -> LikeActionResult:
        await self._require_visible_box(instance_id=instance_id, viewer=user)
        await self.repository.like(user_id=user.id, instance_id=instance_id)
        likes = await self.repository.count_likes(instance_id=instance_id)
        return LikeActionResult(is_liked=True, likes=likes)

    async def unlike(
        self,
        user: UserVerifySchema,
        instance_id: uuid.UUID,
    ) -> LikeActionResult:
        await self._require_visible_box(instance_id=instance_id, viewer=user)
        await self.repository.unlike(user_id=user.id, instance_id=instance_id)
        likes = await self.repository.count_likes(instance_id=instance_id)
        return LikeActionResult(is_liked=False, likes=likes)

    async def get_state(
        self,
        instance_id: uuid.UUID,
        viewer: UserVerifySchema | None,
    ) -> LikeState:
        await self._require_visible_box(instance_id=instance_id, viewer=viewer)
        likes = await self.repository.count_likes(instance_id=instance_id)
        is_liked: bool | None = None
        if viewer is not None:
            is_liked = await self.repository.is_liked(
                user_id=viewer.id,
                instance_id=instance_id,
            )
        return LikeState(likes=likes, is_liked=is_liked)
