from typing import TYPE_CHECKING
import datetime
import uuid
from decimal import Decimal

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
    # NULL = шаблон платформы; иначе id пользователя-создателя коробки.
    creator_id: uuid.UUID | None = None


class BoxTemplateReturn(GetBoxTemplateById, BoxTemplateBase, BoxTemplateTimeStamps):
    # Имя автора коробки (username или local-part email). None — коробка платформы.
    owner_username: str | None = None

    model_config = ConfigDict(
        from_attributes=True
    )

class BoxTemplateReturnWithInstances(BoxTemplateReturn):
    instances: list["BoxInstanceReturn"] = []


from stellage.apps.boxes.instances.schemas import BoxInstanceReturn
BoxTemplateReturnWithInstances.model_rebuild()