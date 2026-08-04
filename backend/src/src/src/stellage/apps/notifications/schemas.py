import datetime
import uuid

from pydantic import BaseModel, ConfigDict

from stellage.apps.profile.schemas import PublicUser
from stellage.database.enums.notification_type import NotificationTypeEnum


class NotificationRead(BaseModel):
    """Уведомление для ленты: тип, кто вызвал (актор с аватаром), статус
    прочтения и — для лайка — название коробки."""
    id: uuid.UUID
    type: NotificationTypeEnum
    is_read: bool
    created_at: datetime.datetime
    actor: PublicUser
    box_title: str | None = None

    model_config = ConfigDict(from_attributes=True)


class UnreadCount(BaseModel):
    unread: int = 0
