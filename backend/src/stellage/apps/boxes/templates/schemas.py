import datetime
import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict

from stellage.database.enums.box_rarity import BoxRarity
from stellage.database.enums.currency import CurrencyEnum

if TYPE_CHECKING:
    from stellage.apps.boxes.instances.schemas import BoxInstanceReturn

class GetBoxTemplateById(BaseModel):
    id: uuid.UUID


class BoxTemplateTimeStamps(BaseModel):
    created_at: datetime.datetime
    updated_at: datetime.datetime


class BoxTemplateBase(BaseModel):
    title: str
    description: str | None = None
    price: Decimal
    currency: CurrencyEnum = CurrencyEnum.RUB
    rarity: BoxRarity = BoxRarity.COMMON


class BoxTemplateCreate(BoxTemplateBase):
    pass


class BoxTemplatePatch(BaseModel):
    title: str | None = None
    description: str | None = None
    price: Decimal | None = None
    currency: CurrencyEnum | None = None
    rarity: BoxRarity | None = None


class BoxTemplateReturn(GetBoxTemplateById, BoxTemplateBase, BoxTemplateTimeStamps):
    owner_username: str | None = None
    owner_nickname: str | None = None
    owner_avatar_url: str | None = None
    creator_id: uuid.UUID | None = None
    likes_count: int = 0
    comments_count: int = 0

    model_config = ConfigDict(
        from_attributes=True
    )

class BoxTemplateReturnWithInstances(BoxTemplateReturn):
    instances: list["BoxInstanceReturn"] = []


from stellage.apps.boxes.instances.schemas import BoxInstanceReturn

BoxTemplateReturnWithInstances.model_rebuild()