import uuid
from typing import Annotated
from fastapi import Depends

from stellage.apps.shelves.schemas import ShelfReturnData, ShelfWithBoxInstances
from stellage.apps.shelves.utils import unpack_from_json, pack_to_json
from stellage.core.core_dependencies.redis_dependency import RedisDependency

class ShelfCacheManager:
    def __init__(
        self,
        redis: Annotated[
            RedisDependency,
            Depends(RedisDependency)
        ],
    ) -> None:
        self.redis = redis


    async def get_main_shelf(self, user_id: uuid.UUID) -> ShelfReturnData | None:
        async with self.redis.get_client() as client:
            key = f"main_shelf:{user_id}"
            data = await client.get(key)
            return unpack_from_json(data, ShelfReturnData) if data else None


    async def get_shelf(self, user_id: uuid.UUID, shelf_id: uuid.UUID) -> ShelfReturnData | None:
        async with self.redis.get_client() as client:
            key = f"shelf:{user_id}:{shelf_id}"
            data = await client.get(key)
            return unpack_from_json(data, ShelfReturnData) if data else None


    async def store_shelf(self, shelf: ShelfReturnData) -> None:
        async with self.redis.get_client() as client:
            key = f"shelf:{shelf.user_id}:{shelf.id}"
            await client.set(key, pack_to_json(shelf), ex=3600)


    async def store_main_shelf(self, shelf: ShelfReturnData) -> None:
        async with self.redis.get_client() as client:
            key = f"main_shelf:{shelf.user_id}"
            await client.set(key, pack_to_json(shelf), ex=3600)


    async def delete_shelf(self, shelf_id: uuid.UUID, user_id: uuid.UUID) -> None:
        async with self.redis.get_client() as client:
            key = f"shelf:{user_id}:{shelf_id}"
            await client.delete(key)


    async def delete_main_shelf(self, user_id: uuid.UUID) -> None:
        async with self.redis.get_client() as client:
            key = f"main_shelf:{user_id}"
            await client.delete(key)


    async def refresh_main_shelf(self, user_id: uuid.UUID, shelf: ShelfReturnData) -> None:
        await self.delete_main_shelf(user_id=user_id)
        await self.store_main_shelf(shelf=shelf)


    async def get_shelf_with_instances(
        self,
        user_id: uuid.UUID,
        shelf_id: uuid.UUID
    ) -> ShelfWithBoxInstances | None:
        async with self.redis.get_client() as client:
            key = f"shelf_full:{user_id}:{shelf_id}"
            data = await client.get(key)
            return unpack_from_json(data, ShelfWithBoxInstances) if data else None


    async def store_shelf_full(
        self,
        shelf: ShelfWithBoxInstances,
    ) -> None:
        async with self.redis.get_client() as client:
            key = f"shelf_full:{shelf.user_id}:{shelf.id}"
            await client.set(key, pack_to_json(shelf), ex=3600)
