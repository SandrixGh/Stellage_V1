import uuid

from fastapi import Depends
from sqlalchemy import update, select

from stellage.apps.profile.schemas import ConfirmationCodeRequest
from stellage.core.core_dependencies.db_dependency import DBDependency
from stellage.core.core_dependencies.redis_dependency import RedisDependency
from stellage.database.models import User


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


    async def store_confirmation_code(
        self,
        confirmation_code_request: ConfirmationCodeRequest
    ) -> None:
        async with self.redis.get_client() as client:
            return await client.set(
                f"{confirmation_code_request.confirmation_code}",
                confirmation_code_request.email
            )


    async def get_new_email_by_confirmation_code(
        self,
        confirmation_code: str,
    ) -> str | None:
        async with self.redis.get_client() as client:
            return await client.get(f"{confirmation_code}")


    async def remove_confirmation_code(
        self,
        confirmation_code: str
    ) -> None:
        async with self.redis.get_client() as client:
            return await client.delete(f"{confirmation_code}")