import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy import insert
from sqlalchemy.exc import IntegrityError

from stellage.apps.auth.depends import get_current_user
from stellage.apps.auth.schemas import UserVerifySchema
from stellage.apps.shelves.schemas import CreateShelf, ShelfReturnData, GetShelfByTitle
from stellage.core.core_dependencies.db_dependency import DBDependency
from stellage.core.core_dependencies.redis_dependency import RedisDependency
from stellage.database.models import Shelf


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


    async def store_shelf_to_redis(
        self,
        shelf_title: str,
        user_id: uuid.UUID | str,
        shelf_id: uuid.UUID | str,
    ) -> None:
        async with self.redis.get_client() as client:
            return await client.set(f"{user_id}:{shelf_id}", shelf_title)