import datetime
import uuid
from typing import Annotated

from pydantic import BaseModel, EmailStr, StringConstraints


class GetUserByID(BaseModel):
    id: uuid.UUID | str


class GetUserByEmail(BaseModel):
    email: EmailStr


class AuthUser(GetUserByEmail):
    password: Annotated[str, StringConstraints(
        min_length=8,
        max_length=128,
    )]


class CreateUser(GetUserByEmail):
    hashed_password: str


class UserReturnData(GetUserByID, GetUserByEmail):
    is_active: bool = False
    is_verified: bool = False
    is_superuser: bool = False
    created_at: datetime.datetime
    updated_at: datetime.datetime


class GetUserWithIDAndEmail(GetUserByID, CreateUser):
    pass