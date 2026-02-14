import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy import insert, select, update
from sqlalchemy.exc import IntegrityError

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


    async def get_shelves(
        self,
        user_id: uuid.UUID | str
    ) -> list[ShelfReturnData]:
        async with self.db.db_session() as session:
            query = select(self.model).where(self.model.user_id == user_id)

            result = await session.execute(query)

            shelves = result.scalars().all()

            return [ShelfReturnData.model_validate(shelf) for shelf in shelves]


    async def store_shelf_to_redis(
        self,
        shelf: ShelfReturnData,
    ) -> None:
        async with self.redis.get_client() as client:
            key = f"{shelf.user_id}:{shelf.id}"
            return await client.set(key, pack_to_json(shelf), ex=3600)



    async def reset_main_shelf(
        self,
        user_id: uuid.UUID | str ,
    ) -> None:
        async with self.db.db_session() as session:
            query = (
                update(self.model)
                .where(
                    self.model.user_id == user_id,
                    self.model.is_main == True,
                )
                .values(is_main=False)
            )
            await session.execute(query)
            await session.commit()


