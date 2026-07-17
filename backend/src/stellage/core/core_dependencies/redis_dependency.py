from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from redis.asyncio import Redis, ConnectionPool

from stellage.core.settings import settings


# Пул соединений Redis — процессный синглтон, создаётся один раз при импорте.
# Раньше он жил в RedisDependency.__init__, а зависимость инстанцируется на
# каждый запрос → новый пул на запрос. Теперь конструктор дешёвый и
# переиспользует общий пул; на каждый вызов get_client берётся клиент из пула.
_pool: ConnectionPool = ConnectionPool.from_url(
    url=settings.redis_settings.redis_url,
    encoding="utf-8",
    decode_responses=True,
)


class RedisDependency:
    """Тонкая обёртка над процессным пулом Redis. Безопасна на каждый запрос."""

    def __init__(self):
        self._pool = _pool

    @asynccontextmanager
    async def get_client(self) -> AsyncGenerator:
        redis_client = Redis(connection_pool=self._pool)

        try:
            yield redis_client
        finally:
            await redis_client.aclose()


async def dispose_pool() -> None:
    """Закрыть пул Redis (FastAPI shutdown / завершение воркера)."""
    await _pool.aclose()
