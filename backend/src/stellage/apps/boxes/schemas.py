import datetime
import decimal
import uuid
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, StringConstraints, Field, ConfigDict

from stellage.database.enums.box_rarity import BoxRarity
from stellage.database.enums.box_sealing import SealingEnum
from stellage.database.enums.currency import CurrencyEnum
from stellage.database.enums.verification import VerifyEnum
from stellage.database.enums.visibility import VisibilityEnum


class GetBoxById(BaseModel):
    id: uuid.UUID


class GetBoxParentsIds(BaseModel):
    shelf_id: uuid.UUID | None = None
    user_id: uuid.UUID


class BoxPrice(BaseModel):
    currency: CurrencyEnum = CurrencyEnum.RUB
    price: Annotated[
        Decimal,
        Field(
            max_digits=10,
            decimal_places=2,
            ge=0
        )
    ] = Decimal("0.00")

class BoxEnums(BaseModel):
    is_sealed: SealingEnum = SealingEnum.SEALED
    is_public: VisibilityEnum = VisibilityEnum.PUBLIC


class DevEnums(BaseModel):
    is_verified: VerifyEnum = VerifyEnum.NOT_VERIFIED
    rarity: BoxRarity = BoxRarity.COMMON


class BoxContent(BaseModel):
    content: dict | None = None


class BoxInfo(BaseModel):
    title: Annotated[
        str,
        StringConstraints(
            min_length=3,
            max_length=100,
            strip_whitespace=True,
        )
    ]
    description: Annotated[
        str | None,
        StringConstraints(
            max_length=100,
            strip_whitespace=True,
        )
    ] = None


class GetBoxTimestamps(BaseModel):
    created_at: datetime.datetime
    updated_at: datetime.datetime


class CreateBox(
    BoxInfo,
    BoxPrice,
    BoxEnums,
    BoxContent
):
    pass


class UpdateBox(BaseModel):
    title: Annotated[
        str | None,
        StringConstraints(
            min_length=3,
            max_length=100,
            strip_whitespace=True,
        )
    ] = None

    description: Annotated[
        str | None,
        StringConstraints(
            max_length=100,
            strip_whitespace=True,
        )
    ] = None

    currency: CurrencyEnum | None = None

    price: Annotated[
        Decimal | None,
        Field(
            max_digits=10,
            decimal_places=2,
            ge=0
        )
    ] = None

    is_sealed: SealingEnum | None = None
    is_public: VisibilityEnum | None = None

    content: dict | None = None

class BoxReturnData(
    GetBoxById,
    GetBoxParentsIds,
    BoxInfo,
    BoxPrice,
    BoxEnums,
    DevEnums,
    BoxContent,
    GetBoxTimestamps,
):
    model_config = ConfigDict(from_attributes=True)