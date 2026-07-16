import datetime
import uuid
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from stellage.database.enums.asset_kind import AssetKindEnum
from stellage.database.enums.asset_status import AssetStatusEnum
from stellage.database.enums.box_sealing import SealingEnum
from stellage.database.enums.visibility import VisibilityEnum


class AssetUploadInitiate(BaseModel):
    instance_id: uuid.UUID
    kind: AssetKindEnum
    mime: Annotated[str, StringConstraints(min_length=3, max_length=100)]
    size_bytes: int = Field(gt=0)
    original_name: Annotated[
        str,
        StringConstraints(min_length=1, max_length=255)
    ]


class AssetUploadTarget(BaseModel):
    """Разовая цель для прямой загрузки в S3 (presigned POST). Не кэшировать,
    не логировать, не сохранять — живёт expires_in секунд."""
    asset_id: uuid.UUID
    url: str
    fields: dict[str, str]
    expires_in: int


class AssetCompleteRequest(BaseModel):
    asset_id: uuid.UUID


class BoxAssetRead(BaseModel):
    """Публичные метаданные ассета. s3_key наружу не выходит никогда —
    в API ассет адресуется только по id."""
    id: uuid.UUID
    kind: AssetKindEnum
    mime: str
    size_bytes: int
    original_name: str
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class BoxAssetInternal(BoxAssetRead):
    """Внутренняя проекция для слоёв репозиторий→менеджер. НЕ использовать
    как response_model: содержит s3_key."""
    instance_id: uuid.UUID | None
    owner_id: uuid.UUID | None
    s3_key: str
    status: AssetStatusEnum


class AssetDownloadUrl(BaseModel):
    """Короткоживущая presigned GET-ссылка. Не кэшировать и не сохранять."""
    url: str
    expires_in: int


class BoxContentAccess(BaseModel):
    """Срез полей коробки и её полки для проверки правила видимости контента."""
    owner_id: uuid.UUID
    is_public: VisibilityEnum
    is_sealed: SealingEnum
    shelf_id: uuid.UUID | None
    shelf_is_public: bool | None
