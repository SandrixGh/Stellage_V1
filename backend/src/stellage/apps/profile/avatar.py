import logging
import uuid
from typing import Annotated

from botocore.exceptions import ClientError
from fastapi import Depends, HTTPException, status

from stellage.apps.boxes.assets.limits import (
    MAGIC_PROBE_BYTES,
    MIME_EXTENSIONS,
    PHOTO_MIME_TYPES,
    matches_magic,
)
from stellage.apps.profile.managers import ProfileManager
from stellage.apps.profile.schemas import AvatarUploadTarget
from stellage.core.core_dependencies.s3_dependency import S3Dependency
from stellage.core.settings import settings

# В логи попадают только id пользователя — никаких presigned-ссылок и ключей.
logger = logging.getLogger(__name__)

# Аватар — только изображение и заметно легче коробочного фото.
AVATAR_MAX_BYTES = 5 * 2**20  # 5 MB
AVATAR_MIME_TYPES = PHOTO_MIME_TYPES


class AvatarManager:
    """Загрузка/чтение аватара пользователя в S3 по образцу пайплайна ассетов
    коробки (presigned POST → complete с проверкой сигнатуры → presigned GET),
    но без привязки к коробке: один аватар на пользователя, публично видимый.
    Ключ и расширение всегда серверные; имя файла клиента в ключ не попадает."""

    def __init__(
        self,
        profile_manager: Annotated[ProfileManager, Depends(ProfileManager)],
        s3: Annotated[S3Dependency, Depends(S3Dependency)],
    ) -> None:
        self.profile_manager = profile_manager
        self.s3 = s3

    async def initiate_upload(
        self,
        user_id: uuid.UUID,
        mime: str,
        size_bytes: int,
    ) -> AvatarUploadTarget:
        if mime not in AVATAR_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Unsupported image type",
            )
        if size_bytes > AVATAR_MAX_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Image too large: limit is {AVATAR_MAX_BYTES} bytes",
            )

        # Новый uuid на каждую загрузку — старый объект убираем в complete,
        # чтобы presigned-ссылки на прежний аватар не рвались мгновенно.
        pending_key = f"users/{user_id}/avatar/{uuid.uuid4()}{MIME_EXTENSIONS[mime]}"

        expires_in = settings.s3_settings.upload_url_expire_seconds
        async with self.s3.get_signing_client() as client:
            presigned = await client.generate_presigned_post(
                Bucket=self.s3.bucket,
                Key=pending_key,
                Fields={"Content-Type": mime},
                Conditions=[
                    {"key": pending_key},
                    {"Content-Type": mime},
                    ["content-length-range", 1, AVATAR_MAX_BYTES],
                ],
                ExpiresIn=expires_in,
            )

        logger.info("avatar upload initiated: user_id=%s", user_id)
        return AvatarUploadTarget(
            key=pending_key,
            url=presigned["url"],
            fields=presigned["fields"],
            expires_in=expires_in,
            mime=mime,
            size_bytes=size_bytes,
        )

    async def complete_upload(
        self,
        user_id: uuid.UUID,
        key: str,
        mime: str,
        size_bytes: int,
    ) -> None:
        """Проверяет реально загруженный объект (размер, тип, сигнатура),
        записывает avatar_key и удаляет прежний аватар пользователя."""
        # Ключ обязан принадлежать namespace этого пользователя — иначе можно
        # было бы «присвоить» чужой объект.
        if not key.startswith(f"users/{user_id}/avatar/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid avatar key",
            )

        async with self.s3.get_client() as client:
            try:
                head = await client.head_object(Bucket=self.s3.bucket, Key=key)
            except ClientError:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Image was not uploaded to storage",
                )

            if head.get("ContentLength") != size_bytes or head.get("ContentType") != mime:
                await self._discard(client, key)
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Uploaded image does not match declared size or type",
                )

            probe = await client.get_object(
                Bucket=self.s3.bucket,
                Key=key,
                Range=f"bytes=0-{MAGIC_PROBE_BYTES - 1}",
            )
            head_bytes = await probe["Body"].read()
            if not matches_magic(mime, head_bytes):
                await self._discard(client, key)
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Image content does not match declared type",
                )

            old_key = await self.profile_manager.get_avatar_key(user_id=user_id)
            await self.profile_manager.update_user_fields(
                user_id=user_id,
                avatar_key=key,
            )
            # Прежний объект убираем best-effort: даже если не удалится,
            # аватар пользователя уже указывает на новый ключ.
            if old_key and old_key != key:
                await self._discard(client, old_key)

        logger.info("avatar upload completed: user_id=%s", user_id)

    async def get_avatar_url(self, avatar_key: str) -> str:
        """Короткоживущая presigned GET-ссылка на аватар (аватар публичный)."""
        async with self.s3.get_signing_client() as client:
            return await self.presign_avatar(client, avatar_key)

    async def presign_avatar(self, client, avatar_key: str) -> str:
        """Presigned GET на аватар через УЖЕ ОТКРЫТЫЙ signing-клиент — чтобы
        списки (диалоги/подписчики) не открывали клиент на каждого пользователя."""
        expires_in = settings.s3_settings.download_url_expire_seconds
        return await client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.s3.bucket, "Key": avatar_key},
            ExpiresIn=expires_in,
        )

    async def _discard(self, client, key: str) -> None:
        try:
            await client.delete_object(Bucket=self.s3.bucket, Key=key)
        except Exception:
            logger.warning("avatar object discard failed (left for manual cleanup)")
