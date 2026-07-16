import uuid

from sqlalchemy import ForeignKey, String, Boolean, Index
from sqlalchemy.orm import Mapped, mapped_column

from stellage.database.mixins.id_mixins import IDMixin
from stellage.database.mixins.timestamp_mixins import TimestampMixin
from stellage.database.models import Base


class Message(IDMixin, TimestampMixin, Base):
    """Личное сообщение между двумя пользователями.

    sender — автор, recipient — адресат. is_read помечается, когда получатель
    открывает диалог. CASCADE по обоим пользователям — переписка удаляется
    вместе с аккаунтом. Обратных relationship нет: диалоги читаются запросами.
    """
    __tablename__ = "messages"

    sender_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    recipient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    text: Mapped[str] = mapped_column(
        String(4000),
        nullable=False,
    )

    is_read: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    __table_args__ = (
        # Быстрая выборка ленты диалога между двумя пользователями по времени.
        Index("ix_messages_pair_created", "sender_id", "recipient_id", "created_at"),
        # Подсчёт непрочитанных у получателя.
        Index("ix_messages_recipient_read", "recipient_id", "is_read"),
    )
