from typing import TYPE_CHECKING
import datetime
import uuid
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from stellage.database.enums.box_rarity import BoxRarity
from stellage.database.enums.currency import CurrencyEnum

if TYPE_CHECKING:
    from stellage.apps.boxes.instance_schemas import BoxInstanceReturn

class GetBoxTemplateById(BaseModel):
    id: uuid.UUID


class BoxTemplateTimeStamps(BaseModel):
    created_at: datetime
    updated_at: datetime


class BoxTemplateBase(BaseModel):
    title: str
    description: str | None = None
    price: Decimal
    currency: CurrencyEnum = CurrencyEnum.RUB
    rarity: BoxRarity = BoxRarity.COMMON


class BoxTemplateCreate(BoxTemplateBase):
    pass


class BoxTemplateReturn(GetBoxTemplateById, BoxTemplateBase, BoxTemplateTimeStamps):
    model_config = ConfigDict(
        from_attributes=True
    )

class BoxTemplateReturnWithInstances(BoxTemplateReturn):
    instances: list["BoxInstanceReturn"] = []