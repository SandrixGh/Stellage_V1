import logging
import urllib.parse
import uuid
from typing import Annotated

from botocore.exceptions import ClientError
from fastapi import Depends, HTTPException, status

from stellage.apps.boxes.assets.authorization import can_view_box_content
from stellage.apps.boxes.assets.limits import (
    ALLOWED_MIME_TYPES,
    MAGIC_PROBE_BYTES,
    MAX_ASSETS_PER_BOX,
    MAX_BYTES,
    MAX_USER_STORAGE_BYTES,
    MIME_EXTENSIONS,
    matches_magic,
)
from stellage.apps.boxes.assets.repositories import BoxAssetRepository
from stellage.apps.boxes.assets.schemas import (
    AssetDownloadUrl,
    AssetUploadInitiate,
    AssetUploadTarget,
    BoxAssetInternal,
    BoxAssetRead,
)
from stellage.apps.boxes.instances.cache_managers import InstanceCacheManager
from stellage.apps.shelves.cache_managers import ShelfCacheManager
from stellage.core.core_dependencies.s3_dependency import S3Dependency
from stellage.core.settings import settings
from stellage.database.enums.asset_status import AssetStatusEnum

# В логи ассетов попадают только id — никаких presigned-ссылок, полей формы
# или ключей объектов.
logger = logging.getLogger(__name__)


def sanitize_filename(name: str) -> str:
    """Оставляет от клиентского имени файла только безопасное отображаемое имя.
    В ключ объекта оно не попадает — только в метаданные и content-disposition."""
    name = name.replace("\\", "/").rsplit("/", 1)[-1]
    cleaned = "".join(
        c for c in name
        if c.isprintable() and c not in '<>:"|?*'
    ).strip()
    return (cleaned or "file")[:255]


class AssetManager:
    def __init__(
        self,
        repository: Annotated[
            BoxAssetRepository,
            Depends(BoxAssetRepository)
        ],
        s3: Annotated[
            S3Dependency,
            Depends(S3Dependency)
        ],
        instance_cache_manager: Annotated[
            InstanceCacheManager,
            Depends(InstanceCacheManager)
        ],
        shelf_cache_manager: Annotated[
            ShelfCacheManager,
            Depends(ShelfCacheManager)
        ],
    ) -> None:
        self.repository = repository
        self.s3 = s3
        self.instance_cache_manager = instance_cache_manager
        self.shelf_cache_manager = shelf_cache_manager

    async def initiate_upload(
        self,
        user_id: uuid.UUID,
        data: AssetUploadInitiate,
    ) -> AssetUploadTarget:
        # Владелец коробки? Чужая/несуществующая — одинаковый 404 (без оракула).
        if not await self.repository.instance_owned_by(
            user_id=user_id,
            instance_id=data.instance_id,
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Box not found or access denied",
            )

        if data.mime not in ALLOWED_MIME_TYPES[data.kind]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Unsupported content type for this asset kind",
            )

        max_bytes = MAX_BYTES[data.kind]
        if data.size_bytes > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large: limit is {max_bytes} bytes",
            )

        # Ключ полностью серверный: клиентское имя файла в него не попадает.
        asset_id = uuid.uuid4()
        s3_key = (
            f"users/{user_id}/boxes/{data.instance_id}/"
            f"{asset_id}{MIME_EXTENSIONS[data.mime]}"
        )

        # Лимит числа ассетов + квота проверяются и запись создаётся в ОДНОЙ
        # транзакции под advisory-lock по владельцу — параллельные аплоады
        # больше не пробивают лимиты через TOCTOU.
        outcome = await self.repository.reserve_pending_slot(
            asset_id=asset_id,
            owner_id=user_id,
            instance_id=data.instance_id,
            kind=data.kind,
            s3_key=s3_key,
            mime=data.mime,
            size_bytes=data.size_bytes,
            original_name=sanitize_filename(data.original_name),
            max_assets_per_box=MAX_ASSETS_PER_BOX,
            max_user_storage_bytes=MAX_USER_STORAGE_BYTES,
        )
        if outcome == "too_many":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Box already has {MAX_ASSETS_PER_BOX} assets",
            )
        if outcome == "quota":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Storage quota exceeded",
            )

        expires_in = settings.s3_settings.upload_url_expire_seconds
        async with self.s3.get_signing_client() as client:
            presigned = await client.generate_presigned_post(
                Bucket=self.s3.bucket,
                Key=s3_key,
                Fields={"Content-Type": data.mime},
                # Политика POST — единственный механизм, который жёстко
                # ограничивает размер и Content-Type на уровне самого хранилища.
                Conditions=[
                    {"key": s3_key},
                    {"Content-Type": data.mime},
                    ["content-length-range", 1, max_bytes],
                ],
                ExpiresIn=expires_in,
            )

        logger.info(
            "asset upload initiated: asset_id=%s instance_id=%s",
            asset_id,
            data.instance_id,
        )

        return AssetUploadTarget(
            asset_id=asset_id,
            url=presigned["url"],
            fields=presigned["fields"],
            expires_in=expires_in,
        )

    async def complete_upload(
        self,
        user_id: uuid.UUID,
        asset_id: uuid.UUID,
    ) -> BoxAssetRead:
        asset = await self.repository.get_owned_asset(
            asset_id=asset_id,
            owner_id=user_id,
        )

        if asset is None or asset.status == AssetStatusEnum.DELETING:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Asset not found",
            )

        # Идемпотентность: повторный complete уже готового ассета — не ошибка.
        if asset.status == AssetStatusEnum.READY:
            return BoxAssetRead.model_validate(asset.model_dump())

        async with self.s3.get_client() as client:
            try:
                head = await client.head_object(
                    Bucket=self.s3.bucket,
                    Key=asset.s3_key,
                )
            except ClientError as err:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="File was not uploaded to storage",
                ) from err

            # Фактические размер и тип обязаны совпасть с заявленными в initiate.
            if (
                head.get("ContentLength") != asset.size_bytes
                or head.get("ContentType") != asset.mime
            ):
                await self._discard_object(client, asset)
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Uploaded file does not match declared size or type",
                )

            # Третий рубеж против спуфинга: сигнатура первых байтов файла.
            probe = await client.get_object(
                Bucket=self.s3.bucket,
                Key=asset.s3_key,
                Range=f"bytes=0-{MAGIC_PROBE_BYTES - 1}",
            )
            head_bytes = await probe["Body"].read()
            if not matches_magic(asset.mime, head_bytes):
                await self._discard_object(client, asset)
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="File content does not match declared type",
                )

        await self.repository.set_status(
            asset_id=asset_id,
            status=AssetStatusEnum.READY,
        )
        await self._invalidate_box_caches(
            user_id=user_id,
            instance_id=asset.instance_id,
        )

        logger.info("asset upload completed: asset_id=%s", asset_id)
        return BoxAssetRead.model_validate(asset.model_dump())

    async def get_download_url(
        self,
        viewer_id: uuid.UUID | None,
        asset_id: uuid.UUID,
    ) -> AssetDownloadUrl:
        pair = await self.repository.get_asset_with_access(asset_id=asset_id)

        if pair is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Asset not found",
            )

        asset, access = pair
        if asset.status != AssetStatusEnum.READY or not can_view_box_content(
            viewer_id=viewer_id,
            owner_id=access.owner_id,
            is_public=access.is_public,
            shelf_id=access.shelf_id,
            shelf_is_public=access.shelf_is_public,
        ):
            # Тот же 404, что и для несуществующего — не подтверждаем
            # существование чужого контента.
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Asset not found",
            )

        expires_in = settings.s3_settings.download_url_expire_seconds
        disposition_name = urllib.parse.quote(asset.original_name)
        async with self.s3.get_signing_client() as client:
            url = await client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": self.s3.bucket,
                    "Key": asset.s3_key,
                    "ResponseContentType": asset.mime,
                    "ResponseContentDisposition":
                        f"inline; filename*=UTF-8''{disposition_name}",
                },
                ExpiresIn=expires_in,
            )

        return AssetDownloadUrl(url=url, expires_in=expires_in)

    async def list_box_assets(
        self,
        viewer_id: uuid.UUID | None,
        instance_id: uuid.UUID,
    ) -> list[BoxAssetRead]:
        access = await self.repository.get_box_access(instance_id=instance_id)

        if access is None or not can_view_box_content(
            viewer_id=viewer_id,
            owner_id=access.owner_id,
            is_public=access.is_public,
            shelf_id=access.shelf_id,
            shelf_is_public=access.shelf_is_public,
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Box not found",
            )

        return await self.repository.list_ready_for_instance(
            instance_id=instance_id,
        )

    async def delete_asset(
        self,
        user_id: uuid.UUID,
        asset_id: uuid.UUID,
    ) -> None:
        asset = await self.repository.get_owned_asset(
            asset_id=asset_id,
            owner_id=user_id,
        )

        if asset is None or asset.status == AssetStatusEnum.DELETING:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Asset not found",
            )

        # Сначала помечаем DELETING: если удаление объекта сорвётся,
        # строку доберёт sweeper.
        await self.repository.set_status(
            asset_id=asset_id,
            status=AssetStatusEnum.DELETING,
        )
        await self._invalidate_box_caches(
            user_id=user_id,
            instance_id=asset.instance_id,
        )

        async with self.s3.get_client() as client:
            await self._discard_object(client, asset)

        logger.info("asset deleted: asset_id=%s", asset_id)

    async def _discard_object(
        self,
        client,
        asset: BoxAssetInternal,
    ) -> None:
        """Помечает ассет DELETING и best-effort удаляет объект + строку.
        Любой сбой оставляет строку в DELETING — её гарантированно доберёт
        периодический sweeper."""
        try:
            await self.repository.set_status(
                asset_id=asset.id,
                status=AssetStatusEnum.DELETING,
            )
            await client.delete_object(
                Bucket=self.s3.bucket,
                Key=asset.s3_key,
            )
            await self.repository.delete_row(asset_id=asset.id)
        except Exception:
            logger.warning(
                "asset discard deferred to sweeper: asset_id=%s",
                asset.id,
            )

    async def _invalidate_box_caches(
        self,
        user_id: uuid.UUID,
        instance_id: uuid.UUID | None,
    ) -> None:
        """Сбрасывает кэш экземпляра и полки — там лежит снимок с assets."""
        if instance_id is None:
            return

        await self.instance_cache_manager.delete_instance(
            instance_id=instance_id,
            user_id=user_id,
        )

        access = await self.repository.get_box_access(instance_id=instance_id)
        if access and access.shelf_id:
            await self.shelf_cache_manager.delete_shelf(
                user_id=user_id,
                shelf_id=access.shelf_id,
            )
