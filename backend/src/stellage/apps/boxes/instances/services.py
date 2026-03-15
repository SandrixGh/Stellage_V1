import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status

from stellage.apps.auth.schemas import UserVerifySchema
from stellage.apps.boxes.instances.managers import InstanceManager
from stellage.apps.boxes.instances.schemas import BoxInstanceReturn, BoxInstanceCreate, GetBoxInstanceById, \
    BoxInstanceWithTemplate


class InstanceService:
    def __init__(
        self,
        manager: Annotated[
            InstanceManager,
            Depends(InstanceManager)
        ]
    ):
        self.manager = manager


    async def create_instance(
        self,
        user: UserVerifySchema,
        data: BoxInstanceCreate
    ) -> BoxInstanceReturn:
        return await self.manager.create_instance(
            user_id=user.id,
            data=data,
        )


    async def move_to_shelf(
        self,
        user: UserVerifySchema,
        instance_id: uuid.UUID,
        shelf_id: uuid.UUID | None,
    ) -> BoxInstanceReturn:
        return await self.manager.move_to_shelf(
            user_id=user.id,
            instance_id=instance_id,
            shelf_id=shelf_id
        )


    async def get_instances(
        self,
        user: UserVerifySchema,
    ) -> list[BoxInstanceWithTemplate]:
        return await self.manager.get_instances(
            user_id=user.id,
        )


    async def get_instance_by_id(
        self,
        user: UserVerifySchema,
        instance_id: uuid.UUID
    ) -> BoxInstanceWithTemplate:
        box = await self.manager.get_instance_by_id(
            user_id=user.id,
            instance_id=instance_id,
        )

        if not box:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Box not found"
            )

        return box


    async def delete_instance(
        self,
        user: UserVerifySchema,
        instance_id: uuid.UUID,
    ) -> None:
        return await self.manager.delete_instance(
            user_id=user.id,
            instance_id=instance_id,
        )
