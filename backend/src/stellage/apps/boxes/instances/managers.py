import uuid
from typing import Annotated

from fastapi import Depends

from stellage.apps.boxes.instances.cache_managers import InstanceCacheManager
from stellage.apps.boxes.instances.repositories import BoxInstanceRepository
from stellage.apps.boxes.instances.schemas import BoxInstanceCreate, BoxInstanceReturn, BoxInstanceWithTemplate
from stellage.apps.shelves.cache_managers import ShelfCacheManager


class InstanceManager:
    def __init__(
        self,
        repository: Annotated[
            BoxInstanceRepository,
            Depends(BoxInstanceRepository)
        ],
        instance_cache_manager: Annotated[
            InstanceCacheManager,
            Depends(InstanceCacheManager)
        ],
        shelf_cache_manager: Annotated[
            ShelfCacheManager,
            Depends(ShelfCacheManager)
        ]
    ) -> None:
        self.shelf_cache_manager = shelf_cache_manager
        self.instance_cache_manager = instance_cache_manager
        self.repository = repository


    async def create_instance(
        self,
        user_id: uuid.UUID,
        data: BoxInstanceCreate
    ) -> BoxInstanceWithTemplate:
        instance = await self.repository.create_instance(
            user_id=user_id,
            data=data,
        )

        if data.shelf_id:
            await self.shelf_cache_manager.delete_shelf(
                user_id=instance.user_id,
                shelf_id=instance.shelf_id,
            )

        await self.instance_cache_manager.store_instance(
            instance=instance,
        )

        return instance


    async def refresh_old_shelf(
        self,
        user_id: uuid.UUID,
        instance_id: uuid.UUID,
    ) -> None:
        instance = await self.instance_cache_manager.get_instance(
            instance_id=instance_id,
            user_id=user_id
        )

        if not instance:
            instance = await self.repository.get_box_instance_by_id(
                user_id=user_id,
                instance_id=instance_id
            )

        if instance and instance.shelf_id:
            await self.shelf_cache_manager.delete_shelf(
                user_id=user_id,
                shelf_id=instance.shelf_id,
            )


    async def move_to_shelf(
        self,
        user_id: uuid.UUID,
        instance_id: uuid.UUID,
        shelf_id: uuid.UUID | None,
    ) -> BoxInstanceWithTemplate:
        await self.refresh_old_shelf(
            user_id=user_id,
            instance_id=instance_id,
        )

        await self.instance_cache_manager.delete_instance(
            instance_id=instance_id,
            user_id=user_id,
        )

        updated_instance = await self.repository.move_to_shelf(
            user_id=user_id,
            shelf_id=shelf_id,
            instance_id=instance_id,
        )

        if shelf_id:
            await self.shelf_cache_manager.delete_shelf(
                user_id=user_id,
                shelf_id=shelf_id,
            )

        await self.instance_cache_manager.store_instance(
            instance=updated_instance
        )

        return updated_instance


    async def get_instances(
        self,
        user_id: uuid.UUID,
    ) -> list[BoxInstanceWithTemplate]:
        return await self.repository.get_box_instances(
            user_id=user_id,
        )


    async def get_instance_by_id(
        self,
        user_id: uuid.UUID,
        instance_id: uuid.UUID,
    ) -> BoxInstanceWithTemplate | None:
        cached = await self.instance_cache_manager.get_instance(
            user_id=user_id,
            instance_id=instance_id,
        )
        if cached:
            return cached

        instance = await self.repository.get_box_instance_by_id(
            user_id=user_id,
            instance_id=instance_id,
        )

        if instance:
            await self.instance_cache_manager.store_instance(
                instance=instance
            )

        return instance


    async def delete_instance(
        self,
        user_id: uuid.UUID,
        instance_id: uuid.UUID,
    ) -> None:
        await self.refresh_old_shelf(
            user_id=user_id,
            instance_id=instance_id,
        )

        await self.repository.delete_box_instance(
            user_id=user_id,
            instance_id=instance_id,
        )

        await self.instance_cache_manager.delete_instance(
            user_id=user_id,
            instance_id=instance_id,
        )