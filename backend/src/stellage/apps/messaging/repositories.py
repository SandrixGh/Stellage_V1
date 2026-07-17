import datetime
import uuid
from typing import Annotated

from fastapi import Depends
from sqlalchemy import select, func, update, delete, or_, and_, case, tuple_

from stellage.core.core_dependencies.db_dependency import DBDependency
from stellage.database.enums.asset_kind import AssetKindEnum
from stellage.database.enums.message_kind import MessageKindEnum
from stellage.database.models import Message, User, BoxInstance, BoxTemplate


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
        text: str | None = None,
        kind: MessageKindEnum = MessageKindEnum.TEXT,
        gift_instance_id: uuid.UUID | None = None,
    ) -> Message:
        async with self.db.db_session() as session:
            msg = Message(
                sender_id=sender_id,
                recipient_id=recipient_id,
                text=text,
                kind=kind,
                gift_instance_id=gift_instance_id,
            )
            session.add(msg)
            await session.commit()
            await session.refresh(msg)
            return msg

    async def create_pending_attachment(
        self,
        message_id: uuid.UUID,
        sender_id: uuid.UUID,
        recipient_id: uuid.UUID,
        asset_key: str,
        asset_mime: str,
        asset_kind: AssetKindEnum,
        asset_name: str,
        asset_size: int,
    ) -> Message:
        """Создаёт «черновик» сообщения-вложения с заранее известным id (он входит
        в S3-ключ). Помечается прочитанным до complete (is_read=True), чтобы
        недозагруженное вложение не светилось получателю как непрочитанное;
        complete переведёт в непрочитанное. attachment_pending=True — маркер
        неподтверждённого черновика для идемпотентного complete."""
        async with self.db.db_session() as session:
            msg = Message(
                id=message_id,
                sender_id=sender_id,
                recipient_id=recipient_id,
                text=None,
                kind=MessageKindEnum.TEXT,
                is_read=True,
                attachment_pending=True,
                asset_key=asset_key,
                asset_mime=asset_mime,
                asset_kind=asset_kind,
                asset_name=asset_name,
                asset_size=asset_size,
            )
            session.add(msg)
            await session.commit()
            await session.refresh(msg)
            return msg

    async def finalize_attachment(
        self,
        message_id: uuid.UUID,
        sender_id: uuid.UUID,
        caption: str | None,
    ) -> Message | None:
        """Завершает черновик вложения: выставляет caption и делает сообщение
        непрочитанным для получателя. Идемпотентно: финализирует ТОЛЬКО ещё
        pending-черновик (attachment_pending=True) и снимает флаг. Повторный
        вызов не найдёт pending-строку и вернёт None — уведомление и сброс
        is_read не повторятся. Фильтр по sender_id — только своё."""
        async with self.db.db_session() as session:
            stmt = (
                update(Message)
                .where(
                    Message.id == message_id,
                    Message.sender_id == sender_id,
                    Message.attachment_pending.is_(True),
                )
                .values(text=caption, is_read=False, attachment_pending=False)
                .returning(Message)
            )
            result = await session.execute(stmt)
            await session.commit()
            return result.scalar_one_or_none()

    async def get_owned(
        self,
        message_id: uuid.UUID,
        sender_id: uuid.UUID,
    ) -> Message | None:
        """Сообщение по id, если оно принадлежит sender_id (для правки/удаления)."""
        async with self.db.db_session() as session:
            stmt = select(Message).where(
                Message.id == message_id,
                Message.sender_id == sender_id,
            )
            return (await session.execute(stmt)).scalar_one_or_none()

    async def get_for_participant(
        self,
        message_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Message | None:
        """Сообщение, если user_id — один из двух участников (для просмотра
        вложения). Иначе None."""
        async with self.db.db_session() as session:
            stmt = select(Message).where(
                Message.id == message_id,
                or_(
                    Message.sender_id == user_id,
                    Message.recipient_id == user_id,
                ),
            )
            return (await session.execute(stmt)).scalar_one_or_none()

    async def update_text(
        self,
        message_id: uuid.UUID,
        sender_id: uuid.UUID,
        text: str,
    ) -> Message | None:
        """Редактирует текст своего сообщения, ставит edited_at."""
        async with self.db.db_session() as session:
            stmt = (
                update(Message)
                .where(Message.id == message_id, Message.sender_id == sender_id)
                .values(text=text, edited_at=datetime.datetime.now(datetime.UTC))
                .returning(Message)
            )
            result = await session.execute(stmt)
            await session.commit()
            return result.scalar_one_or_none()

    async def hard_delete(
        self,
        message_id: uuid.UUID,
        sender_id: uuid.UUID,
    ) -> int:
        """Жёстко удаляет своё сообщение (исчезает у обоих участников).
        Возвращает число удалённых строк (0 — не своё/не найдено)."""
        async with self.db.db_session() as session:
            stmt = delete(Message).where(
                Message.id == message_id,
                Message.sender_id == sender_id,
            )
            result = await session.execute(stmt)
            await session.commit()
            return result.rowcount

    async def get_conversation(
        self,
        user_id: uuid.UUID,
        partner_id: uuid.UUID,
        limit: int = 40,
        before: datetime.datetime | None = None,
        before_id: uuid.UUID | None = None,
    ) -> list[Message]:
        """Страница ленты диалога, старые сверху. Курсор keyset по составному
        ключу (created_at, id) — берём сообщения строго «раньше» курсора в этом
        порядке. Составной ключ, а не только created_at, чтобы совпадающие метки
        времени (gift + текст в одной транзакции) не терялись и не дублировались
        на границе страниц. Тянем последние limit до курсора, затем разворачиваем."""
        async with self.db.db_session() as session:
            conditions = [
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
            ]
            if before is not None:
                if before_id is not None:
                    # Строгое сравнение кортежей: (created_at, id) < (before, before_id).
                    conditions.append(
                        tuple_(Message.created_at, Message.id)
                        < tuple_(before, before_id)
                    )
                else:
                    # Обратная совместимость: курсор только по времени.
                    conditions.append(Message.created_at < before)

            # Тянем последние limit сообщений (новые), потом разворачиваем.
            stmt = (
                select(Message)
                .where(*conditions)
                .order_by(Message.created_at.desc(), Message.id.desc())
                .limit(limit)
            )
            rows = list((await session.execute(stmt)).scalars())
            rows.reverse()
            return rows

    async def list_conversations(
        self,
        user_id: uuid.UUID,
        limit: int = 100,
    ) -> list[tuple[User, str | None, MessageKindEnum, AssetKindEnum | None, datetime.datetime, int]]:
        """Список диалогов: собеседник, текст/тип последнего сообщения, его время
        и число непрочитанных. Текст может быть None (вложение/подарок) — фронт
        покажет заглушку по kind/asset_kind.

        Последнее сообщение диалога выбираем через DISTINCT ON (partner_id) с
        tie-break по (created_at DESC, id DESC): ровно одна строка на диалог даже
        когда у двух сообщений совпал created_at (иначе join по времени плодил
        дубли диалогов). limit защищает от пользователя с тысячами диалогов."""
        async with self.db.db_session() as session:
            partner_id = case(
                (Message.sender_id == user_id, Message.recipient_id),
                else_=Message.sender_id,
            ).label("partner_id")

            base = (
                select(
                    partner_id,
                    Message.id.label("msg_id"),
                    Message.text,
                    Message.kind,
                    Message.asset_kind,
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

            # Последнее сообщение каждого диалога — одна строка на partner_id.
            last = (
                select(
                    base.c.partner_id,
                    base.c.text,
                    base.c.kind,
                    base.c.asset_kind,
                    base.c.created_at,
                )
                .distinct(base.c.partner_id)
                .order_by(
                    base.c.partner_id,
                    base.c.created_at.desc(),
                    base.c.msg_id.desc(),
                )
                .subquery()
            )

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
                    last.c.text,
                    last.c.kind,
                    last.c.asset_kind,
                    last.c.created_at,
                    func.coalesce(unread.c.unread, 0),
                )
                .join(User, User.id == last.c.partner_id)
                .outerjoin(unread, unread.c.partner_id == last.c.partner_id)
                .order_by(last.c.created_at.desc())
                .limit(limit)
            )
            rows = (await session.execute(stmt)).all()
            return [(r[0], r[1], r[2], r[3], r[4], r[5]) for r in rows]

    async def gift_box_title(self, instance_id: uuid.UUID) -> str | None:
        """Название коробки по экземпляру — для подписи карточки подарка."""
        async with self.db.db_session() as session:
            stmt = (
                select(BoxTemplate.title)
                .join(BoxInstance, BoxInstance.template_id == BoxTemplate.id)
                .where(BoxInstance.id == instance_id)
            )
            return (await session.execute(stmt)).scalar_one_or_none()

    async def gift_box_meta(
        self,
        instance_id: uuid.UUID,
    ) -> tuple[str | None, str | None] | None:
        """(title, rarity) коробки-подарка — чтобы в чате нарисовать её визуал.
        None, если экземпляр удалён (gift_instance_id мог занулиться)."""
        async with self.db.db_session() as session:
            stmt = (
                select(BoxTemplate.title, BoxTemplate.rarity)
                .join(BoxInstance, BoxInstance.template_id == BoxTemplate.id)
                .where(BoxInstance.id == instance_id)
            )
            row = (await session.execute(stmt)).first()
            if row is None:
                return None
            return row[0], row[1]

    async def gift_box_meta_many(
        self,
        instance_ids: list[uuid.UUID],
    ) -> dict[uuid.UUID, tuple[str | None, str | None]]:
        """(title, rarity) сразу по нескольким экземплярам — один запрос вместо
        N вызовов gift_box_meta при сериализации страницы ленты. Отсутствующие
        (удалённые) экземпляры в результат не попадут."""
        if not instance_ids:
            return {}
        async with self.db.db_session() as session:
            stmt = (
                select(BoxInstance.id, BoxTemplate.title, BoxTemplate.rarity)
                .join(BoxInstance, BoxInstance.template_id == BoxTemplate.id)
                .where(BoxInstance.id.in_(instance_ids))
            )
            rows = (await session.execute(stmt)).all()
            return {r[0]: (r[1], r[2]) for r in rows}

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
