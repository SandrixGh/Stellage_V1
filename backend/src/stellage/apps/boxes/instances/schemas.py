import datetime
import uuid

from pydantic import BaseModel, ConfigDict

from stellage.database.enums.box_sealing import SealingEnum
from stellage.database.enums.verification import VerifyEnum
from stellage.database.enums.visibility import VisibilityEnum


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
    model_config = ConfigDict(from_attributes=True)


class BoxInstanceUpdate(BaseModel):
    shelf_id: uuid.UUID | None = None
    is_sealed: SealingEnum | None = None
    is_public: VisibilityEnum | None = None
    content: dict | None = None


class BoxInstanceCreate(BoxInstanceBase, GetParentsIds):
    pass