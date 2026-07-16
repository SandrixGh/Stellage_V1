import uuid
from typing import Annotated

from fastapi import Depends
from sqlalchemy import select, func, delete
from sqlalchemy.dialects.postgresql import insert as pg_insert

from stellage.core.core_dependencies.db_dependency import DBDependency
from stellage.database.models import Follow, User


class FollowRepository:
    def __init__(
        self,
        db: Annotated[DBDependency, Depends(DBDependency)],
    ) -> None:
        self.db = db

    async def follow(
        self,
        follower_id: uuid.UUID,
        following_id: uuid.UUID,
    ) -> None:
        """Идемпотентно: повторная подписка на того же пользователя — не ошибка
        (ON CONFLICT DO NOTHING по уникальной паре)."""
        async with self.db.db_session() as session:
            stmt = (
                pg_insert(Follow)
                .values(follower_id=follower_id, following_id=following_id)
                .on_conflict_do_nothing(constraint="uq_follow_pair")
            )
            await session.execute(stmt)
            await session.commit()

    async def unfollow(
        self,
        follower_id: uuid.UUID,
        following_id: uuid.UUID,
    ) -> None:
        async with self.db.db_session() as session:
            stmt = delete(Follow).where(
                Follow.follower_id == follower_id,
                Follow.following_id == following_id,
            )
            await session.execute(stmt)
            await session.commit()

    async def is_following(
        self,
        follower_id: uuid.UUID,
        following_id: uuid.UUID,
    ) -> bool:
        async with self.db.db_session() as session:
            stmt = select(Follow.id).where(
                Follow.follower_id == follower_id,
                Follow.following_id == following_id,
            )
            result = await session.execute(stmt)
            return result.scalar() is not None

    async def count_followers(self, user_id: uuid.UUID) -> int:
        async with self.db.db_session() as session:
            stmt = (
                select(func.count())
                .select_from(Follow)
                .where(Follow.following_id == user_id)
            )
            return (await session.execute(stmt)).scalar_one()

    async def count_following(self, user_id: uuid.UUID) -> int:
        async with self.db.db_session() as session:
            stmt = (
                select(func.count())
                .select_from(Follow)
                .where(Follow.follower_id == user_id)
            )
            return (await session.execute(stmt)).scalar_one()

    async def list_followers(
        self,
        user_id: uuid.UUID,
        limit: int = 50,
    ) -> list[User]:
        """Пользователи, подписанные на user_id."""
        async with self.db.db_session() as session:
            stmt = (
                select(User)
                .join(Follow, Follow.follower_id == User.id)
                .where(Follow.following_id == user_id)
                .order_by(Follow.created_at.desc())
                .limit(limit)
            )
            return list((await session.execute(stmt)).scalars().all())

    async def list_following(
        self,
        user_id: uuid.UUID,
        limit: int = 50,
    ) -> list[User]:
        """Пользователи, на которых подписан user_id."""
        async with self.db.db_session() as session:
            stmt = (
                select(User)
                .join(Follow, Follow.following_id == User.id)
                .where(Follow.follower_id == user_id)
                .order_by(Follow.created_at.desc())
                .limit(limit)
            )
            return list((await session.execute(stmt)).scalars().all())
