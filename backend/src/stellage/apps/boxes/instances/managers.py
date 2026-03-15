import uuid
from typing import Annotated

from fastapi import Depends

from stellage.apps.boxes.instances.repositories import BoxInstanceRepository
from stellage.apps.boxes.instances.schemas import BoxInstanceCreate, BoxInstanceReturn, BoxInstanceWithTemplate


class InstanceManager:
    def __init__(
        self,
        repository: Annotated[
            BoxInstanceRepository,
            Depends(BoxInstanceRepository)
        ],
    ) -> None:
        self.repository = repository


    async def create_instance(
        self,
        user_id: uuid.UUID,
        data: BoxInstanceCreate
    ) -> BoxInstanceReturn:
        return await self.repository.create_instance(
            user_id=user_id,
            data=data,
        )


    async def move_to_shelf(
        self,
        user_id: uuid.UUID,
        instance_id: uuid.UUID,
        shelf_id: uuid.UUID | None,
    ) -> BoxInstanceReturn:
        return await self.repository.move_to_shelf(
            user_id=user_id,
            shelf_id=shelf_id,
            instance_id=instance_id,
        )


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
    ) -> BoxInstanceWithTemplate:
        return await self.repository.get_box_instance_by_id(
            user_id=user_id,
            instance_id=instance_id,
        )


    async def delete_instance(
        self,
        user_id: uuid.UUID,
        instance_id: uuid.UUID,
    ) -> None:
        return await self.repository.delete_box_instance(
            user_id=user_id,
            instance_id=instance_id,
        )
