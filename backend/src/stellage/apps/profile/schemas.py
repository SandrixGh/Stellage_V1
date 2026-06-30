import datetime
import uuid
from typing import Annotated, TYPE_CHECKING
from pydantic import EmailStr, BaseModel, StringConstraints, ConfigDict

if TYPE_CHECKING:
    from stellage.apps.shelves.schemas import ShelfWithBoxInstances


class ChangeEmailRequest(BaseModel):
    new_email: EmailStr


class ConfirmationCodeRequest(BaseModel):
    email: EmailStr
    confirmation_code: str


class UpdateProfileRequest(BaseModel):
    username: Annotated[
        str | None,
        StringConstraints(
            min_length=3,
            max_length=30,
            strip_whitespace=True,
            pattern=r'^[a-z0-9_]+$',
        )
    ] = None
    nickname: Annotated[
        str | None,
        StringConstraints(
            max_length=50,
            strip_whitespace=True,
        )
    ] = None


class ChangePasswordRequest(BaseModel):
    old_password: Annotated[
        str,
        StringConstraints(
            min_length=8,
            max_length=128,
        )
    ]
    new_password: Annotated[
        str,
        StringConstraints(
            min_length=8,
            max_length=128,
        )
    ]


class PublicUser(BaseModel):
    """Публичная карточка пользователя — без email и прочей PII."""
    id: uuid.UUID
    username: str | None = None
    nickname: str | None = None
    last_seen_at: datetime.datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class PublicProfile(PublicUser):
    """Публичный профиль: карточка пользователя + его главный публичный стеллаж."""
    shelf: "ShelfWithBoxInstances | None" = None


from stellage.apps.shelves.schemas import ShelfWithBoxInstances
PublicProfile.model_rebuild()