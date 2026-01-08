from fastapi import Depends, HTTPException, status
from itsdangerous import URLSafeTimedSerializer, BadSignature
from starlette.responses import JSONResponse

from stellage.apps.auth.handlers import AuthHandler
from stellage.apps.auth.managers import UserManager
from stellage.apps.auth.schemas import AuthUser, CreateUser, UserReturnData
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

    async def register_user(self, user: AuthUser) -> UserReturnData:
        hashed_password = await self.handler.get_hashed_password(user.password)

        new_user = CreateUser(
            email=user.email,
            hashed_password=hashed_password,
        )

        user_data = await self.manager.create_user(new_user)

        confirmation_token = self.serializer.dumps(user_data.email)
        send_confirmation_email.delay(user_data.email, confirmation_token)

        return user_data


    async def confirm_user(self, token: str) -> None:
        try:
            email = self.serializer.loads(token, max_age=3600)

        except BadSignature:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired token"
            )

        await self.manager.confirm_user(email)


    async def login_user(self, user: AuthUser) -> JSONResponse:
        exist_user = await self.manager.get_user_by_email(email=str(user.email))

        is_invalid_exist_user: bool = (
            exist_user is None
            or not await self.handler.verify_password(
                raw_password=user.password,
                hashed_password=exist_user.hashed_password,
            )
        )

        if is_invalid_exist_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Wrong email or password",
            )

        token, session_id = await self.handler.create_access_token(
            user_id=exist_user.id,
        )

        await self.manager.store_access_token(
            user_id=exist_user.id,
            token=token,
            session_id=session_id,
        )

        response = JSONResponse(content={"message": "Login is successful"})

        response.set_cookie(
            key="Authorization",
            value=token,
            httponly=True,
            max_age=settings.access_token_expire,
        )

        return response

