import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import joinedload

from stellage.apps.auth.schemas import UserVerifySchema
from stellage.apps.profile.avatar import AvatarManager
from stellage.apps.profile.schemas import PublicUser
from stellage.apps.social.schemas import CommentCreate, CommentReturn
from stellage.core.core_dependencies.db_dependency import DBDependency
from stellage.database.models import BoxComment, User


class CommentService:
    def __init__(
        self,
        db: Annotated[DBDependency, Depends(DBDependency)],
        avatar_manager: Annotated[AvatarManager, Depends(AvatarManager)],
    ) -> None:
        self.db = db
        self.avatar_manager = avatar_manager

    async def create_comment(
        self,
        user: UserVerifySchema,
        data: CommentCreate,
    ) -> CommentReturn:
        if not data.template_id and not data.instance_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either template_id or instance_id must be provided",
            )

        async with self.db.db_session() as session:
            comment = BoxComment(
                user_id=user.id,
                template_id=data.template_id,
                instance_id=data.instance_id,
                text=data.text.strip(),
            )
            session.add(comment)
            await session.commit()

            # Refresh with author details
            stmt = (
                select(BoxComment)
                .options(joinedload(BoxComment.author))
                .where(BoxComment.id == comment.id)
            )
            result = await session.execute(stmt)
            loaded_comment = result.unique().scalar_one()

            author_card = PublicUser.model_validate(loaded_comment.author)
            if loaded_comment.author.avatar_key:
                author_card.avatar_url = await self.avatar_manager.get_avatar_url(
                    avatar_key=loaded_comment.author.avatar_key
                )

            return CommentReturn(
                id=loaded_comment.id,
                user_id=loaded_comment.user_id,
                template_id=loaded_comment.template_id,
                instance_id=loaded_comment.instance_id,
                text=loaded_comment.text,
                author=author_card,
                created_at=loaded_comment.created_at,
            )

    async def list_comments(
        self,
        template_id: uuid.UUID | None = None,
        instance_id: uuid.UUID | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[CommentReturn]:
        if not template_id and not instance_id:
            return []

        async with self.db.db_session() as session:
            stmt = (
                select(BoxComment)
                .options(joinedload(BoxComment.author))
                .order_by(BoxComment.created_at.asc())
                .limit(limit)
                .offset(offset)
            )

            if template_id:
                stmt = stmt.where(BoxComment.template_id == template_id)
            else:
                stmt = stmt.where(BoxComment.instance_id == instance_id)

            result = await session.execute(stmt)
            comments = result.unique().scalars().all()

            res: list[CommentReturn] = []
            for c in comments:
                author_card = PublicUser.model_validate(c.author)
                if getattr(c.author, "avatar_key", None):
                    try:
                        author_card.avatar_url = await self.avatar_manager.get_avatar_url(
                            avatar_key=c.author.avatar_key
                        )
                    except Exception:
                        pass
                res.append(
                    CommentReturn(
                        id=c.id,
                        user_id=c.user_id,
                        template_id=c.template_id,
                        instance_id=c.instance_id,
                        text=c.text,
                        author=author_card,
                        created_at=c.created_at,
                    )
                )
            return res

    async def delete_comment(
        self,
        user: UserVerifySchema,
        comment_id: uuid.UUID,
    ) -> None:
        async with self.db.db_session() as session:
            stmt = (
                select(BoxComment)
                .where(BoxComment.id == comment_id)
            )
            result = await session.execute(stmt)
            comment = result.scalar_one_or_none()

            if not comment:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Comment not found",
                )

            if comment.user_id != user.id and not user.is_superuser:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied",
                )

            await session.execute(
                delete(BoxComment).where(BoxComment.id == comment_id)
            )
            await session.commit()
