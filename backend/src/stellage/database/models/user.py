from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, String, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from stellage.database.mixins.id_mixins import IDMixin
from stellage.database.mixins.timestamp_mixins import TimestampMixin
from stellage.database.models.base import Base

if TYPE_CHECKING:
    from stellage.database.models.box_instance import BoxInstance
    from stellage.database.models.shelf import Shelf

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

    # Ключ объекта аватара в S3 (не URL — наружу отдаётся presigned GET).
    # NULL = аватар не загружен, фронт показывает монограмму.
    avatar_key: Mapped[str | None] = mapped_column(
        String(512),
        nullable=True,
    )

    # Ключ объекта баннера/обложки в S3 (не URL — наружу отдаётся presigned GET).
    banner_key: Mapped[str | None] = mapped_column(
        String(512),
        nullable=True,
    )

    # Вертикальное выравнивание баннера в процентах (0..100), по умолчанию 50%
    banner_pos_y: Mapped[int] = mapped_column(
        Integer,
        default=50,
        server_default="50",
        nullable=False,
    )

    # Короткое описание «о себе» для витрины профиля.
    bio: Mapped[str | None] = mapped_column(
        String(280),
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

    is_developer: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default="false",
        nullable=False,
    )

    stella_coins: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    shelves: Mapped[list["Shelf"]] = relationship(
        "Shelf",
        back_populates="owner",
        cascade="all, delete-orphan",
    )

    boxes: Mapped[list["BoxInstance"]] = relationship(
        "BoxInstance",
        foreign_keys="BoxInstance.user_id",
        back_populates="owner",
        cascade="all, delete-orphan",
    )