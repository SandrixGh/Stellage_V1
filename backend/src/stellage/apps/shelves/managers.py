import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy import insert, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from stellage.apps.shelves.schemas import CreateShelf, ShelfReturnData, GetShelfByTitle, GetShelfIdAndTitleAndOwner
from stellage.core.core_dependencies.db_dependency import DBDependency
from stellage.core.core_dependencies.redis_dependency import RedisDependency
from stellage.database.models import Shelf

from .utils import unpack_from_json, pack_to_json

class ShelfManager:
    def __init__(
        self,
        db: Annotated[
            DBDependency,
            Depends(DBDependency)
        ],
        redis: Annotated[
            RedisDependency,
            Depends(RedisDependency)
        ],
    ) -> None:
        self.db = db
        self.redis = redis
        self.model = Shelf


    async def create_shelf(
        self,
        user_id: uuid.UUID,
        shelf: CreateShelf
    ) -> ShelfReturnData:
        async with self.db.db_session() as session:
            if shelf.is_main:
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
        user_id: uuid.UUID | str
    ) -> list[ShelfReturnData]:
        async with self.db.db_session() as session:
            query = select(self.model).where(self.model.user_id == user_id)

            result = await session.execute(query)

            shelves = result.scalars().all()

            return [ShelfReturnData.model_validate(shelf) for shelf in shelves]


    async def get_main_shelf(
        self,
        user_id: uuid.UUID | str,
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


    async def get_main_shelf_from_cache(
        self,
        user_id: uuid.UUID | str,
    ) -> ShelfReturnData | None:
        async with self.redis.get_client() as client:
            key = f"main_shelf:{user_id}"
            data = await client.get(key)
            if data:
                return unpack_from_json(data, ShelfReturnData)
            return None


    async def reset_main_shelf(
        self,
        user_id: uuid.UUID | str ,
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


    async def store_shelf_to_redis(
        self,
        shelf: ShelfReturnData,
    ) -> None:
        async with self.redis.get_client() as client:
            key = f"shelf:{shelf.user_id}:{shelf.id}"
            return await client.set(key, pack_to_json(shelf), ex=3600)


    async def store_main_shelf_to_redis(
        self,
        shelf: ShelfReturnData,
    ) -> None:
        async with self.redis.get_client() as client:
            key = f"main_shelf:{shelf.user_id}"
            return await client.set(key, pack_to_json(shelf), ex=3600)


    async def delete_shelf_cache(
        self,
        shelf: ShelfReturnData,
    ) -> None:
        async with self.redis.get_client() as client:
            key = f"shelf:{shelf.user_id}:{shelf.id}"
            return await client.delete(key)


    async def delete_main_shelf_cache(
        self,
        user_id: uuid.UUID | str
    ) -> None:
        async with self.redis.get_client() as client:
            key = f"main_shelf:{user_id}"
            return await client.delete(key)