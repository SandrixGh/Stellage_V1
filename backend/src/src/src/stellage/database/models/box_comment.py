import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from stellage.database.mixins.id_mixins import IDMixin
from stellage.database.mixins.timestamp_mixins import TimestampMixin
from stellage.database.models.base import Base

if TYPE_CHECKING:
    from stellage.database.models.user import User


class BoxComment(IDMixin, TimestampMixin, Base):
    """Комментарий пользователя к шаблону или экземпляру коробки."""
    __tablename__ = "box_comments"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    template_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("box_templates.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    instance_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("box_instances.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    text: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    author: Mapped["User"] = relationship("User")
