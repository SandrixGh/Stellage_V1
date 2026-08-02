import datetime
import uuid
from decimal import Decimal
from typing import TYPE_CHECKING, Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints, computed_field

from stellage.apps.boxes.assets.schemas import BoxAssetRead
from stellage.apps.boxes.content import resolve_content_type
from stellage.database.enums.box_content_type import BoxContentTypeEnum
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


class BoxTextContent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: Annotated[str, StringConstraints(max_length=10_000)] | None = None


class BoxInstanceBase(BaseModel):
    is_sealed: SealingEnum = SealingEnum.SEALED
    is_public: VisibilityEnum = VisibilityEnum.PRIVATE
    content: BoxTextContent | None = None


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
    is_verified: VerifyEnum = VerifyEnum.NOT_VERIFIED
    assets: list[BoxAssetRead] = []
    likes_count: int = 0
    comments_count: int = 0
    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def content_type(self) -> BoxContentTypeEnum:
        has_text = bool(self.content and self.content.text)
        return resolve_content_type(
            has_text=has_text,
            asset_kinds=[a.kind for a in self.assets],
        )


class BoxInstanceWithTemplate(BoxInstanceReturn):
    template: "BoxTemplateReturn"


class GiftBoxRequest(BaseModel):
    to_username: Annotated[str, StringConstraints(min_length=1, max_length=30)]


class BoxPositionUpdate(BaseModel):
    shelf_row: int
    shelf_col: int


class BoxInstanceUpdate(BaseModel):
    shelf_id: uuid.UUID | None = None
    is_sealed: SealingEnum | None = None
    is_public: VisibilityEnum | None = None
    content: BoxTextContent | None = None


class BoxInstanceCreate(BoxInstanceBase, GetTemplateId, GetShelfId):
    pass


class BoxUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    price: Decimal | None = None
    currency: CurrencyEnum | None = None
    rarity: BoxRarity | None = None
    content: BoxTextContent | None = None


class CustomBoxCreate(BaseModel):
    title: str
    description: str | None = None
    price: Decimal = Decimal("0")
    currency: CurrencyEnum = CurrencyEnum.STELLA
    content: BoxTextContent | None = None
    rarity: BoxRarity | None = None


from stellage.apps.boxes.templates.schemas import BoxTemplateReturn

BoxInstanceWithTemplate.model_rebuild()