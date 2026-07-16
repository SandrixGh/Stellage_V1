import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status

from stellage.apps.auth.schemas import UserVerifySchema
from stellage.apps.boxes.assets.authorization import can_see_box
from stellage.apps.boxes.instances.managers import InstanceManager
from stellage.apps.boxes.instances.public_schemas import BoxPublicView
from stellage.apps.boxes.instances.repositories import BoxInstanceRepository
from stellage.apps.boxes.instances.schemas import (
    BoxInstanceCreate,
    BoxInstanceWithTemplate,
    BoxPositionUpdate,
    BoxTextContent,
)
from stellage.apps.notifications.services import NotificationService
from stellage.apps.profile.avatar import AvatarManager
from stellage.apps.profile.managers import ProfileManager
from stellage.apps.profile.schemas import PublicUser
from stellage.database.enums.notification_type import NotificationTypeEnum


class InstanceService:
    def __init__(
        self,
        manager: Annotated[
            InstanceManager,
            Depends(InstanceManager)
        ],
        repository: Annotated[
            BoxInstanceRepository,
            Depends(BoxInstanceRepository),
        ],
        avatar_manager: Annotated[
            AvatarManager,
            Depends(AvatarManager),
        ],
        profile_manager: Annotated[
            ProfileManager,
            Depends(ProfileManager),
        ],
        notifications: Annotated[
            NotificationService,
            Depends(NotificationService),
        ],
    ):
        self.manager = manager
        self.repository = repository
        self.avatar_manager = avatar_manager
        self.profile_manager = profile_manager
        self.notifications = notifications


    async def create_instance(
        self,
        user: UserVerifySchema,
        data: BoxInstanceCreate
    ) -> BoxInstanceWithTemplate:
        return await self.manager.create_instance(
            user_id=user.id,
            data=data,
        )


    async def move_to_shelf(
        self,
        user: UserVerifySchema,
        instance_id: uuid.UUID,
        shelf_id: uuid.UUID | None,
    ) -> BoxInstanceWithTemplate:
        return await self.manager.move_to_shelf(
            user_id=user.id,
            instance_id=instance_id,
            shelf_id=shelf_id
        )


    async def update_position(
        self,
        user: UserVerifySchema,
        instance_id: uuid.UUID,
        data: BoxPositionUpdate,
    ) -> BoxInstanceWithTemplate:
        return await self.manager.update_position(
            user_id=user.id,
            instance_id=instance_id,
            data=data,
        )


    async def update_box(
        self,
        user: UserVerifySchema,
        instance_id: uuid.UUID,
        content: BoxTextContent | None,
        update_content: bool,
    ) -> BoxInstanceWithTemplate:
        return await self.manager.update_box(
            user_id=user.id,
            instance_id=instance_id,
            content=content,
            update_content=update_content,
        )


    async def unseal_box(
        self,
        user: UserVerifySchema,
        instance_id: uuid.UUID,
    ) -> BoxInstanceWithTemplate:
        return await self.manager.unseal_box(
            user_id=user.id,
            instance_id=instance_id,
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


    async def gift_box(
        self,
        giver: UserVerifySchema,
        instance_id: uuid.UUID,
        to_username: str,
    ) -> BoxInstanceWithTemplate:
        """Дарит коробку пользователю по username. Даритель должен владеть
        коробкой (иначе 404); подарить себе нельзя (400). Получателю уходит
        уведомление GIFT со ссылкой на коробку."""
        recipient = await self.profile_manager.get_user_by_username(
            username=to_username,
        )
        if not recipient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Recipient not found",
            )
        if recipient.id == giver.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot gift a box to yourself",
            )

        box = await self.manager.gift_box(
            giver_id=giver.id,
            recipient_id=recipient.id,
            instance_id=instance_id,
        )
        await self.notifications.notify(
            recipient_id=recipient.id,
            actor_id=giver.id,
            type_=NotificationTypeEnum.GIFT,
            instance_id=instance_id,
        )
        return box


    async def get_public_box_view(
        self,
        viewer: UserVerifySchema | None,
        instance_id: uuid.UUID,
    ) -> BoxPublicView:
        """Детальный просмотр коробки для отдельной страницы. Читает коробку
        независимо от владельца, но отдаёт только если зритель вправе её видеть
        (can_see_box: владелец всегда; остальные — публичная на публичной полке).
        Невидимая или несуществующая — одинаковый 404. Владельца отдаём публичной
        карточкой с presigned-аватаром."""
        found = await self.repository.get_instance_with_owner_by_id(
            instance_id=instance_id,
        )
        viewer_id = viewer.id if viewer else None
        if found is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Box not found",
            )

        box, owner, shelf_is_public = found
        if not can_see_box(
            viewer_id=viewer_id,
            owner_id=box.user_id,
            is_public=box.is_public,
            shelf_id=box.shelf_id,
            shelf_is_public=shelf_is_public,
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Box not found",
            )

        owner_card = PublicUser.model_validate(owner)
        if owner.avatar_key:
            owner_card.avatar_url = await self.avatar_manager.get_avatar_url(
                avatar_key=owner.avatar_key,
            )

        return BoxPublicView(
            box=box,
            owner=owner_card,
            is_owner=viewer_id is not None and viewer_id == box.user_id,
        )


    async def delete_instance(
        self,
        user: UserVerifySchema,
        instance_id: uuid.UUID,
    ) -> None:
        return await self.manager.delete_instance(
            user_id=user.id,
            instance_id=instance_id,
        )
