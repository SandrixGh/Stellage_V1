from __future__ import annotations
from typing import TYPE_CHECKING
import uuid

from sqlalchemy.dialects.postgresql import ENUM as PostgresEnum
from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from stellage.database.enums.asset_kind import AssetKindEnum
from stellage.database.enums.asset_status import AssetStatusEnum
from stellage.database.mixins.id_mixins import IDMixin
from stellage.database.mixins.timestamp_mixins import TimestampMixin
from stellage.database.models import Base

if TYPE_CHECKING:
    from .box_instance import BoxInstance


class BoxAsset(IDMixin, TimestampMixin, Base):
    """Бинарный контент коробки (фото/видео), лежащий в S3.

    FK намеренно SET NULL, а не CASCADE: строка ассета — единственная запись
    о ключе объекта в S3. При удалении коробки/пользователя строка выживает
    с instance_id=NULL, и sweeper гарантированно удаляет сам объект.
    """
    __tablename__ = "box_assets"

    instance_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey(
            "box_instances.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    kind: Mapped[AssetKindEnum] = mapped_column(
        PostgresEnum(
            AssetKindEnum,
            name="assetkindenum",
            create_type=False,
        ),
        nullable=False,
    )

    # Ключ всегда генерируется сервером: users/{owner}/boxes/{instance}/{asset}.ext
    s3_key: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
        unique=True,
    )

    mime: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    size_bytes: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )

    # Санитизированное имя исходного файла — только метаданные для
    # response-content-disposition, в ключ объекта не попадает.
    original_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    status: Mapped[AssetStatusEnum] = mapped_column(
        PostgresEnum(
            AssetStatusEnum,
            name="assetstatusenum",
            create_type=False,
        ),
        default=AssetStatusEnum.PENDING,
        nullable=False,
    )

    instance: Mapped["BoxInstance | None"] = relationship(
        "BoxInstance",
        back_populates="assets",
    )

    __table_args__ = (
        CheckConstraint("size_bytes > 0", name="check_asset_size_positive"),
        # Скан sweeper'а: DELETING / застрявшие PENDING выбираются по статусу и возрасту.
        Index("ix_box_assets_gc", "status", "created_at"),
    )
