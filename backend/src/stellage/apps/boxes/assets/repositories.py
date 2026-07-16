import uuid
from typing import Annotated

from fastapi import Depends
from sqlalchemy import delete, func, insert, select, update

from stellage.apps.boxes.assets.schemas import (
    BoxAssetInternal,
    BoxAssetRead,
    BoxContentAccess,
)
from stellage.core.core_dependencies.db_dependency import DBDependency
from stellage.database.enums.asset_kind import AssetKindEnum
from stellage.database.enums.asset_status import AssetStatusEnum
from stellage.database.models import BoxAsset, BoxInstance, Shelf


class BoxAssetRepository:
    def __init__(
        self,
        db: Annotated[
            DBDependency,
            Depends(DBDependency)
        ]
    ) -> None:
        self.db = db
        self.model = BoxAsset

    async def instance_owned_by(
        self,
        user_id: uuid.UUID,
        instance_id: uuid.UUID,
    ) -> bool:
        async with self.db.db_session() as session:
            query = (
                select(BoxInstance.id)
                .where(
                    BoxInstance.id == instance_id,
                    BoxInstance.user_id == user_id,
                )
            )
            result = await session.execute(query)
            return result.scalar_one_or_none() is not None

    async def get_box_access(
        self,
        instance_id: uuid.UUID,
    ) -> BoxContentAccess | None:
        """Одним запросом достаёт всё, что нужно правилу видимости контента."""
        async with self.db.db_session() as session:
            query = (
                select(
                    BoxInstance.user_id,
                    BoxInstance.is_public,
                    BoxInstance.is_sealed,
                    BoxInstance.shelf_id,
                    Shelf.is_public.label("shelf_is_public"),
                )
                .outerjoin(Shelf, Shelf.id == BoxInstance.shelf_id)
                .where(BoxInstance.id == instance_id)
            )
            result = await session.execute(query)
            row = result.one_or_none()

            if row is None:
                return None

            return BoxContentAccess(
                owner_id=row.user_id,
                is_public=row.is_public,
                is_sealed=row.is_sealed,
                shelf_id=row.shelf_id,
                shelf_is_public=row.shelf_is_public,
            )

    async def count_active_for_instance(
        self,
        instance_id: uuid.UUID,
    ) -> int:
        async with self.db.db_session() as session:
            query = (
                select(func.count(self.model.id))
                .where(
                    self.model.instance_id == instance_id,
                    self.model.status != AssetStatusEnum.DELETING,
                )
            )
            result = await session.execute(query)
            return result.scalar_one()

    async def sum_bytes_for_owner(
        self,
        owner_id: uuid.UUID,
    ) -> int:
        async with self.db.db_session() as session:
            query = (
                select(func.coalesce(func.sum(self.model.size_bytes), 0))
                .where(
                    self.model.owner_id == owner_id,
                    self.model.status != AssetStatusEnum.DELETING,
                )
            )
            result = await session.execute(query)
            return result.scalar_one()

    async def create_pending(
        self,
        asset_id: uuid.UUID,
        owner_id: uuid.UUID,
        instance_id: uuid.UUID,
        kind: AssetKindEnum,
        s3_key: str,
        mime: str,
        size_bytes: int,
        original_name: str,
    ) -> None:
        async with self.db.db_session() as session:
            query = (
                insert(self.model)
                .values(
                    id=asset_id,
                    owner_id=owner_id,
                    instance_id=instance_id,
                    kind=kind,
                    s3_key=s3_key,
                    mime=mime,
                    size_bytes=size_bytes,
                    original_name=original_name,
                    status=AssetStatusEnum.PENDING,
                )
            )
            await session.execute(query)
            await session.commit()

    async def get_owned_asset(
        self,
        asset_id: uuid.UUID,
        owner_id: uuid.UUID,
    ) -> BoxAssetInternal | None:
        async with self.db.db_session() as session:
            query = (
                select(self.model)
                .where(
                    self.model.id == asset_id,
                    self.model.owner_id == owner_id,
                )
            )
            result = await session.execute(query)
            asset = result.scalar_one_or_none()

            if asset is None:
                return None

            return BoxAssetInternal.model_validate(asset)

    async def get_asset_with_access(
        self,
        asset_id: uuid.UUID,
    ) -> tuple[BoxAssetInternal, BoxContentAccess] | None:
        """Ассет + срез доступа его коробки одним запросом (для чтения ссылок)."""
        async with self.db.db_session() as session:
            query = (
                select(
                    self.model,
                    BoxInstance.user_id,
                    BoxInstance.is_public,
                    BoxInstance.is_sealed,
                    BoxInstance.shelf_id,
                    Shelf.is_public.label("shelf_is_public"),
                )
                .join(BoxInstance, BoxInstance.id == self.model.instance_id)
                .outerjoin(Shelf, Shelf.id == BoxInstance.shelf_id)
                .where(self.model.id == asset_id)
            )
            result = await session.execute(query)
            row = result.one_or_none()

            if row is None:
                return None

            asset = BoxAssetInternal.model_validate(row[0])
            access = BoxContentAccess(
                owner_id=row.user_id,
                is_public=row.is_public,
                is_sealed=row.is_sealed,
                shelf_id=row.shelf_id,
                shelf_is_public=row.shelf_is_public,
            )
            return asset, access

    async def list_ready_for_instance(
        self,
        instance_id: uuid.UUID,
    ) -> list[BoxAssetRead]:
        async with self.db.db_session() as session:
            query = (
                select(self.model)
                .where(
                    self.model.instance_id == instance_id,
                    self.model.status == AssetStatusEnum.READY,
                )
                .order_by(self.model.created_at)
            )
            result = await session.execute(query)
            return [
                BoxAssetRead.model_validate(asset)
                for asset in result.scalars()
            ]

    async def set_status(
        self,
        asset_id: uuid.UUID,
        status: AssetStatusEnum,
    ) -> None:
        async with self.db.db_session() as session:
            query = (
                update(self.model)
                .where(self.model.id == asset_id)
                .values(status=status)
            )
            await session.execute(query)
            await session.commit()

    async def mark_deleting_for_instance(
        self,
        instance_id: uuid.UUID,
        owner_id: uuid.UUID,
    ) -> list[uuid.UUID]:
        """Помечает все ассеты коробки на удаление, возвращает их id."""
        async with self.db.db_session() as session:
            query = (
                update(self.model)
                .where(
                    self.model.instance_id == instance_id,
                    self.model.owner_id == owner_id,
                    self.model.status != AssetStatusEnum.DELETING,
                )
                .values(status=AssetStatusEnum.DELETING)
                .returning(self.model.id)
            )
            result = await session.execute(query)
            asset_ids = [row[0] for row in result.fetchall()]
            await session.commit()
            return asset_ids

    async def delete_row(
        self,
        asset_id: uuid.UUID,
    ) -> None:
        async with self.db.db_session() as session:
            query = delete(self.model).where(self.model.id == asset_id)
            await session.execute(query)
            await session.commit()
