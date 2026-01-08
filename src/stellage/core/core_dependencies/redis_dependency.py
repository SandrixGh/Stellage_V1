from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from redis.asyncio import Redis, ConnectionPool

from stellage.core.settings import settings


class RedisDependency:
    def __init__(self):
        self._url = settings.redis_settings.redis_url
        self._pool: ConnectionPool = self._init_pool()

    def _init_pool(self):
        return (
            ConnectionPool.from_url(
                url=self._url,
                encoding="utf-8",
                decode_responses=True,
            )
        )

    @asynccontextmanager
    async def get_client(self) -> AsyncGenerator:
        redis_client = Redis(connection_pool=self._pool)

        try:
            yield redis_client
        finally:
            await redis_client.aclose()
