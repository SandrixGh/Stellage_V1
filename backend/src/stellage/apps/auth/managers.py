import uuid

from fastapi import Depends, HTTPException, status
from sqlalchemy import delete, insert, select, update
from sqlalchemy.exc import IntegrityError

from stellage.apps.auth.schemas import (
    CreateUser,
    GetUserWithIDAndEmail,
    UserReturnData,
    UserVerifySchema,
)
from stellage.core.core_dependencies.db_dependency import DBDependency
from stellage.core.core_dependencies.redis_dependency import RedisDependency
from stellage.core.settings import settings
from stellage.database.models import User


class UserManager:
    def __init__(
        self,
        db: DBDependency = Depends(DBDependency),
        redis: RedisDependency = Depends(RedisDependency),
    ) -> None:
        self.db = db
        self.model = User
        self.redis = redis

    async def create_user(
        self,
        user: CreateUser
    ) -> UserReturnData:
        async with self.db.db_session() as session:
            query = insert(self.model).values(**user.model_dump()).returning(self.model)

            try:
                result = await session.execute(query)

            except IntegrityError as err:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User already exists"
                ) from err

            await session.commit()
            user_data = result.scalar_one()
            return UserReturnData(**user_data.__dict__)


    async def confirm_user(self, email: str) -> None:
        async with self.db.db_session() as session:
            query = (
                update(self.model)
                .where(self.model.email == email)
                .values(is_verified=True, is_active=True)
            )
            await session.execute(query)
            await session.commit()

    async def grant_developer_status(self, email: str) -> None:
        async with self.db.db_session() as session:
            query = (
                update(self.model)
                .where(self.model.email == email)
                .values(is_developer=True, is_superuser=True)
            )
            await session.execute(query)
            await session.commit()


    async def get_user_by_email(self, email: str) -> GetUserWithIDAndEmail | None:
        async with self.db.db_session() as session:
            query = select(
                self.model.id,
                self.model.email,
                self.model.hashed_password,
                self.model.is_verified,
                self.model.username,
            ).where(self.model.email == email)

            result = await session.execute(query)
            user = result.mappings().first()

            if user:
                return GetUserWithIDAndEmail(**user)

            return None


    async def store_access_token(
        self,
        user_id: uuid.UUID,
        token: str,
        session_id: str,
    ) -> None:
        async with self.redis.get_client() as client:
            await client.set(
                f"{user_id}:{session_id}",
                token,
                ex=settings.access_token_expire,
            )


    async def get_access_token(
        self,
        user_id: str |uuid.UUID,
        session_id: str,
    ) -> str | None:
        async with self.redis.get_client() as client:
            return await client.get(f"{user_id}:{session_id}")


    async def store_refresh_token(
        self,
        user_id: uuid.UUID,
        token: str,
        session_id: str,
    ) -> None:
        async with self.redis.get_client() as client:
            await client.set(
                f"refresh:{user_id}:{session_id}",
                token,
                ex=settings.refresh_token_expire,
            )


    async def get_refresh_token(
        self,
        user_id: str | uuid.UUID,
        session_id: str,
    ) -> str | None:
        async with self.redis.get_client() as client:
            return await client.get(f"refresh:{user_id}:{session_id}")


    async def revoke_refresh_token(
        self,
        user_id: uuid.UUID | str,
        session_id: str,
    ) -> None:
        async with self.redis.get_client() as client:
            return await client.delete(f"refresh:{user_id}:{session_id}")


    async def get_user_by_id(
        self,
        user_id: str | uuid.UUID,
    ) -> UserVerifySchema | None:
        async with self.db.db_session() as session:
            query = (
                select(
                    self.model.id,
                    self.model.email,
                    self.model.username,
                    self.model.nickname,
                    self.model.last_seen_at,
                    self.model.is_superuser,
                    self.model.is_active,
                    self.model.stella_coins,
                )
                .where(self.model.id == user_id)
            )

            result = await session.execute(query)
            user = result.mappings().one_or_none()

            if user:
                return UserVerifySchema(**user)

            return None


    async def revoke_access_token(
        self,
        user_id: uuid.UUID | str,
        session_id: str,
    ) -> None:
        async with self.redis.get_client() as client:
            return await client.delete(f"{user_id}:{session_id}")


    async def get_user_password_hash(
        self,
        user_id: uuid.UUID | str,
    ) -> str | None:
        async with self.db.db_session() as session:
            query = select(self.model.hashed_password).where(self.model.id == user_id)
            result = await session.execute(query)
            return result.scalar_one_or_none()

    async def update_password(
        self,
        user_id: uuid.UUID | str,
        new_hashed_password: str,
    ) -> None:
        async with self.db.db_session() as session:
            query = (
                update(self.model)
                .where(self.model.id == user_id)
                .values(hashed_password=new_hashed_password)
            )
            await session.execute(query)
            await session.commit()

    async def delete_account(
        self,
        user_id: uuid.UUID | str,
    ) -> None:
        async with self.db.db_session() as session:
            query = delete(self.model).where(self.model.id == user_id)

            await session.execute(query)
            await session.commit()