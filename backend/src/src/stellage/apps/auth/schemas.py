import datetime
import uuid
from typing import TYPE_CHECKING, Annotated

from pydantic import BaseModel, EmailStr, StringConstraints

if TYPE_CHECKING:
    from stellage.apps.boxes.instances.schemas import BoxInstanceReturn

class GetUserByID(BaseModel):
    id: uuid.UUID | str


class GetUserByEmail(BaseModel):
    email: EmailStr


class VerificationStatus(BaseModel):
    is_verified: bool = False


class LoginUserSchema(GetUserByEmail):
    password: Annotated[str, StringConstraints(
        min_length=8,
        max_length=128,
    )]


class AuthUser(LoginUserSchema):
    username: Annotated[str | None, StringConstraints(
        min_length=3,
        max_length=30,
        strip_whitespace=True,
    )] = None
    invite_code: Annotated[str, StringConstraints(
        min_length=4,
        max_length=32,
        strip_whitespace=True,
    )]


class ChangePasswordSchema(BaseModel):
    current_password: str
    new_password: Annotated[str, StringConstraints(
        min_length=8,
        max_length=128,
    )]


class CreateUser(GetUserByEmail):
    hashed_password: str
    username: str | None = None
    invited_by_id: uuid.UUID | None = None


class UserReturnData(GetUserByID, GetUserByEmail, VerificationStatus):
    is_active: bool = False
    is_superuser: bool = False
    is_developer: bool = False
    username: str | None = None
    nickname: str | None = None
    last_seen_at: datetime.datetime | None = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    stella_coins: int = 0


class GetUserWithIDAndEmail(GetUserByID, CreateUser, VerificationStatus):
    pass


class UserVerifySchema(GetUserByID, GetUserByEmail):
    session_id: str | uuid.UUID | None = None
    username: str | None = None
    nickname: str | None = None
    bio: str | None = None
    last_seen_at: datetime.datetime | None = None
    is_superuser: bool = False
    is_developer: bool = False
    # Активен ли аккаунт: деактивированный (бан) с живой сессией должен получать
    # 401, а не продолжать работать до истечения TTL токена. Дефолт True держит
    # валидными старые записи в Redis-кэше, где поля ещё не было.
    is_active: bool = True
    stella_coins: int = 0


class DeviceAccount(BaseModel):
    """Один аккаунт, залогиненный на этом устройстве, для меню быстрого
    переключения. Хранится в подписанной cookie (id + session_id) — по ним
    сервер поднимает живую refresh-сессию и перевыпускает cookie без пароля."""
    id: uuid.UUID | str
    session_id: str


class DeviceAccountView(BaseModel):
    """Отображаемая карточка аккаунта устройства (для /auth/sessions)."""
    id: uuid.UUID | str
    email: EmailStr
    username: str | None = None
    nickname: str | None = None
    avatar_url: str | None = None
    is_current: bool = False


class UserWithBoxInstances(UserReturnData):
    boxes: list["BoxInstanceReturn"] = []


from stellage.apps.boxes.instances.schemas import BoxInstanceReturn

UserWithBoxInstances.model_rebuild()