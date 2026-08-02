import uuid

from sqlalchemy import ForeignKey, UniqueConstraint, func, select
from sqlalchemy.orm import Mapped, column_property, mapped_column

from stellage.database.mixins.id_mixins import IDMixin
from stellage.database.mixins.timestamp_mixins import TimestampMixin
from stellage.database.models import Base
from stellage.database.models.box_instance import BoxInstance


class BoxLike(IDMixin, TimestampMixin, Base):
    """Лайк пользователя на экземпляр или шаблон коробки."""
    __tablename__ = "box_likes"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    instance_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("box_instances.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    template_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("box_templates.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    __table_args__ = (
        UniqueConstraint("user_id", "instance_id", name="uq_box_like_pair"),
        UniqueConstraint("user_id", "template_id", name="uq_box_template_like_pair"),
    )


# Счётчик лайков экземпляра
BoxInstance.likes_count = column_property(
    select(func.count(BoxLike.id))
    .where(BoxLike.instance_id == BoxInstance.id)
    .correlate_except(BoxLike)
    .scalar_subquery(),
    deferred=False,
)
