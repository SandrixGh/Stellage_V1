from fastapi import Depends, HTTPException, status
from sqlalchemy import insert, update
from sqlalchemy.exc import IntegrityError

from stellage.apps.auth.schemas import CreateUser, UserReturnData
from stellage.core.core_dependencies.db_dependency import DBDependency
from stellage.database.models import User


class UserManager:
    def __init__(
        self,
        db: DBDependency = Depends(DBDependency)
    ) -> None:
        self.db = db
        self.model = User

    async def create_user(
        self,
        user: CreateUser
    ) -> UserReturnData:
        async with self.db.db_session() as session:
            query = insert(self.model).values(**user.model_dump()).returning(self.model)

            try:
                result = await session.execute(query)

            except IntegrityError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User already exists"
                )

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
