import datetime
import uuid
from typing import Annotated

from pydantic import BaseModel, StringConstraints, ConfigDict


class GetShelfByID(BaseModel):
    id: uuid.UUID


class GetShelfByTitle(BaseModel):
    title: Annotated[
        str,
        StringConstraints(
            min_length=3,
            max_length=100,
            strip_whitespace=True,
        )
    ] = "Мой стеллаж"


class GetShelfWithIdAndTitle(GetShelfByID, GetShelfByTitle):
    pass


class ShelfOwner(BaseModel):
    user_id: uuid.UUID


class GetShelfIdAndTitleAndOwner(GetShelfWithIdAndTitle, ShelfOwner):
    pass


class ShelfFlags(BaseModel):
    is_main: bool = False
    is_public: bool = True


class CreateShelf(GetShelfByTitle, ShelfFlags):
    pass


class UpdateShelf(BaseModel):
    title: Annotated[
        str | None,
        StringConstraints(
            min_length=3,
            max_length=100,
            strip_whitespace=True,
        )
    ] = None
    is_public: bool | None = None


class ShelfReturnData(GetShelfByID, GetShelfByTitle, ShelfOwner, ShelfFlags):
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)