import uuid
from typing import Annotated

from fastapi import Depends, HTTPException
from sqlalchemy import update, insert, select, delete, asc
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from stellage.apps.shelves.schemas import CreateShelf, ShelfReturnData
from stellage.core.core_dependencies.db_dependency import DBDependency
from stellage.database.models import Shelf


class ShelfRepository:
    def __init__(self,
            db: Annotated[
                DBDependency,
                Depends(DBDependency)
            ],
        ) -> None:
        self.db = db
        self.model = Shelf


    async def reset_main_shelf(
        self,
        user_id: uuid.UUID,
        session: AsyncSession
    ) -> None:
        query = (
            update(self.model)
            .where(
                self.model.user_id == user_id,
                self.model.is_main == True,
            )
            .values(is_main=False)
        )

        await session.execute(query)


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

            except IntegrityError:
                await session.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Shelf already exist"
                )
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
                    self.model.is_main == True,
                )
            )

            result = await session.execute(query)
            shelf = result.scalar_one_or_none()

            if shelf:
                return ShelfReturnData.model_validate(shelf)

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

