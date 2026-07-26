import uuid
from typing import Annotated

from fastapi import Depends, HTTPException
from sqlalchemy import asc, delete, insert, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from starlette import status

from stellage.apps.shelves.schemas import CreateShelf, ShelfReturnData, ShelfWithBoxInstances
from stellage.core.core_dependencies.db_dependency import DBDependency
from stellage.database.enums.asset_status import AssetStatusEnum
from stellage.database.models import BoxAsset, BoxInstance, Shelf


class ShelfRepository:
    def __init__(self,
            db: Annotated[
                DBDependency,
                Depends(DBDependency)
            ],
        ) -> None:
        self.db = db
        self.model = Shelf
        self.instance_model = BoxInstance

    def _boxes_assets_loader(self):
        """READY-ассеты коробок полки: без eager-загрузки валидация
        BoxInstanceReturn.assets упадёт на async lazy-load."""
        return (
            joinedload(self.model.boxes)
            .selectinload(
                self.instance_model.assets.and_(
                    BoxAsset.status == AssetStatusEnum.READY
                )
            )
        )


    async def reset_main_shelf(
        self,
        user_id: uuid.UUID,
        session: AsyncSession
    ) -> None:
        query = (
            update(self.model)
            .where(
                self.model.user_id == user_id,
                self.model.is_main.is_(True),
            )
            .values(is_main=False)
        )

        await session.execute(query)


    async def set_main_shelf(
        self,
        user_id: uuid.UUID,
        shelf_id: uuid.UUID,
    ) -> ShelfReturnData | None:
        async with self.db.db_session() as session:
            # Убеждаемся, что полка существует и принадлежит пользователю.
            check = await session.execute(
                select(self.model).where(
                    self.model.user_id == user_id,
                    self.model.id == shelf_id,
                )
            )
            if check.scalar_one_or_none() is None:
                return None

            # Снимаем флаг с прежней главной и ставим его на выбранную полку.
            await self.reset_main_shelf(user_id=user_id, session=session)
            await session.execute(
                update(self.model)
                .where(self.model.id == shelf_id)
                .values(is_main=True)
            )
            await session.commit()

            refreshed = await session.execute(
                select(self.model).where(self.model.id == shelf_id)
            )
            return ShelfReturnData.model_validate(refreshed.scalar_one())


    async def create_shelf(
        self,
        user_id: uuid.UUID,
        shelf: CreateShelf,
    ) -> ShelfReturnData:
        is_main_shelf: bool = shelf.is_main
        async with self.db.db_session() as session:
            if is_main_shelf:
                await self.reset_main_shelf(
                    user_id=user_id,
                    session=session,
                )

            data = shelf.model_dump()
            data["user_id"] = user_id

            query = insert(self.model).values(**data).returning(self.model)

            try:
                result = await session.execute(query)
                await session.commit()
                shelf_data = result.scalar_one()
                return ShelfReturnData.model_validate(shelf_data)

            except IntegrityError as err:
                await session.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Shelf already exist"
                ) from err
            except Exception as e:
                await session.rollback()
                raise e


    async def get_shelves(
        self,
        user_id: uuid.UUID
    ) -> list[ShelfReturnData]:
        async with self.db.db_session() as session:
            query = select(self.model).where(self.model.user_id == user_id)

            result = await session.execute(query)

            shelves = result.scalars().all()

            return [ShelfReturnData.model_validate(shelf) for shelf in shelves]


    async def get_main_shelf(
        self,
        user_id: uuid.UUID,
    ) -> ShelfReturnData | None:
        async with self.db.db_session() as session:
            query = (
                select(self.model)
                .where(
                    self.model.user_id == user_id,
                    self.model.is_main.is_(True),
                )
            )

            result = await session.execute(query)
            shelf = result.scalar_one_or_none()

            if shelf:
                return ShelfReturnData.model_validate(shelf)

            return None


    async def get_main_shelf_with_boxes(
        self,
        user_id: uuid.UUID,
    ) -> ShelfWithBoxInstances | None:
        async with self.db.db_session() as session:
            query = (
                select(self.model)
                .where(
                    self.model.user_id == user_id,
                    self.model.is_main.is_(True),
                )
                .options(
                    joinedload(self.model.owner),
                    joinedload(self.model.boxes)
                    .joinedload(self.instance_model.template),
                    self._boxes_assets_loader(),
                )
            )

            result = await session.execute(query)
            shelf = result.unique().scalar_one_or_none()

            if shelf:
                shelf_data = ShelfWithBoxInstances.model_validate(shelf)
                # Prefer a real username; fall back to the email local-part so the
                # full email (PII) is never exposed.
                if shelf.owner:
                    shelf_data.owner_username = (
                        shelf.owner.username or shelf.owner.email.split("@")[0]
                    )
                return shelf_data

            return None


    async def get_shelf_by_id(
        self,
        user_id: uuid.UUID,
        shelf_id: uuid.UUID,
    ) -> ShelfReturnData | None:
        async with self.db.db_session() as session:
            query = (
                select(self.model)
                .where(
                    self.model.user_id == user_id,
                    self.model.id == shelf_id,
                )
            )
            result = await session.execute(query)

            shelf = result.scalar_one_or_none()

            if shelf:
                return ShelfReturnData.model_validate(shelf)

            return None


    async def get_shelf_with_boxes(
        self,
        user_id: uuid.UUID,
        shelf_id: uuid.UUID,
    ) -> ShelfWithBoxInstances | None:
        async with self.db.db_session() as session:
            query = (
                select(self.model)
                .where(
                    self.model.user_id == user_id,
                    self.model.id == shelf_id,
                )
                .options(
                    joinedload(self.model.owner),
                    joinedload(self.model.boxes)
                    .joinedload(self.instance_model.template),
                    self._boxes_assets_loader(),
                )
            )

            result = await session.execute(query)
            shelf = result.unique().scalar_one_or_none()

            if shelf:
                shelf_data = ShelfWithBoxInstances.model_validate(shelf)
                # Prefer a real username; fall back to the email local-part so the
                # full email (PII) is never exposed.
                if shelf.owner:
                    shelf_data.owner_username = (
                        shelf.owner.username or shelf.owner.email.split("@")[0]
                    )
                return shelf_data

            return None


    async def get_public_shelf_with_boxes(
        self,
        shelf_id: uuid.UUID,
    ) -> ShelfWithBoxInstances | None:
        async with self.db.db_session() as session:
            query = (
                select(self.model)
                .where(
                    self.model.id == shelf_id,
                )
                .options(
                    joinedload(self.model.owner),
                    joinedload(self.model.boxes)
                    .joinedload(self.instance_model.template),
                    self._boxes_assets_loader(),
                )
            )

            result = await session.execute(query)
            shelf = result.unique().scalar_one_or_none()

            if not shelf:
                return None

            shelf_data = ShelfWithBoxInstances.model_validate(shelf)
            # Prefer a real username; fall back to the email local-part so the
            # full email (PII) is never exposed on the public endpoint.
            if shelf.owner:
                shelf_data.owner_username = (
                    shelf.owner.username or shelf.owner.email.split("@")[0]
                )
            else:
                shelf_data.owner_username = None
            return shelf_data


    async def delete_shelf(
        self,
        user_id: uuid.UUID,
        shelf_id: uuid.UUID
    ) -> uuid.UUID | None:
        async with self.db.db_session() as session:
            delete_query = (
                delete(self.model)
                .where(
                    self.model.user_id == user_id,
                    self.model.id == shelf_id,
                )
                .returning(self.model.is_main)
            )

            result = await session.execute(delete_query)
            was_main = result.scalar()

            if was_main is None:
                return None

            # По умолчанию новой главной полки нет: назначаем её только когда
            # удаляли именно главную. Инициализация до ветки убирает
            # UnboundLocalError на возврате при удалении обычной полки.
            new_main_id = None

            if was_main:
                new_main_query = (
                    select(self.model.id)
                    .where(self.model.user_id == user_id)
                    .order_by(asc(self.model.created_at))
                    .limit(1)
                )

                new_main_result = await session.execute(new_main_query)
                new_main_id = new_main_result.scalar()

                if new_main_id:
                    await session.execute(
                        update(self.model)
                        .where(
                            self.model.user_id == user_id,
                            self.model.id == new_main_id
                        )
                        .values(is_main=True)
                    )

            await session.commit()
            return new_main_id

