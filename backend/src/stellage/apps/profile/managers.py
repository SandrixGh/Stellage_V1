import uuid

from fastapi import Depends
from sqlalchemy import update, select, or_, func

from stellage.apps.profile.schemas import ConfirmationCodeRequest, ProfileStats
from stellage.core.core_dependencies.db_dependency import DBDependency
from stellage.core.core_dependencies.redis_dependency import RedisDependency
from stellage.database.enums.visibility import VisibilityEnum
from stellage.database.models import User, BoxInstance, Shelf


class ProfileManager:
    def __init__(
        self,
        db: DBDependency = Depends(DBDependency),
        redis: RedisDependency = Depends(RedisDependency),
    ) -> None:
        self.db = db
        self.redis = redis
        self.user_model = User

    async def update_user_fields(
        self,
        user_id: uuid.UUID | str,
        **kwargs,
    ) -> None:
        async with self.db.db_session() as session:
            query = (
                update(
                    self.user_model
                )
                .where(self.user_model.id == user_id)
                .values(**kwargs)
            )
            await session.execute(query)
            await session.commit()


    async def search_users(
        self,
        query: str,
        limit: int = 20,
    ) -> list[User]:
        # Поиск по username и nickname (регистронезависимо, по подстроке).
        pattern = f"%{query}%"
        async with self.db.db_session() as session:
            stmt = (
                select(self.user_model)
                .where(
                    or_(
                        self.user_model.username.ilike(pattern),
                        self.user_model.nickname.ilike(pattern),
                    )
                )
                .order_by(self.user_model.username.asc())
                .limit(limit)
            )
            result = await session.execute(stmt)
            return list(result.scalars().all())


    async def get_avatar_key(
        self,
        user_id: uuid.UUID | str,
    ) -> str | None:
        async with self.db.db_session() as session:
            query = (
                select(self.user_model.avatar_key)
                .where(self.user_model.id == user_id)
            )
            result = await session.execute(query)
            return result.scalar()


    async def get_user_stats(
        self,
        user_id: uuid.UUID | str,
    ) -> ProfileStats:
        """Счётчики для витрины профиля: всего коробок, публичных коробок на
        публичных полках (то, что реально видно другим) и число полок."""
        async with self.db.db_session() as session:
            boxes_total = (
                await session.execute(
                    select(func.count())
                    .select_from(BoxInstance)
                    .where(BoxInstance.user_id == user_id)
                )
            ).scalar_one()

            public_boxes = (
                await session.execute(
                    select(func.count())
                    .select_from(BoxInstance)
                    .join(Shelf, BoxInstance.shelf_id == Shelf.id)
                    .where(
                        BoxInstance.user_id == user_id,
                        BoxInstance.is_public == VisibilityEnum.PUBLIC,
                        Shelf.is_public.is_(True),
                    )
                )
            ).scalar_one()

            shelves_total = (
                await session.execute(
                    select(func.count())
                    .select_from(Shelf)
                    .where(Shelf.user_id == user_id)
                )
            ).scalar_one()

            return ProfileStats(
                boxes=boxes_total,
                public_boxes=public_boxes,
                shelves=shelves_total,
            )


    async def get_user_by_username(
        self,
        username: str,
    ) -> User | None:
        async with self.db.db_session() as session:
            stmt = (
                select(self.user_model)
                .where(self.user_model.username == username)
            )
            result = await session.execute(stmt)
            return result.scalar_one_or_none()


    async def get_user_by_id(
        self,
        user_id: uuid.UUID | str,
    ) -> User | None:
        async with self.db.db_session() as session:
            stmt = (
                select(self.user_model)
                .where(self.user_model.id == user_id)
            )
            result = await session.execute(stmt)
            return result.scalar_one_or_none()


    async def is_username_taken(
        self,
        username: str,
        exclude_user_id: uuid.UUID | str,
    ) -> bool:
        async with self.db.db_session() as session:
            query = (
                select(self.user_model.id)
                .where(
                    self.user_model.username == username,
                    self.user_model.id != exclude_user_id,
                )
            )
            result = await session.execute(query)
            return result.scalar() is not None


    async def get_user_hashed_password(
        self,
        user_id: uuid.UUID | None
    ) -> str | None:
        async with self.db.db_session() as session:
            query = (
                select(
                    self.user_model.hashed_password
                )
                .where(self.user_model.id == user_id)
            )
            result = await session.execute(query)
            return result.scalar()


    async def store_confirmation_code(
        self,
        confirmation_code_request: ConfirmationCodeRequest
    ) -> None:
        async with self.redis.get_client() as client:
            return await client.set(
                f"{confirmation_code_request.confirmation_code}",
                confirmation_code_request.email,
                ex=3600
            )


    async def get_new_email_by_confirmation_code(
        self,
        confirmation_code: str,
    ) -> str | None:
        async with self.redis.get_client() as client:
            return await client.get(f"{confirmation_code}")


    async def remove_confirmation_code(
        self,
        confirmation_code: str
    ) -> None:
        async with self.redis.get_client() as client:
            return await client.delete(f"{confirmation_code}")