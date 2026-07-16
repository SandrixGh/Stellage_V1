import datetime
import uuid
from typing import Annotated

from fastapi import Depends
from sqlalchemy import select, func, update, or_, and_, case

from stellage.core.core_dependencies.db_dependency import DBDependency
from stellage.database.models import Message, User


class MessageRepository:
    def __init__(
        self,
        db: Annotated[DBDependency, Depends(DBDependency)],
    ) -> None:
        self.db = db

    async def create(
        self,
        sender_id: uuid.UUID,
        recipient_id: uuid.UUID,
        text: str,
    ) -> Message:
        async with self.db.db_session() as session:
            msg = Message(
                sender_id=sender_id,
                recipient_id=recipient_id,
                text=text,
            )
            session.add(msg)
            await session.commit()
            await session.refresh(msg)
            return msg

    async def get_conversation(
        self,
        user_id: uuid.UUID,
        partner_id: uuid.UUID,
        limit: int = 100,
    ) -> list[Message]:
        """Лента диалога между двумя пользователями, старые сверху."""
        async with self.db.db_session() as session:
            stmt = (
                select(Message)
                .where(
                    or_(
                        and_(
                            Message.sender_id == user_id,
                            Message.recipient_id == partner_id,
                        ),
                        and_(
                            Message.sender_id == partner_id,
                            Message.recipient_id == user_id,
                        ),
                    )
                )
                .order_by(Message.created_at.asc())
                .limit(limit)
            )
            return list((await session.execute(stmt)).scalars())

    async def list_conversations(
        self,
        user_id: uuid.UUID,
    ) -> list[tuple[User, str, datetime.datetime, int]]:
        """Список диалогов: собеседник, последнее сообщение, его время и число
        непрочитанных (для текущего пользователя). Собеседник — «другой» участник
        каждого сообщения; берём по нему последнее сообщение."""
        async with self.db.db_session() as session:
            # id собеседника для каждого сообщения = тот, кто не текущий юзер.
            partner_id = case(
                (Message.sender_id == user_id, Message.recipient_id),
                else_=Message.sender_id,
            ).label("partner_id")

            # Последнее сообщение диалога по времени: сгруппируем по partner_id.
            base = (
                select(
                    partner_id,
                    Message.text,
                    Message.created_at,
                    Message.recipient_id,
                    Message.is_read,
                )
                .where(
                    or_(
                        Message.sender_id == user_id,
                        Message.recipient_id == user_id,
                    )
                )
            ).subquery()

            # Максимальное время диалога с каждым собеседником.
            last_at = (
                select(
                    base.c.partner_id,
                    func.max(base.c.created_at).label("last_at"),
                )
                .group_by(base.c.partner_id)
                .subquery()
            )

            # Число непрочитанных мной сообщений от каждого собеседника.
            unread = (
                select(
                    base.c.partner_id,
                    func.count().label("unread"),
                )
                .where(
                    base.c.recipient_id == user_id,
                    base.c.is_read.is_(False),
                )
                .group_by(base.c.partner_id)
                .subquery()
            )

            stmt = (
                select(
                    User,
                    base.c.text,
                    base.c.created_at,
                    func.coalesce(unread.c.unread, 0),
                )
                .join(last_at, last_at.c.partner_id == base.c.partner_id)
                .join(
                    User,
                    User.id == base.c.partner_id,
                )
                .outerjoin(unread, unread.c.partner_id == base.c.partner_id)
                .where(base.c.created_at == last_at.c.last_at)
                .order_by(base.c.created_at.desc())
            )
            rows = (await session.execute(stmt)).all()
            return [(r[0], r[1], r[2], r[3]) for r in rows]

    async def mark_read(
        self,
        user_id: uuid.UUID,
        partner_id: uuid.UUID,
    ) -> None:
        """Помечает прочитанными сообщения, где я получатель, а собеседник —
        отправитель (открыл диалог)."""
        async with self.db.db_session() as session:
            stmt = (
                update(Message)
                .where(
                    Message.recipient_id == user_id,
                    Message.sender_id == partner_id,
                    Message.is_read.is_(False),
                )
                .values(is_read=True)
            )
            await session.execute(stmt)
            await session.commit()

    async def count_unread(self, user_id: uuid.UUID) -> int:
        async with self.db.db_session() as session:
            stmt = (
                select(func.count())
                .select_from(Message)
                .where(
                    Message.recipient_id == user_id,
                    Message.is_read.is_(False),
                )
            )
            return (await session.execute(stmt)).scalar_one()
