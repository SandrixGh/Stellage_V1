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
    # creator_id НЕ принимается из тела запроса: его проставляет сервер
    # (creator_id=текущий пользователь), иначе клиент мог бы подделать авторство
    # шаблона или выдать его за платформенный (creator_id=null). См. роуты.
    pass


class BoxTemplatePatch(BaseModel):
    """Частичное обновление шаблона коробки. Любое поле опционально —
    меняется только то, что прислано (rarity — только для суперюзеров, см. роут)."""
    title: str | None = None
    description: str | None = None
    price: Decimal | None = None
    currency: CurrencyEnum | None = None
    rarity: BoxRarity | None = None


class BoxTemplateReturn(GetBoxTemplateById, BoxTemplateBase, BoxTemplateTimeStamps):
    # Имя автора коробки (username или local-part email). None — коробка платформы.
    owner_username: str | None = None
    # id создателя — фронт сравнивает с текущим пользователем, чтобы показать
    # действия владельца (редактирование доступно только создателю коробки).
    creator_id: uuid.UUID | None = None

    model_config = ConfigDict(
        from_attributes=True
    )

class BoxTemplateReturnWithInstances(BoxTemplateReturn):
    instances: list["BoxInstanceReturn"] = []


from stellage.apps.boxes.instances.schemas import BoxInstanceReturn
BoxTemplateReturnWithInstances.model_rebuild()