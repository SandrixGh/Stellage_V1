import uuid

from sqlalchemy import Boolean, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from stellage.database.mixins.id_mixins import IDMixin
from stellage.database.mixins.timestamp_mixins import TimestampMixin
from stellage.database.models import Base


class CoinGift(IDMixin, TimestampMixin, Base):
    """Подарок Stellacoin пользователю от другого пользователя."""
    __tablename__ = "coin_gifts"

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

    amount: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    is_gift_public: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    sender = relationship("User", foreign_keys=[sender_id], lazy="joined")
    recipient = relationship("User", foreign_keys=[recipient_id], lazy="joined")
