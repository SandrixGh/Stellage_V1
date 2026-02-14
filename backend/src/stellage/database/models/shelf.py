import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Boolean, UniqueConstraint
from sqlalchemy.orm import Mapped, relationship
from sqlalchemy.testing.schema import mapped_column

from stellage.database.mixins.id_mixins import IDMixin
from stellage.database.mixins.timestamp_mixins import TimestampMixin
from stellage.database.models import Base

if TYPE_CHECKING:
    from stellage.database.models import User


class Shelf(IDMixin, TimestampMixin, Base):
    __tablename__ = "shelves"

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

    owner: Mapped["User"] = relationship("User", back_populates="shelves")

    __table_args__ = (
        UniqueConstraint("user_id", "title", name="uq_user_shelf_title"),
    )
