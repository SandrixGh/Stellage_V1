import datetime
import uuid
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

from stellage.apps.profile.schemas import PublicUser


class SendMessageRequest(BaseModel):
    """Отправка сообщения по username адресата."""
    to_username: Annotated[str, StringConstraints(min_length=1, max_length=30)]
    text: Annotated[str, StringConstraints(min_length=1, max_length=4000, strip_whitespace=True)]


class MessageRead(BaseModel):
    """Одно сообщение в ленте диалога. is_mine — отправлено текущим пользователем
    (для выравнивания пузырька на фронте)."""
    id: uuid.UUID
    text: str
    is_read: bool
    is_mine: bool
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationPreview(BaseModel):
    """Строка списка диалогов: собеседник + последнее сообщение + непрочитанные."""
    user: PublicUser
    last_text: str
    last_at: datetime.datetime
    unread: int = 0


class UnreadMessagesCount(BaseModel):
    unread: int = 0
