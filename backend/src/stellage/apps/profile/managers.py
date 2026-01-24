import uuid

from fastapi import Depends
from sqlalchemy.orm.sync import update

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
            query =(
                update(
                    self.user_model
                )
                .where(self.user_model.id == user_id)
                .values(**kwargs)
            )
            await session.execute(query)
            await session.commit()
