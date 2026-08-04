import logging
import uuid
from typing import Annotated

from fastapi import Depends

from stellage.apps.boxes.instances.schemas import BoxInstanceWithTemplate
from stellage.core.core_dependencies.redis_dependency import RedisDependency
from stellage.utils.utils import pack_to_json, unpack_from_json

logger = logging.getLogger(__name__)


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
        try:
            async with self.redis.get_client() as client:
                key = f"instance:{user_id}:{instance_id}"
                data = await client.get(key)
                return unpack_from_json(
                    data,
                    BoxInstanceWithTemplate
                ) if data else None
        except Exception:
            logger.warning("Redis get_instance failed, falling back to DB", exc_info=True)
            return None


    async def store_instance(
        self,
        instance: BoxInstanceWithTemplate,
    ) -> None:
        try:
            async with self.redis.get_client() as client:
                key = f"instance:{instance.user_id}:{instance.id}"
                await client.set(key, pack_to_json(instance), ex=3600)
        except Exception:
            logger.warning("Redis store_instance failed", exc_info=True)


    async def delete_instance(
        self,
        user_id: uuid.UUID,
        instance_id: uuid.UUID,
    ) -> None:
        try:
            async with self.redis.get_client() as client:
                key = f"instance:{user_id}:{instance_id}"
                await client.delete(key)
        except Exception:
            logger.warning("Redis delete_instance failed", exc_info=True)