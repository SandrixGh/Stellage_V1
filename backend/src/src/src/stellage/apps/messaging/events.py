import json
import logging
import uuid
from typing import Annotated

from fastapi import Depends
from pydantic_core import to_jsonable_python

from stellage.core.core_dependencies.redis_dependency import RedisDependency

logger = logging.getLogger(__name__)


def user_channel(user_id: uuid.UUID | str) -> str:
    """Redis pub/sub-канал личных событий пользователя (новые сообщения, правки,
    удаления, статусы прочтения). На него подписан каждый его ws-коннект."""
    return f"ws:user:{user_id}"


class MessageEventPublisher:
    """Публикация real-time событий чата через Redis pub/sub. Доставка
    best-effort: если Redis недоступен, publish тихо гасится — чат деградирует
    до «увидишь при следующем открытии», но запрос не падает."""

    def __init__(
        self,
        redis: Annotated[RedisDependency, Depends(RedisDependency)],
    ) -> None:
        self.redis = redis

    async def publish(self, user_id: uuid.UUID | str, event: dict) -> None:
        try:
            payload = json.dumps(to_jsonable_python(event))
            async with self.redis.get_client() as client:
                await client.publish(user_channel(user_id), payload)
        except Exception:
            # Не роняем основной запрос из-за сбоя доставки события.
            logger.warning("ws event publish failed (best-effort)", exc_info=False)
