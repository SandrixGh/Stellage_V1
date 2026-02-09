import uuid

from sqlalchemy import ForeignKey, String, Boolean
from sqlalchemy.orm import Mapped
from sqlalchemy.testing.schema import mapped_column

from stellage.database.mixins.id_mixins import IDMixin
from stellage.database.mixins.timestamp_mixins import TimestampMixin
from stellage.database.models import Base


class Shelf(IDMixin, TimestampMixin, Base):
    __table_name__ = "shelves"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Мой Стеллаж"
    )

    is_main: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    is_public: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    def __repr__(self):
        return f"<Shelf(title={self.title}, user_id={self.user_id}, is_main={self.is_main})>"