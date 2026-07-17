import datetime
import uuid
from typing import Annotated

from fastapi import Depends
from sqlalchemy import select, func, update
from sqlalchemy.orm import aliased

from stellage.core.core_dependencies.db_dependency import DBDependency
from stellage.database.enums.notification_type import NotificationTypeEnum
from stellage.database.models import Notification, User, BoxInstance, BoxTemplate


class NotificationRepository:
    def __init__(
        self,
        db: Annotated[DBDependency, Depends(DBDependency)],
    ) -> None:
        self.db = db

    async def create(
        self,
        recipient_id: uuid.UUID,
        actor_id: uuid.UUID,
        type_: NotificationTypeEnum,
        instance_id: uuid.UUID | None = None,
    ) -> None:
        async with self.db.db_session() as session:
            session.add(
                Notification(
                    recipient_id=recipient_id,
                    actor_id=actor_id,
                    type=type_,
                    instance_id=instance_id,
                )
            )
            await session.commit()

    async def bump_or_create_message(
        self,
        recipient_id: uuid.UUID,
        actor_id: uuid.UUID,
    ) -> None:
        """Агрегирует уведомления о сообщениях: если у получателя уже есть
        непрочитанное MESSAGE-уведомление от этого актора — просто поднимаем его
        наверх ленты (обновляем created_at) и держим непрочитанным, вместо того
        чтобы плодить по строке на каждое сообщение. Иначе создаём одно.
        Результат — ровно одна строка «X написал вам сообщение» на диалог."""
        async with self.db.db_session() as session:
            existing = (
                update(Notification)
                .where(
                    Notification.recipient_id == recipient_id,
                    Notification.actor_id == actor_id,
                    Notification.type == NotificationTypeEnum.MESSAGE,
                    Notification.is_read.is_(False),
                )
                .values(created_at=datetime.datetime.now(datetime.UTC))
            )
            result = await session.execute(existing)
            if result.rowcount == 0:
                session.add(
                    Notification(
                        recipient_id=recipient_id,
                        actor_id=actor_id,
                        type=NotificationTypeEnum.MESSAGE,
                    )
                )
            await session.commit()

    async def mark_read_from_actor(
        self,
        recipient_id: uuid.UUID,
        actor_id: uuid.UUID,
        type_: NotificationTypeEnum,
    ) -> None:
        """Помечает прочитанными уведомления заданного типа от конкретного
        актора — например, когда получатель открыл диалог, message-уведомления
        от собеседника в колокольчике тоже должны погаснуть."""
        async with self.db.db_session() as session:
            stmt = (
                update(Notification)
                .where(
                    Notification.recipient_id == recipient_id,
                    Notification.actor_id == actor_id,
                    Notification.type == type_,
                    Notification.is_read.is_(False),
                )
                .values(is_read=True)
            )
            await session.execute(stmt)
            await session.commit()

    async def list_for_recipient(
        self,
        recipient_id: uuid.UUID,
        limit: int = 30,
    ) -> list[tuple[Notification, User, str | None]]:
        """Лента уведомлений с актором и названием коробки (для лайков),
        новые сверху. Один запрос с join — без N+1."""
        actor = aliased(User)
        async with self.db.db_session() as session:
            stmt = (
                select(Notification, actor, BoxTemplate.title)
                .join(actor, Notification.actor_id == actor.id)
                .outerjoin(BoxInstance, Notification.instance_id == BoxInstance.id)
                .outerjoin(BoxTemplate, BoxInstance.template_id == BoxTemplate.id)
                .where(Notification.recipient_id == recipient_id)
                .order_by(Notification.created_at.desc())
                .limit(limit)
            )
            rows = (await session.execute(stmt)).all()
            return [(row[0], row[1], row[2]) for row in rows]

    async def count_unread(self, recipient_id: uuid.UUID) -> int:
        async with self.db.db_session() as session:
            stmt = (
                select(func.count())
                .select_from(Notification)
                .where(
                    Notification.recipient_id == recipient_id,
                    Notification.is_read.is_(False),
                )
            )
            return (await session.execute(stmt)).scalar_one()

    async def mark_all_read(self, recipient_id: uuid.UUID) -> None:
        async with self.db.db_session() as session:
            stmt = (
                update(Notification)
                .where(
                    Notification.recipient_id == recipient_id,
                    Notification.is_read.is_(False),
                )
                .values(is_read=True)
            )
            await session.execute(stmt)
            await session.commit()
