from typing import Annotated
from pydantic import EmailStr, BaseModel, StringConstraints


class ChangeEmailRequest(BaseModel):
    new_email: EmailStr


class ConfirmationCodeRequest():
    email: EmailStr
    confirmation_code: str


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