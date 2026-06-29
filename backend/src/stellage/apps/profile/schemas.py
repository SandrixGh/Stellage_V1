from typing import Annotated
from pydantic import EmailStr, BaseModel, StringConstraints


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