from __future__ import annotations
from typing import TYPE_CHECKING
import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, String, JSON, Numeric, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from stellage.database.enums.box_rarity import BoxRarity
from stellage.database.enums.currency import CurrencyEnum
from stellage.database.enums.box_sealing import SealingEnum
from stellage.database.enums.verification import VerifyEnum
from stellage.database.enums.visibility import VisibilityEnum
from stellage.database.mixins.id_mixins import IDMixin
from stellage.database.mixins.timestamp_mixins import TimestampMixin
from stellage.database.models import Base

if TYPE_CHECKING:
    from .user import User
    from .shelf import Shelf

class Box(IDMixin, TimestampMixin, Base):
    __tablename__ = "boxes"

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

    title: Mapped[str] = mapped_column(
        String(100),
        default="NoName Box",
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    price: Mapped[Decimal] = mapped_column(
        Numeric(
            precision=10,
            scale=2
        ),
        default=0.00,
        nullable=False,
    )

    currency: Mapped[CurrencyEnum] = mapped_column(
        Enum(CurrencyEnum),
        default=CurrencyEnum.RUB,
        nullable=False,
    )

    rarity: Mapped[BoxRarity] = mapped_column(
        Enum(BoxRarity),
        default=BoxRarity.COMMON,
    )

    is_sealed: Mapped[SealingEnum] = mapped_column(
        Enum(SealingEnum),
        default=SealingEnum.SEALED,
    )

    is_public: Mapped[VisibilityEnum] = mapped_column(
        Enum(VisibilityEnum),
        default=VisibilityEnum.PUBLIC,
    )

    is_verified: Mapped[VerifyEnum] = mapped_column(
        Enum(VerifyEnum),
        default=VerifyEnum.NOT_VERIFIED,
    )

    content: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    shelf: Mapped[Shelf | None] = relationship(
        "Shelf",
        back_populates="boxes"
    )

    owner: Mapped["User"] = relationship(
        "User",
        back_populates="boxes",
    )