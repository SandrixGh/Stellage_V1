import logging
import urllib.parse
import uuid
from typing import Annotated

from botocore.exceptions import ClientError
from fastapi import Depends, HTTPException, status

from stellage.apps.auth.schemas import UserVerifySchema
from stellage.apps.boxes.assets.limits import (
    ALLOWED_MIME_TYPES,
    MAGIC_PROBE_BYTES,
    MAX_BYTES,
    MIME_EXTENSIONS,
    matches_magic,
)
from stellage.apps.messaging.repositories import MessageRepository
from stellage.apps.messaging.schemas import (
    AttachmentCompleteRequest,
    AttachmentInitiateRequest,
    AttachmentUploadTarget,
    ConversationPreview,
    EditMessageRequest,
    MessageRead,
    SendMessageRequest,
    UnreadMessagesCount,
)
from stellage.apps.notifications.services import NotificationService
from stellage.apps.profile.avatar import AvatarManager
from stellage.apps.profile.managers import ProfileManager
from stellage.apps.profile.schemas import PublicUser
from stellage.core.core_dependencies.s3_dependency import S3Dependency
from stellage.core.settings import settings
from stellage.database.enums.asset_kind import AssetKindEnum
from stellage.database.enums.message_kind import MessageKindEnum
from stellage.database.enums.notification_type import NotificationTypeEnum
from stellage.database.models import Message

logger = logging.getLogger(__name__)


class MessageService:
    def __init__(
        self,
        repository: Annotated[MessageRepository, Depends(MessageRepository)],
        profile_manager: Annotated[ProfileManager, Depends(ProfileManager)],
        avatar_manager: Annotated[AvatarManager, Depends(AvatarManager)],
        notifications: Annotated[NotificationService, Depends(NotificationService)],
        s3: Annotated[S3Dependency, Depends(S3Dependency)],
    ) -> None:
        self.repository = repository
        self.profile_manager = profile_manager
        self.avatar_manager = avatar_manager
        self.notifications = notifications
        self.s3 = s3

    async def _public_user(self, user) -> PublicUser:
        pub = PublicUser.model_validate(user)
        if user.avatar_key:
            pub.avatar_url = await self.avatar_manager.get_avatar_url(
                avatar_key=user.avatar_key,
            )
        return pub

    async def _asset_url(self, msg: Message) -> str | None:
        """Короткоживущая presigned GET-ссылка на вложение сообщения."""
        if not msg.asset_key:
            return None
        expires_in = settings.s3_settings.download_url_expire_seconds
        disposition = urllib.parse.quote(msg.asset_name or "file")
        async with self.s3.get_signing_client() as client:
            return await client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": self.s3.bucket,
                    "Key": msg.asset_key,
                    "ResponseContentType": msg.asset_mime,
                    "ResponseContentDisposition":
                        f"inline; filename*=UTF-8''{disposition}",
                },
                ExpiresIn=expires_in,
            )

    async def _to_read(self, msg: Message, viewer_id: uuid.UUID) -> MessageRead:
        gift_title = None
        if msg.kind == MessageKindEnum.GIFT and msg.gift_instance_id:
            gift_title = await self.repository.gift_box_title(
                instance_id=msg.gift_instance_id,
            )
        return MessageRead(
            id=msg.id,
            kind=msg.kind,
            text=msg.text,
            is_read=msg.is_read,
            is_mine=msg.sender_id == viewer_id,
            created_at=msg.created_at,
            edited=msg.edited_at is not None,
            asset_url=await self._asset_url(msg),
            asset_kind=msg.asset_kind,
            asset_mime=msg.asset_mime,
            asset_name=msg.asset_name,
            gift_instance_id=msg.gift_instance_id,
            gift_box_title=gift_title,
        )

    async def _require_recipient(self, sender_id: uuid.UUID, username: str):
        recipient = await self.profile_manager.get_user_by_username(username=username)
        if not recipient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        if recipient.id == sender_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot message yourself",
            )
        return recipient

    async def send_message(
        self,
        sender: UserVerifySchema,
        data: SendMessageRequest,
    ) -> MessageRead:
        recipient = await self._require_recipient(sender.id, data.to_username)
        msg = await self.repository.create(
            sender_id=sender.id,
            recipient_id=recipient.id,
            text=data.text,
        )
        await self.notifications.notify(
            recipient_id=recipient.id,
            actor_id=sender.id,
            type_=NotificationTypeEnum.MESSAGE,
        )
        return await self._to_read(msg, viewer_id=sender.id)

    async def initiate_attachment(
        self,
        sender: UserVerifySchema,
        data: AttachmentInitiateRequest,
    ) -> AttachmentUploadTarget:
        recipient = await self._require_recipient(sender.id, data.to_username)

        if data.mime not in ALLOWED_MIME_TYPES[data.kind]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Unsupported content type for this attachment kind",
            )
        max_bytes = MAX_BYTES[data.kind]
        if data.size_bytes > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large: limit is {max_bytes} bytes",
            )

        # id известен заранее — он входит в S3-ключ, поэтому черновик создаём
        # сразу с корректным ключом за один запрос.
        message_id = uuid.uuid4()
        s3_key = f"users/{sender.id}/messages/{message_id}{MIME_EXTENSIONS[data.mime]}"
        msg = await self.repository.create_pending_attachment(
            message_id=message_id,
            sender_id=sender.id,
            recipient_id=recipient.id,
            asset_key=s3_key,
            asset_mime=data.mime,
            asset_kind=data.kind,
            asset_name=data.original_name[:255],
            asset_size=data.size_bytes,
        )

        expires_in = settings.s3_settings.upload_url_expire_seconds
        async with self.s3.get_signing_client() as client:
            presigned = await client.generate_presigned_post(
                Bucket=self.s3.bucket,
                Key=s3_key,
                Fields={"Content-Type": data.mime},
                Conditions=[
                    {"key": s3_key},
                    {"Content-Type": data.mime},
                    ["content-length-range", 1, max_bytes],
                ],
                ExpiresIn=expires_in,
            )

        logger.info("message attachment initiated: message_id=%s", msg.id)
        return AttachmentUploadTarget(
            message_id=msg.id,
            url=presigned["url"],
            fields=presigned["fields"],
            expires_in=expires_in,
        )

    async def complete_attachment(
        self,
        sender: UserVerifySchema,
        data: AttachmentCompleteRequest,
    ) -> MessageRead:
        msg = await self.repository.get_owned(
            message_id=data.message_id,
            sender_id=sender.id,
        )
        if msg is None or not msg.asset_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attachment not found",
            )

        async with self.s3.get_client() as client:
            try:
                head = await client.head_object(
                    Bucket=self.s3.bucket,
                    Key=msg.asset_key,
                )
            except ClientError:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="File was not uploaded to storage",
                )
            if (
                head.get("ContentLength") != msg.asset_size
                or head.get("ContentType") != msg.asset_mime
            ):
                await self._discard_object(client, msg.asset_key)
                await self.repository.hard_delete(msg.id, sender.id)
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Uploaded file does not match declared size or type",
                )
            probe = await client.get_object(
                Bucket=self.s3.bucket,
                Key=msg.asset_key,
                Range=f"bytes=0-{MAGIC_PROBE_BYTES - 1}",
            )
            head_bytes = await probe["Body"].read()
            if not matches_magic(msg.asset_mime, head_bytes):
                await self._discard_object(client, msg.asset_key)
                await self.repository.hard_delete(msg.id, sender.id)
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="File content does not match declared type",
                )

        finalized = await self.repository.finalize_attachment(
            message_id=msg.id,
            sender_id=sender.id,
            caption=data.caption,
        )
        await self.notifications.notify(
            recipient_id=msg.recipient_id,
            actor_id=sender.id,
            type_=NotificationTypeEnum.MESSAGE,
        )
        logger.info("message attachment completed: message_id=%s", msg.id)
        return await self._to_read(finalized or msg, viewer_id=sender.id)

    async def edit_message(
        self,
        user: UserVerifySchema,
        message_id: uuid.UUID,
        data: EditMessageRequest,
    ) -> MessageRead:
        existing = await self.repository.get_owned(
            message_id=message_id,
            sender_id=user.id,
        )
        if existing is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found",
            )
        if existing.kind == MessageKindEnum.GIFT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Gift messages cannot be edited",
            )
        updated = await self.repository.update_text(
            message_id=message_id,
            sender_id=user.id,
            text=data.text,
        )
        return await self._to_read(updated or existing, viewer_id=user.id)

    async def delete_message(
        self,
        user: UserVerifySchema,
        message_id: uuid.UUID,
    ) -> None:
        existing = await self.repository.get_owned(
            message_id=message_id,
            sender_id=user.id,
        )
        if existing is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found",
            )
        # Жёсткое удаление: строка исчезает у обоих. Сначала чистим вложение в S3.
        if existing.asset_key:
            async with self.s3.get_client() as client:
                await self._discard_object(client, existing.asset_key)
        await self.repository.hard_delete(message_id=message_id, sender_id=user.id)
        logger.info("message deleted: message_id=%s", message_id)

    async def _discard_object(self, client, key: str) -> None:
        """Best-effort удаление объекта из S3. Осиротевший объект (если удаление
        сорвётся) не виден в API, так как строка сообщения уже удаляется."""
        try:
            await client.delete_object(Bucket=self.s3.bucket, Key=key)
        except Exception:
            logger.warning("message attachment object left in S3 (best-effort)")

    async def get_conversation(
        self,
        user: UserVerifySchema,
        username: str,
        before: str | None = None,
    ) -> list[MessageRead]:
        partner = await self.profile_manager.get_user_by_username(username=username)
        if not partner:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        before_dt = None
        if before:
            import datetime as _dt
            try:
                before_dt = _dt.datetime.fromisoformat(before)
            except ValueError:
                before_dt = None

        rows = await self.repository.get_conversation(
            user_id=user.id,
            partner_id=partner.id,
            before=before_dt,
        )
        # Открытие диалога = прочтение входящих. При догрузке истории (before)
        # не трогаем прочтение.
        if before_dt is None:
            await self.repository.mark_read(user_id=user.id, partner_id=partner.id)
            await self.notifications.mark_read_from_actor(
                recipient_id=user.id,
                actor_id=partner.id,
                type_=NotificationTypeEnum.MESSAGE,
            )
        return [await self._to_read(m, viewer_id=user.id) for m in rows]

    async def list_conversations(
        self,
        user: UserVerifySchema,
    ) -> list[ConversationPreview]:
        rows = await self.repository.list_conversations(user_id=user.id)
        result: list[ConversationPreview] = []
        for partner, last_text, kind, asset_kind, last_at, unread in rows:
            result.append(
                ConversationPreview(
                    user=await self._public_user(partner),
                    last_text=_preview_text(last_text, kind, asset_kind),
                    last_at=last_at,
                    unread=unread,
                )
            )
        return result

    async def unread_count(self, user: UserVerifySchema) -> UnreadMessagesCount:
        count = await self.repository.count_unread(user_id=user.id)
        return UnreadMessagesCount(unread=count)


def _preview_text(
    text: str | None,
    kind: MessageKindEnum,
    asset_kind: AssetKindEnum | None,
) -> str:
    """Строка превью диалога, когда у последнего сообщения нет текста."""
    if text:
        return text
    if kind == MessageKindEnum.GIFT:
        return "🎁 Подарок"
    if asset_kind == AssetKindEnum.PHOTO:
        return "📷 Фото"
    if asset_kind == AssetKindEnum.VIDEO:
        return "🎬 Видео"
    return ""
