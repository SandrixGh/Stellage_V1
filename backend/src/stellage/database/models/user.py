from typing import TYPE_CHECKING

from sqlalchemy import String, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from stellage.database.mixins.id_mixins import IDMixin
from stellage.database.mixins.timestamp_mixins import TimestampMixin
from stellage.database.models.base import Base

if TYPE_CHECKING:
    from stellage.database.models.shelf import Shelf

class User(IDMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
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
