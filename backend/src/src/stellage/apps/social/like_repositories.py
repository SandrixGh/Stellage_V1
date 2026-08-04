import uuid
from typing import Annotated

from fastapi import Depends
from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from stellage.apps.boxes.assets.schemas import BoxContentAccess
from stellage.core.core_dependencies.db_dependency import DBDependency
from stellage.database.models import BoxInstance, BoxLike, BoxTemplate, Shelf


class LikeRepository:
    def __init__(
        self,
        db: Annotated[DBDependency, Depends(DBDependency)],
    ) -> None:
        self.db = db

    async def get_box_access(
        self,
        instance_id: uuid.UUID,
    ) -> BoxContentAccess | None:
        """Срез видимости коробки (владелец/публичность/полка) — тем же
        правилом, что и для контента, решаем, можно ли лайкать."""
        async with self.db.db_session() as session:
            stmt = (
                select(
                    BoxInstance.user_id,
                    BoxInstance.is_public,
                    BoxInstance.is_sealed,
                    BoxInstance.shelf_id,
                    Shelf.is_public.label("shelf_is_public"),
                )
                .select_from(BoxInstance)
                .outerjoin(Shelf, BoxInstance.shelf_id == Shelf.id)
                .where(BoxInstance.id == instance_id)
            )
            row = (await session.execute(stmt)).first()
            if row is None:
                return None
            return BoxContentAccess(
                owner_id=row.user_id,
                is_public=row.is_public,
                is_sealed=row.is_sealed,
                shelf_id=row.shelf_id,
                shelf_is_public=row.shelf_is_public,
            )

    async def like(self, user_id: uuid.UUID, instance_id: uuid.UUID) -> bool:
        async with self.db.db_session() as session:
            stmt = (
                pg_insert(BoxLike)
                .values(user_id=user_id, instance_id=instance_id)
                .on_conflict_do_nothing(constraint="uq_box_like_pair")
                .returning(BoxLike.id)
            )
            inserted = (await session.execute(stmt)).scalar_one_or_none()
            await session.commit()
            return inserted is not None

    async def unlike(self, user_id: uuid.UUID, instance_id: uuid.UUID) -> None:
        async with self.db.db_session() as session:
            stmt = delete(BoxLike).where(
                BoxLike.user_id == user_id,
                BoxLike.instance_id == instance_id,
            )
            await session.execute(stmt)
            await session.commit()

    async def is_liked(self, user_id: uuid.UUID, instance_id: uuid.UUID) -> bool:
        async with self.db.db_session() as session:
            stmt = select(BoxLike.id).where(
                BoxLike.user_id == user_id,
                BoxLike.instance_id == instance_id,
            )
            return (await session.execute(stmt)).scalar() is not None

    async def count_likes(self, instance_id: uuid.UUID) -> int:
        async with self.db.db_session() as session:
            stmt = (
                select(func.count())
                .select_from(BoxLike)
                .where(BoxLike.instance_id == instance_id)
            )
            return (await session.execute(stmt)).scalar_one()

    # ── Template Likes ──

    async def like_template(self, user_id: uuid.UUID, template_id: uuid.UUID) -> bool:
        async with self.db.db_session() as session:
            stmt = (
                pg_insert(BoxLike)
                .values(user_id=user_id, template_id=template_id)
                .on_conflict_do_nothing(constraint="uq_box_template_like_pair")
                .returning(BoxLike.id)
            )
            inserted = (await session.execute(stmt)).scalar_one_or_none()
            await session.commit()
            return inserted is not None

    async def unlike_template(self, user_id: uuid.UUID, template_id: uuid.UUID) -> None:
        async with self.db.db_session() as session:
            stmt = delete(BoxLike).where(
                BoxLike.user_id == user_id,
                BoxLike.template_id == template_id,
            )
            await session.execute(stmt)
            await session.commit()

    async def is_template_liked(self, user_id: uuid.UUID, template_id: uuid.UUID) -> bool:
        async with self.db.db_session() as session:
            stmt = select(BoxLike.id).where(
                BoxLike.user_id == user_id,
                BoxLike.template_id == template_id,
            )
            return (await session.execute(stmt)).scalar() is not None

    async def count_template_likes(self, template_id: uuid.UUID) -> int:
        async with self.db.db_session() as session:
            stmt = (
                select(func.count())
                .select_from(BoxLike)
                .where(BoxLike.template_id == template_id)
            )
            return (await session.execute(stmt)).scalar_one()
