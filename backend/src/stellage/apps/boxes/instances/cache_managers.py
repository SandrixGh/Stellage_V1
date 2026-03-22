import uuid
from typing import Annotated

from fastapi import Depends

from stellage.utils.utils import unpack_from_json, pack_to_json
from stellage.apps.boxes.instances.schemas import BoxInstanceWithTemplate
from stellage.core.core_dependencies.redis_dependency import RedisDependency


class InstanceCacheManager:
    def __init__(
        self,
        redis: Annotated[
            RedisDependency,
            Depends(RedisDependency)
        ]
    ):
        self.redis = redis


    async def get_instance(
        self,
        user_id: uuid.UUID,
        instance_id: uuid.UUID,
    ) -> BoxInstanceWithTemplate | None:
        async with self.redis.get_client() as client:
            key = f"instance:{user_id}:{instance_id}"
            data = await client.get(key)
            return unpack_from_json(
                data,
                BoxInstanceWithTemplate
            ) if data else None


    async def store_instance(
        self,
        instance: BoxInstanceWithTemplate,
    ) -> None:
        async with self.redis.get_client() as client:
            key = f"instance:{instance.user_id}:{instance.id}"
            await client.set(key, pack_to_json(instance), ex=3600)


    async def delete_instance(
        self,
        user_id: uuid.UUID,
        instance_id: uuid.UUID,
    ) -> None:
        async with self.redis.get_client() as client:
            key = f"instance:{user_id}:{instance_id}"
            await client.delete(key)