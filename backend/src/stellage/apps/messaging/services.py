import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status

from stellage.apps.auth.schemas import UserVerifySchema
from stellage.apps.messaging.repositories import MessageRepository
from stellage.apps.messaging.schemas import (
    ConversationPreview,
    MessageRead,
    SendMessageRequest,
    UnreadMessagesCount,
)
from stellage.apps.notifications.services import NotificationService
from stellage.apps.profile.avatar import AvatarManager
from stellage.apps.profile.managers import ProfileManager
from stellage.apps.profile.schemas import PublicUser
from stellage.database.enums.notification_type import NotificationTypeEnum


class MessageService:
    def __init__(
        self,
        repository: Annotated[MessageRepository, Depends(MessageRepository)],
        profile_manager: Annotated[ProfileManager, Depends(ProfileManager)],
        avatar_manager: Annotated[AvatarManager, Depends(AvatarManager)],
        notifications: Annotated[NotificationService, Depends(NotificationService)],
    ) -> None:
        self.repository = repository
        self.profile_manager = profile_manager
        self.avatar_manager = avatar_manager
        self.notifications = notifications

    async def _public_user(self, user) -> PublicUser:
        pub = PublicUser.model_validate(user)
        if user.avatar_key:
            pub.avatar_url = await self.avatar_manager.get_avatar_url(
                avatar_key=user.avatar_key,
            )
        return pub

    async def send_message(
        self,
        sender: UserVerifySchema,
        data: SendMessageRequest,
    ) -> MessageRead:
        recipient = await self.profile_manager.get_user_by_username(
            username=data.to_username,
        )
        if not recipient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        if recipient.id == sender.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot message yourself",
            )

        msg = await self.repository.create(
            sender_id=sender.id,
            recipient_id=recipient.id,
            text=data.text,
        )
        # Уведомляем адресата о новом сообщении (себе notify игнорирует сам).
        await self.notifications.notify(
            recipient_id=recipient.id,
            actor_id=sender.id,
            type_=NotificationTypeEnum.MESSAGE,
        )
        return MessageRead(
            id=msg.id,
            text=msg.text,
            is_read=msg.is_read,
            is_mine=True,
            created_at=msg.created_at,
        )

    async def get_conversation(
        self,
        user: UserVerifySchema,
        username: str,
    ) -> list[MessageRead]:
        partner = await self.profile_manager.get_user_by_username(username=username)
        if not partner:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        rows = await self.repository.get_conversation(
            user_id=user.id,
            partner_id=partner.id,
        )
        # Открытие диалога = прочтение входящих от собеседника. Гасим и счётчик
        # сообщений, и агрегированное message-уведомление в колокольчике от него.
        await self.repository.mark_read(user_id=user.id, partner_id=partner.id)
        await self.notifications.mark_read_from_actor(
            recipient_id=user.id,
            actor_id=partner.id,
            type_=NotificationTypeEnum.MESSAGE,
        )
        return [
            MessageRead(
                id=m.id,
                text=m.text,
                is_read=m.is_read,
                is_mine=m.sender_id == user.id,
                created_at=m.created_at,
            )
            for m in rows
        ]

    async def list_conversations(
        self,
        user: UserVerifySchema,
    ) -> list[ConversationPreview]:
        rows = await self.repository.list_conversations(user_id=user.id)
        result: list[ConversationPreview] = []
        for partner, last_text, last_at, unread in rows:
            result.append(
                ConversationPreview(
                    user=await self._public_user(partner),
                    last_text=last_text,
                    last_at=last_at,
                    unread=unread,
                )
            )
        return result

    async def unread_count(self, user: UserVerifySchema) -> UnreadMessagesCount:
        count = await self.repository.count_unread(user_id=user.id)
        return UnreadMessagesCount(unread=count)
