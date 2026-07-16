import uuid
from typing import Annotated

from fastapi import Depends

from stellage.apps.auth.schemas import UserVerifySchema
from stellage.apps.notifications.repositories import NotificationRepository
from stellage.apps.notifications.schemas import NotificationRead, UnreadCount
from stellage.apps.profile.avatar import AvatarManager
from stellage.apps.profile.schemas import PublicUser
from stellage.database.enums.notification_type import NotificationTypeEnum


class NotificationService:
    def __init__(
        self,
        repository: Annotated[NotificationRepository, Depends(NotificationRepository)],
        avatar_manager: Annotated[AvatarManager, Depends(AvatarManager)],
    ) -> None:
        self.repository = repository
        self.avatar_manager = avatar_manager

    async def notify(
        self,
        recipient_id: uuid.UUID,
        actor_id: uuid.UUID,
        type_: NotificationTypeEnum,
        instance_id: uuid.UUID | None = None,
    ) -> None:
        """Создаёт уведомление. Себе не уведомляем (актор == получатель) —
        мягко игнорируем, чтобы вызывающему не приходилось это проверять."""
        if recipient_id == actor_id:
            return
        await self.repository.create(
            recipient_id=recipient_id,
            actor_id=actor_id,
            type_=type_,
            instance_id=instance_id,
        )

    async def list_notifications(
        self,
        user: UserVerifySchema,
    ) -> list[NotificationRead]:
        rows = await self.repository.list_for_recipient(recipient_id=user.id)
        result: list[NotificationRead] = []
        for notif, actor, box_title in rows:
            actor_pub = PublicUser.model_validate(actor)
            if actor.avatar_key:
                actor_pub.avatar_url = await self.avatar_manager.get_avatar_url(
                    avatar_key=actor.avatar_key,
                )
            result.append(
                NotificationRead(
                    id=notif.id,
                    type=notif.type,
                    is_read=notif.is_read,
                    created_at=notif.created_at,
                    actor=actor_pub,
                    box_title=box_title,
                )
            )
        return result

    async def unread_count(self, user: UserVerifySchema) -> UnreadCount:
        count = await self.repository.count_unread(recipient_id=user.id)
        return UnreadCount(unread=count)

    async def mark_all_read(self, user: UserVerifySchema) -> None:
        await self.repository.mark_all_read(recipient_id=user.id)
