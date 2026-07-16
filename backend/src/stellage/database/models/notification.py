import uuid

from sqlalchemy.dialects.postgresql import ENUM as PostgresEnum
from sqlalchemy import ForeignKey, Boolean, Index
from sqlalchemy.orm import Mapped, mapped_column

from stellage.database.enums.notification_type import NotificationTypeEnum
from stellage.database.mixins.id_mixins import IDMixin
from stellage.database.mixins.timestamp_mixins import TimestampMixin
from stellage.database.models import Base


class Notification(IDMixin, TimestampMixin, Base):
    """Уведомление пользователю о социальном событии (подписка/лайк).

    recipient — кому адресовано, actor — кто вызвал. instance_id заполнен только
    для лайков коробки. Осиротевшие (удалён актор/коробка) чистятся каскадом."""
    __tablename__ = "notifications"

    recipient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    actor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    type: Mapped[NotificationTypeEnum] = mapped_column(
        PostgresEnum(
            NotificationTypeEnum,
            name="notificationtypeenum",
            create_type=False,
        ),
        nullable=False,
    )

    # Заполнено только для BOX_LIKE — какая коробка.
    instance_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("box_instances.id", ondelete="CASCADE"),
        nullable=True,
    )

    is_read: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    __table_args__ = (
        # Лента уведомлений получателя + подсчёт непрочитанных.
        Index("ix_notifications_recipient_read", "recipient_id", "is_read"),
    )
