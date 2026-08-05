import logging
import time
from collections.abc import Callable

from fastapi import Depends, HTTPException, Request, status

from stellage.core.core_dependencies.redis_dependency import RedisDependency
from stellage.core.settings import settings

logger = logging.getLogger(__name__)


def _client_ip(request: Request) -> str:
    """IP клиента для ключа лимита. За доверенным прокси берём первый адрес из
    X-Forwarded-For (реальный клиент), иначе — прямой peer. Доверять заголовку
    без прокси нельзя: клиент подделает IP и обойдёт лимит — поэтому под флагом
    settings.trust_proxy_headers."""
    if settings.trust_proxy_headers:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            # Первый в списке — исходный клиент (прокси дописывают справа).
            return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(
    max_calls: int,
    window_seconds: int,
) -> Callable:
    """FastAPI-зависимость: скользящее окно (sliding window) на Redis sorted set.

    В отличие от fixed-window (INCR+EXPIRE) не допускает всплеск ×2 на стыке
    окон: считаем ровно вызовы за последние window_seconds. Ключ — IP клиента
    + путь эндпоинта.
    """

    async def dependency(
        request: Request,
        redis: RedisDependency = Depends(RedisDependency),
    ) -> None:
        client_ip = _client_ip(request)
        key = f"rate_limit:{request.url.path}:{client_ip}"

        now = time.time()
        window_start = now - window_seconds

        try:
            async with redis.get_client() as client:
                async with client.pipeline(transaction=True) as pipe:
                    # Выкидываем всё старше окна, считаем оставшееся, добавляем
                    # текущий вызов, продлеваем TTL ключа на длину окна.
                    pipe.zremrangebyscore(key, 0, window_start)
                    pipe.zcard(key)
                    pipe.zadd(key, {f"{now}:{id(request)}": now})
                    pipe.expire(key, window_seconds)
                    _, count, _, _ = await pipe.execute()

            # count — число вызовов ДО текущего; лимит превышен, когда их уже max.
            if count >= max_calls:
                logger.warning(
                    "Rate limit exceeded: ip=%s path=%s count=%d",
                    client_ip,
                    request.url.path,
                    count,
                )
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Too many requests. Retry after {window_seconds} seconds.",
                )
        except HTTPException:
            raise
        except Exception as exc:
            logger.warning("Rate limit Redis check failed (failing open): %s", exc)

    return dependency
