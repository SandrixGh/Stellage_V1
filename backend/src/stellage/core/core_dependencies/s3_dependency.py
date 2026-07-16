from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import aioboto3
from botocore.config import Config

from stellage.core.settings import settings


class S3Dependency:
    """Асинхронные S3-клиенты поверх aioboto3 (по образцу RedisDependency).

    Секретный ключ распаковывается ТОЛЬКО здесь — выше по слоям он не всплывает.
    get_client — внутренние операции (head/get/delete) через внутренний endpoint;
    get_signing_client — генерация presigned-ссылок, подписанных под браузерный
    endpoint (SigV4 подписывает Host, адреса обязаны совпадать).
    """

    def __init__(self) -> None:
        self._s3 = settings.s3_settings
        self._session = aioboto3.Session()
        self._config = Config(
            signature_version="s3v4",
            s3={"addressing_style": self._s3.s3_addressing_style},
        )

    @property
    def bucket(self) -> str:
        return self._s3.s3_bucket_name

    def _client(self, endpoint_url: str):
        return self._session.client(
            "s3",
            endpoint_url=endpoint_url,
            region_name=self._s3.s3_region,
            aws_access_key_id=self._s3.s3_access_key_id,
            aws_secret_access_key=self._s3.s3_secret_access_key.get_secret_value(),
            config=self._config,
        )

    @asynccontextmanager
    async def get_client(self) -> AsyncGenerator:
        async with self._client(self._s3.s3_endpoint_url) as client:
            yield client

    @asynccontextmanager
    async def get_signing_client(self) -> AsyncGenerator:
        async with self._client(self._s3.browser_endpoint_url) as client:
            yield client
