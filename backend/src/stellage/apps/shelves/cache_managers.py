import uuid
from typing import Annotated

from fastapi import Depends

from stellage.utils.utils import unpack_from_json, pack_to_json
from stellage.apps.shelves.schemas import ShelfWithBoxInstances, ShelfReturnData
from stellage.core.core_dependencies.redis_dependency import RedisDependency


class ShelfCacheManager:
    def __init__(
        self,
        redis: Annotated[
            RedisDependency,
            Depends(RedisDependency)
        ]
    ) -> None:
        self.redis = redis


    def _get_key(
        self,
        user_id: uuid.UUID,
        shelf_id: uuid.UUID,
        is_full: bool = False
    ) -> str:
        prefix = "shelf_full" if is_full else "shelf"
        return f"{prefix}:{user_id}:{shelf_id}"


    async def get_shelf(
        self,
        user_id: uuid.UUID,
        shelf_id: uuid.UUID,
        is_full: bool,
    ):
        async with self.redis.get_client() as client:
            key = self._get_key(
                user_id=user_id,
                shelf_id=shelf_id,
                is_full=is_full,
            )
            data = await client.get(key)
            schema = (
                ShelfWithBoxInstances if is_full
                else ShelfReturnData
            )
            return unpack_from_json(data, schema) if data else None


    async def store_shelf(
        self,
        shelf: ShelfReturnData | ShelfWithBoxInstances
    ) -> None:
        async with self.redis.get_client() as client:
            is_full = isinstance(shelf, ShelfWithBoxInstances)
            key = self._get_key(
                user_id=shelf.user_id,
                shelf_id=shelf.id,
                is_full=is_full
            )
            await client.set(key, pack_to_json(shelf), ex=3600)


    async def delete_shelf(
        self,
        user_id: uuid.UUID,
        shelf_id: uuid.UUID,
    ) -> None:
        async with self.redis.get_client() as client:
            await client.delete(
                self._get_key(
                    user_id=user_id,
                    shelf_id=shelf_id,
                    is_full=True,
                )
            )
            await client.delete(
                self._get_key(
                    user_id=user_id,
                    shelf_id=shelf_id,
                    is_full=False,
                )
            )


    async def get_main_shelf_id(
        self,
        user_id: uuid.UUID,
    ) -> uuid.UUID | None:
        async with self.redis.get_client() as client:
            data = await client.get(f"main_shelf_id:{user_id}")
            return uuid.UUID(data.decode()) if data else None


    async def store_main_shelf_id(
        self,
        user_id: uuid.UUID,
        shelf_id: uuid.UUID,
    ) -> None:
        async with self.redis.get_client() as client:
            await client.set(
                f"main_shelf_id:{user_id}",
                str(shelf_id),
                ex=3600,
            )


    async def delete_main_shelf_id(
        self,
        user_id: uuid.UUID,
    ) -> None:
        async with self.redis.get_client() as client:
            await client.delete(f"main_shelf_id:{user_id}")
