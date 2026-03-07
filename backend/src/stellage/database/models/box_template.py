from typing import TYPE_CHECKING

from decimal import Decimal

from sqlalchemy.dialects.postgresql import ENUM as PostgresEnum

from sqlalchemy import String, Numeric
from sqlalchemy.orm import mapped_column, Mapped, relationship

from stellage.database.enums.box_rarity import BoxRarity
from stellage.database.enums.currency import CurrencyEnum
from stellage.database.mixins.id_mixins import IDMixin
from stellage.database.mixins.timestamp_mixins import TimestampMixin
from stellage.database.models import Base

if TYPE_CHECKING:
    from .box_instance import BoxInstance

class BoxTemplate(IDMixin, TimestampMixin, Base):
    __tablename__ = "box_templates"

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
        PostgresEnum(
            CurrencyEnum,
            name="currencyenum",
            create_type=False,
        ),
        default=CurrencyEnum.RUB,
        nullable=False,
    )

    rarity: Mapped[BoxRarity] = mapped_column(
        PostgresEnum(
            BoxRarity,
            name="boxrarity",
            create_type=False,
        ),
        default=BoxRarity.COMMON,
    )

    instances: Mapped[list["BoxInstance"]] = relationship(
        "BoxInstance",
        back_populates="template",
        cascade="all, delete-orphan"
    )