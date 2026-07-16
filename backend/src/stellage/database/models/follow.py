import uuid

from sqlalchemy import ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column

from stellage.database.mixins.id_mixins import IDMixin
from stellage.database.mixins.timestamp_mixins import TimestampMixin
from stellage.database.models import Base


class Follow(IDMixin, TimestampMixin, Base):
    """Асимметричная подписка: follower подписан на following (как канал, не
    взаимная дружба). Пара уникальна; на себя подписаться нельзя.

    Обратных relationship на User намеренно нет — подписки читаются
    целенаправленными запросами (counts/списки), а не через ленивые коллекции
    на пользователе."""
    __tablename__ = "follows"

    follower_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    following_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    __table_args__ = (
        UniqueConstraint("follower_id", "following_id", name="uq_follow_pair"),
        CheckConstraint("follower_id <> following_id", name="check_no_self_follow"),
    )
