from typing import TYPE_CHECKING
import datetime
import uuid
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from stellage.database.enums.box_rarity import BoxRarity
from stellage.database.enums.box_sealing import SealingEnum
from stellage.database.enums.currency import CurrencyEnum
from stellage.database.enums.verification import VerifyEnum
from stellage.database.enums.visibility import VisibilityEnum

if TYPE_CHECKING:
    from stellage.apps.boxes.templates.schemas import BoxTemplateReturn

class GetBoxInstanceById(BaseModel):
    id: uuid.UUID


class GetShelfId(BaseModel):
    shelf_id: uuid.UUID | None


class GetOwnerId(BaseModel):
    user_id: uuid.UUID


class GetTemplateId(BaseModel):
    template_id: uuid.UUID


class GetParentsIds(
    GetShelfId,
    GetOwnerId,
    GetTemplateId,
):
    pass


class BoxInstanceBase(BaseModel):
    is_sealed: SealingEnum = SealingEnum.SEALED
    is_public: VisibilityEnum = VisibilityEnum.PRIVATE
    is_verified: VerifyEnum = VerifyEnum.NOT_VERIFIED
    content: dict | None = None


class BoxInstanceTimeStamps(BaseModel):
    created_at: datetime.datetime
    updated_at: datetime.datetime


class BoxInstanceReturn(
    GetBoxInstanceById,
    GetParentsIds,
    BoxInstanceBase,
    BoxInstanceTimeStamps
):
    serial_number: int
    shelf_row: int | None = None
    shelf_col: int | None = None
    model_config = ConfigDict(from_attributes=True)


class BoxInstanceWithTemplate(BoxInstanceReturn):
    template: "BoxTemplateReturn"


class BoxPositionUpdate(BaseModel):
    shelf_row: int
    shelf_col: int


class BoxInstanceUpdate(BaseModel):
    shelf_id: uuid.UUID | None = None
    is_sealed: SealingEnum | None = None
    is_public: VisibilityEnum | None = None
    content: dict | None = None


class BoxInstanceCreate(BoxInstanceBase, GetTemplateId, GetShelfId):
    pass


class BoxUpdate(BaseModel):
    """Частичное редактирование коробки владельцем: поля шаблона (title/description/
    price/currency, rarity — только суперюзеру) + content экземпляра. Любое поле
    опционально; content различаем по model_fields_set, чтобы не затереть его None."""
    title: str | None = None
    description: str | None = None
    price: Decimal | None = None
    currency: CurrencyEnum | None = None
    rarity: BoxRarity | None = None
    content: dict | None = None


class CustomBoxCreate(BaseModel):
    """Создание пользовательской коробки: новый шаблон + 1 экземпляр в инвентарь.

    Редкость по умолчанию COMMON. Запрошенная клиентом rarity применяется только
    для суперюзеров — обычным пользователям бэкенд форсит COMMON (см. роут).
    Готовый экземпляр кладётся в инвентарь (shelf_id=None).
    """
    title: str
    description: str | None = None
    price: Decimal = Decimal("0")
    currency: CurrencyEnum = CurrencyEnum.RUB
    content: dict | None = None
    rarity: BoxRarity | None = None


from stellage.apps.boxes.templates.schemas import BoxTemplateReturn
BoxInstanceWithTemplate.model_rebuild()