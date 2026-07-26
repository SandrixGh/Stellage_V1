import datetime
import uuid
from typing import TYPE_CHECKING, Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, StringConstraints

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
    bio: Annotated[
        str | None,
        StringConstraints(
            max_length=280,
            strip_whitespace=True,
        )
    ] = None


class AvatarInitiateRequest(BaseModel):
    mime: Annotated[str, StringConstraints(min_length=3, max_length=100)]
    size_bytes: int


class AvatarUploadTarget(BaseModel):
    """Разовая presigned POST-цель для загрузки аватара. Не хранить и не
    логировать — key/mime/size_bytes нужны фронту для последующего complete."""
    key: str
    url: str
    fields: dict[str, str]
    expires_in: int
    mime: str
    size_bytes: int


class AvatarCompleteRequest(BaseModel):
    key: str
    mime: Annotated[str, StringConstraints(min_length=3, max_length=100)]
    size_bytes: int


class ProfileStats(BaseModel):
    """Счётчики для витрины профиля."""
    boxes: int = 0
    public_boxes: int = 0
    shelves: int = 0


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
    bio: str | None = None
    # Presigned GET на аватар (живёт минуты); None — аватар не загружен.
    avatar_url: str | None = None
    last_seen_at: datetime.datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class PublicProfile(PublicUser):
    """Публичный профиль: карточка + главный публичный стеллаж + статистика."""
    stats: ProfileStats = ProfileStats()
    shelf: "ShelfWithBoxInstances | None" = None


from stellage.apps.shelves.schemas import ShelfWithBoxInstances

PublicProfile.model_rebuild()