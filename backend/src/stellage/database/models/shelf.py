import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Index, String, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from stellage.database.mixins.id_mixins import IDMixin
from stellage.database.mixins.timestamp_mixins import TimestampMixin
from stellage.database.models import Base

if TYPE_CHECKING:
    from stellage.database.models.box_instance import BoxInstance
    from stellage.database.models.user import User


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

    boxes: Mapped[list["BoxInstance"]] = relationship(
        "BoxInstance",
        back_populates="shelf",
    )

    __table_args__ = (
        UniqueConstraint("user_id", "title", name="uq_user_shelf_title"),
        # Не больше одной главной полки на пользователя: частичный уникальный
        # индекс по user_id там, где is_main. Защищает от гонки set_main_shelf,
        # которая иначе оставляла бы две is_main и роняла get_main_shelf
        # (scalar_one_or_none → MultipleResultsFound → 500).
        Index(
            "uq_shelves_one_main_per_user",
            "user_id",
            unique=True,
            postgresql_where=text("is_main"),
        ),
    )
