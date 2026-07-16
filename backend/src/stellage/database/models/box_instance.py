from __future__ import annotations
from typing import TYPE_CHECKING
import uuid

from sqlalchemy.dialects.postgresql import ENUM as PostgresEnum
from sqlalchemy import ForeignKey, JSON, Integer, CheckConstraint, Index, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from stellage.database.enums.box_sealing import SealingEnum
from stellage.database.enums.verification import VerifyEnum
from stellage.database.enums.visibility import VisibilityEnum
from stellage.database.mixins.id_mixins import IDMixin
from stellage.database.mixins.timestamp_mixins import TimestampMixin
from stellage.database.models import Base

if TYPE_CHECKING:
    from .user import User
    from .shelf import Shelf
    from .box_template import BoxTemplate
    from .box_asset import BoxAsset

class BoxInstance(IDMixin, TimestampMixin, Base):
    __tablename__ = "box_instances"

    serial_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    template_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey(
            "box_templates.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    shelf_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey(
            "shelves.id",
            ondelete="SET NULL"
        ),
        nullable=True,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="CASCADE"
        )
    )

    is_sealed: Mapped[SealingEnum] = mapped_column(
        PostgresEnum(
            SealingEnum,
            name="sealingenum",
            create_type=False
        ),
        default=SealingEnum.SEALED,
    )

    is_public: Mapped[VisibilityEnum] = mapped_column(
        PostgresEnum(
            VisibilityEnum,
            name="visibilityenum",
            create_type=False
        ),
        default=VisibilityEnum.PUBLIC,
    )

    is_verified: Mapped[VerifyEnum] = mapped_column(
        PostgresEnum(
            VerifyEnum,
            name="verifyenum",
            create_type=False
        ),
        default=VerifyEnum.NOT_VERIFIED,
    )

    content: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    shelf_row: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    shelf_col: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    template: Mapped["BoxTemplate"] = relationship(
        "BoxTemplate",
        back_populates="instances"
    )

    shelf: Mapped[Shelf | None] = relationship(
        "Shelf",
        back_populates="boxes"
    )

    owner: Mapped["User"] = relationship(
        "User",
        back_populates="boxes",
    )

    # Без cascade delete-orphan: удаление ассетов всегда явное (через статус
    # DELETING + Celery), чтобы не потерять запись о ключе объекта в S3.
    assets: Mapped[list["BoxAsset"]] = relationship(
        "BoxAsset",
        back_populates="instance",
    )

    __table_args__ = (
        CheckConstraint('serial_number > 0', name='check_serial_number_positive'),
        Index(
            'uq_box_instances_shelf_position',
            'shelf_id',
            'shelf_row',
            'shelf_col',
            unique=True,
            postgresql_where=text("shelf_id IS NOT NULL"),
        ),
    )