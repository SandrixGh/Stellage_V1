import uuid

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from stellage.database.mixins.id_mixins import IDMixin
from stellage.database.mixins.timestamp_mixins import TimestampMixin
from stellage.database.models import Base


class BoxLike(IDMixin, TimestampMixin, Base):
    """Лайк пользователя на экземпляр коробки. Пара уникальна (один лайк на
    коробку от пользователя). CASCADE и по пользователю, и по коробке —
    осиротевшие лайки не нужны.

    Обратных relationship нет: лайки читаются counts/toggle-запросами."""
    __tablename__ = "box_likes"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    instance_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("box_instances.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    __table_args__ = (
        UniqueConstraint("user_id", "instance_id", name="uq_box_like_pair"),
    )
