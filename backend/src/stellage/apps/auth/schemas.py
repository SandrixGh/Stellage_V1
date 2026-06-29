import datetime
import uuid
from typing import Annotated, TYPE_CHECKING

from pydantic import BaseModel, EmailStr, StringConstraints

if TYPE_CHECKING:
    from stellage.apps.boxes.instances.schemas import BoxInstanceReturn

class GetUserByID(BaseModel):
    id: uuid.UUID | str


class GetUserByEmail(BaseModel):
    email: EmailStr


class VerificationStatus(BaseModel):
    is_verified: bool = False


class AuthUser(GetUserByEmail):
    password: Annotated[str, StringConstraints(
        min_length=8,
        max_length=128,
    )]
    username: Annotated[str | None, StringConstraints(
        min_length=3,
        max_length=30,
        strip_whitespace=True,
    )] = None


class CreateUser(GetUserByEmail):
    hashed_password: str
    username: str | None = None


class UserReturnData(GetUserByID, GetUserByEmail, VerificationStatus):
    is_active: bool = False
    is_superuser: bool = False
    created_at: datetime.datetime
    updated_at: datetime.datetime


class GetUserWithIDAndEmail(GetUserByID, CreateUser, VerificationStatus):
    pass


class UserVerifySchema(GetUserByID, GetUserByEmail):
    session_id: str | uuid.UUID | None = None


class UserWithBoxInstances(UserReturnData):
    boxes: list["BoxInstanceReturn"] = []


from stellage.apps.boxes.instances.schemas import BoxInstanceReturn
UserWithBoxInstances.model_rebuild()