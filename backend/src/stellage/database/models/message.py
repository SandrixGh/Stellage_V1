import datetime
import uuid

from sqlalchemy import ForeignKey, String, Boolean, Index, DateTime, BigInteger
from sqlalchemy.dialects.postgresql import ENUM as PostgresEnum
from sqlalchemy.orm import Mapped, mapped_column

from stellage.database.enums.asset_kind import AssetKindEnum
from stellage.database.enums.message_kind import MessageKindEnum
from stellage.database.mixins.id_mixins import IDMixin
from stellage.database.mixins.timestamp_mixins import TimestampMixin
from stellage.database.models import Base


class Message(IDMixin, TimestampMixin, Base):
    """Личное сообщение между двумя пользователями.

    sender — автор, recipient — адресат. is_read помечается, когда получатель
    открывает диалог. CASCADE по обоим пользователям — переписка удаляется
    вместе с аккаунтом. Обратных relationship нет: диалоги читаются запросами.

    Сообщение несёт текст И/ИЛИ вложение (фото/видео в приватном S3), либо
    является системной карточкой подарка (kind=GIFT, gift_instance_id).
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

    # Текст опционален: сообщение может быть только вложением или подарком.
    text: Mapped[str | None] = mapped_column(
        String(4000),
        nullable=True,
    )

    kind: Mapped[MessageKindEnum] = mapped_column(
        PostgresEnum(
            MessageKindEnum,
            name="messagekindenum",
            create_type=False,
        ),
        nullable=False,
        default=MessageKindEnum.TEXT,
        # PostgresEnum хранит ИМЕНА членов ('TEXT'/'GIFT'), не value.
        server_default=MessageKindEnum.TEXT.name,
    )

    is_read: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    # Заполнено, если сообщение отредактировано.
    edited_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ── Вложение (S3) ────────────────────────────────────────────────────────
    # s3_key наружу не выходит — вложение адресуется только по id сообщения.
    asset_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    asset_mime: Mapped[str | None] = mapped_column(String(100), nullable=True)
    asset_kind: Mapped[AssetKindEnum | None] = mapped_column(
        PostgresEnum(
            AssetKindEnum,
            name="assetkindenum",
            create_type=False,
        ),
        nullable=True,
    )
    asset_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    asset_size: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    # True между initiate и complete: черновик вложения ещё не подтверждён.
    # complete финализирует только pending-черновик — повторный complete тогда
    # ничего не делает (идемпотентно, без дубля уведомления и «воскрешения»
    # прочитанного в непрочитанное).
    attachment_pending: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        server_default="false",
    )

    # ── Подарок (kind=GIFT) ──────────────────────────────────────────────────
    # Экземпляр подаренной коробки; SET NULL — карточка остаётся, если коробку
    # потом удалили.
    gift_instance_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("box_instances.id", ondelete="SET NULL"),
        nullable=True,
    )

    __table_args__ = (
        # Быстрая выборка ленты диалога между двумя пользователями по времени.
        Index("ix_messages_pair_created", "sender_id", "recipient_id", "created_at"),
        # Подсчёт непрочитанных у получателя.
        Index("ix_messages_recipient_read", "recipient_id", "is_read"),
    )
