from fastapi import Depends

from stellage.apps.auth.handlers import AuthHandler
from stellage.apps.auth.managers import UserManager
from stellage.apps.auth.schemas import RegisterUser, CreateUser


class UserService:
    def __init__(
        self,
        manager: UserManager = Depends(UserManager),
        handler: AuthHandler = Depends(AuthHandler),
    ):
        self.manager = manager
        self.handler = handler

    async def register_user(self, user: RegisterUser):
        hashed_password = await self.handler.get_hashed_password(user.password)

        new_user = CreateUser(
            email=user.email,
            hashed_password=hashed_password,
        )

        return await self.manager.create_user(new_user)

