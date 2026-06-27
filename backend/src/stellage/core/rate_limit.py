import logging
from typing import Callable

from fastapi import Depends, HTTPException, Request, status

from stellage.core.core_dependencies.redis_dependency import RedisDependency

logger = logging.getLogger(__name__)


def rate_limit(max_calls: int, window_seconds: int) -> Callable:
    """Return a FastAPI dependency that enforces a fixed-window rate limit.

    Keyed by client IP + endpoint path, backed by Redis INCR/EXPIRE.
    """

    async def dependency(
        request: Request,
        redis: RedisDependency = Depends(RedisDependency),
    ) -> None:
        client_ip = request.client.host if request.client else "unknown"
        key = f"rate_limit:{request.url.path}:{client_ip}"

        async with redis.get_client() as client:
            count = await client.incr(key)
            if count == 1:
                await client.expire(key, window_seconds)

        if count > max_calls:
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

    return dependency
