import uuid

from fastapi import Depends
from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import joinedload

from stellage.apps.profile.schemas import ProfileStats
from stellage.core.core_dependencies.db_dependency import DBDependency
from stellage.core.core_dependencies.redis_dependency import RedisDependency
from stellage.database.enums.visibility import VisibilityEnum
from stellage.database.models import BoxInstance, BoxTemplate, CoinGift, Shelf, User


class ProfileManager:
    def __init__(
        self,
        db: DBDependency = Depends(DBDependency),
        redis: RedisDependency = Depends(RedisDependency),
    ) -> None:
        self.db = db
        self.redis = redis
        self.user_model = User

    async def update_user_fields(
        self,
        user_id: uuid.UUID | str,
        **kwargs,
    ) -> None:
        async with self.db.db_session() as session:
            query = (
                update(
                    self.user_model
                )
                .where(self.user_model.id == user_id)
                .values(**kwargs)
            )
            await session.execute(query)
            await session.commit()


    async def search_users(
        self,
        query: str,
        limit: int = 20,
    ) -> list[User]:
        # Поиск по username и nickname (регистронезависимо, по подстроке).
        pattern = f"%{query}%"
        async with self.db.db_session() as session:
            stmt = (
                select(self.user_model)
                .where(
                    or_(
                        self.user_model.username.ilike(pattern),
                        self.user_model.nickname.ilike(pattern),
                    )
                )
                .order_by(self.user_model.username.asc())
                .limit(limit)
            )
            result = await session.execute(stmt)
            return list(result.scalars().all())


    async def get_avatar_key(
        self,
        user_id: uuid.UUID | str,
    ) -> str | None:
        async with self.db.db_session() as session:
            query = (
                select(self.user_model.avatar_key)
                .where(self.user_model.id == user_id)
            )
            result = await session.execute(query)
            return result.scalar()

    async def get_banner_key(
        self,
        user_id: uuid.UUID | str,
    ) -> str | None:
        async with self.db.db_session() as session:
            query = (
                select(self.user_model.banner_key)
                .where(self.user_model.id == user_id)
            )
            result = await session.execute(query)
            return result.scalar()


    async def get_user_stats(
        self,
        user_id: uuid.UUID | str,
    ) -> ProfileStats:
        """Счётчики для витрины профиля: всего коробок, публичных коробок на
        публичных полках (то, что реально видно другим) и число полок."""
        async with self.db.db_session() as session:
            boxes_total = (
                await session.execute(
                    select(func.count())
                    .select_from(BoxInstance)
                    .where(BoxInstance.user_id == user_id)
                )
            ).scalar_one()

            public_boxes = (
                await session.execute(
                    select(func.count())
                    .select_from(BoxInstance)
                    .join(Shelf, BoxInstance.shelf_id == Shelf.id)
                    .where(
                        BoxInstance.user_id == user_id,
                        BoxInstance.is_public == VisibilityEnum.PUBLIC,
                        Shelf.is_public.is_(True),
                    )
                )
            ).scalar_one()

            shelves_total = (
                await session.execute(
                    select(func.count())
                    .select_from(Shelf)
                    .where(Shelf.user_id == user_id)
                )
            ).scalar_one()

            return ProfileStats(
                boxes=boxes_total,
                public_boxes=public_boxes,
                shelves=shelves_total,
            )


    async def get_user_by_username(
        self,
        username: str,
    ) -> User | None:
        async with self.db.db_session() as session:
            stmt = (
                select(self.user_model)
                .where(self.user_model.username == username)
            )
            result = await session.execute(stmt)
            return result.scalar_one_or_none()


    async def get_user_by_id(
        self,
        user_id: uuid.UUID | str,
    ) -> User | None:
        async with self.db.db_session() as session:
            stmt = (
                select(self.user_model)
                .where(self.user_model.id == user_id)
            )
            result = await session.execute(stmt)
            return result.scalar_one_or_none()


    async def is_email_taken(
        self,
        email: str,
        exclude_user_id: uuid.UUID | str,
    ) -> bool:
        async with self.db.db_session() as session:
            query = (
                select(self.user_model.id)
                .where(
                    self.user_model.email == email,
                    self.user_model.id != exclude_user_id,
                )
            )
            result = await session.execute(query)
            return result.scalar() is not None


    async def is_username_taken(
        self,
        username: str,
        exclude_user_id: uuid.UUID | str,
    ) -> bool:
        async with self.db.db_session() as session:
            query = (
                select(self.user_model.id)
                .where(
                    self.user_model.username == username,
                    self.user_model.id != exclude_user_id,
                )
            )
            result = await session.execute(query)
            return result.scalar() is not None


    async def get_user_hashed_password(
        self,
        user_id: uuid.UUID | None
    ) -> str | None:
        async with self.db.db_session() as session:
            query = (
                select(
                    self.user_model.hashed_password
                )
                .where(self.user_model.id == user_id)
            )
            result = await session.execute(query)
            return result.scalar()


    async def revoke_all_sessions(
        self,
        user_id: uuid.UUID | str,
        keep_session_id: str | None = None,
    ) -> None:
        """Отзывает access/refresh-сессии пользователя (после смены пароля):
        удаляет ключи {user_id}:* и refresh:{user_id}:*. Так угнанная сессия
        перестаёт действовать сразу, а не живёт до истечения TTL. keep_session_id
        (текущая сессия) сохраняется, чтобы не разлогинивать самого инициатора."""
        keep = set()
        if keep_session_id is not None:
            keep = {
                f"{user_id}:{keep_session_id}",
                f"refresh:{user_id}:{keep_session_id}",
            }
        patterns = (f"{user_id}:*", f"refresh:{user_id}:*")
        async with self.redis.get_client() as client:
            for pattern in patterns:
                keys = [
                    key
                    async for key in client.scan_iter(match=pattern)
                    if key not in keep
                ]
                if keys:
                    await client.delete(*keys)


    @staticmethod
    def _email_change_key(user_id: uuid.UUID | str) -> str:
        # Ключ привязан к пользователю: код смены e-mail действует ТОЛЬКО для
        # того, кто его запросил. Раньше ключом был сам код (глобальный) — любой
        # активный код срабатывал для любого юзера → перехват чужого e-mail.
        return f"email_change:{user_id}"

    async def store_email_change(
        self,
        user_id: uuid.UUID | str,
        new_email: str,
        confirmation_code: str,
    ) -> None:
        async with self.redis.get_client() as client:
            await client.hset(
                self._email_change_key(user_id),
                mapping={"code": confirmation_code, "email": new_email},
            )
            await client.expire(self._email_change_key(user_id), 3600)

    async def get_email_change(
        self,
        user_id: uuid.UUID | str,
    ) -> tuple[str, str] | None:
        """Возвращает (код, новый e-mail) незавершённой смены этого пользователя."""
        async with self.redis.get_client() as client:
            data = await client.hgetall(self._email_change_key(user_id))
        if not data or "code" not in data or "email" not in data:
            return None
        return data["code"], data["email"]

    async def remove_email_change(
        self,
        user_id: uuid.UUID | str,
    ) -> None:
        async with self.redis.get_client() as client:
            await client.delete(self._email_change_key(user_id))

    async def get_user_gifts(
        self,
        user_id: uuid.UUID | str,
        include_private: bool = False,
    ) -> list[BoxInstance]:
        """Возвращает список коробок-подарков пользователя с предзагруженными
        данными шаблона и отправителя (gifted_by)."""
        async with self.db.db_session() as session:
            stmt = (
                select(BoxInstance)
                .options(
                    joinedload(BoxInstance.template),
                    joinedload(BoxInstance.gifted_by),
                )
                .where(
                    BoxInstance.user_id == user_id,
                )
            )
            if not include_private:
                stmt = stmt.where(BoxInstance.is_gift_public.is_(True))
            stmt = stmt.order_by(BoxInstance.created_at.desc())
            result = await session.execute(stmt)
            return list(result.scalars().all())

    async def toggle_gift_visibility(
        self,
        instance_id: uuid.UUID | str,
        user_id: uuid.UUID | str,
        is_gift_public: bool,
    ) -> None:
        async with self.db.db_session() as session:
            stmt = (
                update(BoxInstance)
                .where(
                    BoxInstance.id == instance_id,
                    BoxInstance.user_id == user_id,
                )
                .values(is_gift_public=is_gift_public)
            )
            await session.execute(stmt)
            await session.commit()

    async def create_coin_gift(
        self,
        sender_id: uuid.UUID,
        recipient_id: uuid.UUID,
        amount: int,
    ) -> CoinGift:
        """Создает запись подарка Stellacoin в БД."""
        async with self.db.db_session() as session:
            gift = CoinGift(
                sender_id=sender_id,
                recipient_id=recipient_id,
                amount=amount,
                is_gift_public=True,
            )
            session.add(gift)
            await session.commit()
            await session.refresh(gift)
            return gift

    async def get_user_coin_gifts(
        self,
        user_id: uuid.UUID | str,
        include_private: bool = False,
    ) -> list[CoinGift]:
        """Возвращает подарки Stellacoin пользователя."""
        async with self.db.db_session() as session:
            stmt = (
                select(CoinGift)
                .options(joinedload(CoinGift.sender))
                .where(CoinGift.recipient_id == user_id)
            )
            if not include_private:
                stmt = stmt.where(CoinGift.is_gift_public.is_(True))
            stmt = stmt.order_by(CoinGift.created_at.desc())
            result = await session.execute(stmt)
            return list(result.scalars().all())