import datetime
import uuid
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from stellage.apps.profile.schemas import PublicUser
from stellage.database.enums.asset_kind import AssetKindEnum
from stellage.database.enums.message_kind import MessageKindEnum


class SendMessageRequest(BaseModel):
    """Отправка текстового сообщения по username адресата."""
    to_username: Annotated[str, StringConstraints(min_length=1, max_length=30)]
    text: Annotated[str, StringConstraints(min_length=1, max_length=4000, strip_whitespace=True)]


class EditMessageRequest(BaseModel):
    """Новый текст для редактирования своего сообщения."""
    text: Annotated[str, StringConstraints(min_length=1, max_length=4000, strip_whitespace=True)]


class AttachmentInitiateRequest(BaseModel):
    """Инициация загрузки вложения в диалог с to_username."""
    to_username: Annotated[str, StringConstraints(min_length=1, max_length=30)]
    kind: AssetKindEnum
    mime: Annotated[str, StringConstraints(min_length=3, max_length=100)]
    size_bytes: int = Field(gt=0)
    original_name: Annotated[str, StringConstraints(min_length=1, max_length=255)]


class AttachmentUploadTarget(BaseModel):
    """Разовая presigned-цель + id черновика сообщения, который завершит
    complete. Не кэшировать/не логировать — живёт expires_in секунд."""
    message_id: uuid.UUID
    url: str
    fields: dict[str, str]
    expires_in: int


class AttachmentCompleteRequest(BaseModel):
    message_id: uuid.UUID
    # Необязательная подпись к вложению.
    caption: Annotated[str, StringConstraints(max_length=4000, strip_whitespace=True)] | None = None


class MessageRead(BaseModel):
    """Одно сообщение в ленте диалога. is_mine — отправлено текущим пользователем
    (для выравнивания пузырька на фронте). asset_url — короткоживущая presigned
    GET-ссылка, если у сообщения есть вложение. gift — карточка подарка."""
    id: uuid.UUID
    kind: MessageKindEnum
    text: str | None
    is_read: bool
    is_mine: bool
    created_at: datetime.datetime
    edited: bool = False

    # Вложение (если есть).
    asset_url: str | None = None
    asset_kind: AssetKindEnum | None = None
    asset_mime: str | None = None
    asset_name: str | None = None

    # Подарок (kind=GIFT).
    gift_instance_id: uuid.UUID | None = None
    gift_box_title: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ConversationPreview(BaseModel):
    """Строка списка диалогов: собеседник + последнее сообщение + непрочитанные."""
    user: PublicUser
    last_text: str
    last_at: datetime.datetime
    unread: int = 0


class UnreadMessagesCount(BaseModel):
    unread: int = 0
