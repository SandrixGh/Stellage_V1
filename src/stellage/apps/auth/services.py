from fastapi import Depends
from itsdangerous import URLSafeTimedSerializer

from stellage.apps.auth.handlers import AuthHandler
from stellage.apps.auth.managers import UserManager
from stellage.apps.auth.schemas import RegisterUser, CreateUser
from stellage.core.settings import settings

from .tasks import send_confirmation_email

class UserService:
    def __init__(
        self,
        manager: UserManager = Depends(UserManager),
        handler: AuthHandler = Depends(AuthHandler),
    ):
        self.manager = manager
        self.handler = handler
        self.serializer = URLSafeTimedSerializer(secret_key=settings.secret_key.get_secret_value())

    async def register_user(self, user: RegisterUser):
        hashed_password = await self.handler.get_hashed_password(user.password)

        new_user = CreateUser(
            email=user.email,
            hashed_password=hashed_password,
        )

        user_data = await self.manager.create_user(new_user)

        confirmation_token = self.serializer.dumps(user_data.email)
        send_confirmation_email.delay(user_data.email, confirmation_token)

        return user_data