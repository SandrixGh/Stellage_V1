import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import ENUM as PostgresEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from stellage.database.enums.box_rarity import BoxRarity
from stellage.database.enums.currency import CurrencyEnum
from stellage.database.mixins.id_mixins import IDMixin
from stellage.database.mixins.timestamp_mixins import TimestampMixin
from stellage.database.models import Base

if TYPE_CHECKING:
    from .box_instance import BoxInstance
    from .user import User

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

    # Автор шаблона. NULL = шаблон платформы (каталожная коробка); для коробок,
    # созданных пользователем, указывает на создателя.
    creator_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    creator: Mapped["User | None"] = relationship("User")

    instances: Mapped[list["BoxInstance"]] = relationship(
        "BoxInstance",
        back_populates="template",
        cascade="all, delete-orphan"
    )