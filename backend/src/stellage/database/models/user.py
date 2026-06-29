from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import String, Text, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from stellage.database.mixins.id_mixins import IDMixin
from stellage.database.mixins.timestamp_mixins import TimestampMixin
from stellage.database.models.base import Base

if TYPE_CHECKING:
    from stellage.database.models.shelf import Shelf
    from stellage.database.models.box_instance import BoxInstance

class User(IDMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
    )

    username: Mapped[str | None] = mapped_column(
        String(30),
        unique=True,
        nullable=True,
    )

    nickname: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    last_seen_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    hashed_password: Mapped[Text] = mapped_column(
        Text,
        unique=False,
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    is_superuser: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    shelves: Mapped[list["Shelf"]] = relationship(
        "Shelf",
        back_populates="owner",
        cascade="all, delete-orphan",
    )

    boxes: Mapped[list["BoxInstance"]] = relationship(
        "BoxInstance",
        back_populates="owner",
        cascade="all, delete-orphan"
    )