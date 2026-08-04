"""Health-эндпоинты для healthcheck'ов Docker/оркестратора и CI.

Живут вне /api.v1 сознательно: это инфраструктура, а не продуктовое API, и
их путь не должен меняться вместе с версией API. По той же причине на них нет
rate_limit — проверки идут часто и с одного адреса, лимитер бы их задушил.

Разделение liveness/readiness намеренное:
- /health отвечает «процесс жив» и НИЧЕГО не проверяет. Если завязать его на
  БД, то при недоступной БД оркестратор начнёт перезапускать совершенно
  здоровое приложение — перезапуск базу не чинит, а рестарт-петля мешает ей
  подняться.
- /health/ready отвечает «готов обслуживать запросы» и проверяет зависимости.
  Именно его смотрят балансировщик и CI.
"""
import asyncio
import logging

from fastapi import APIRouter, Depends, Response
from sqlalchemy import text
from starlette import status

from stellage.core.core_dependencies.db_dependency import DBDependency
from stellage.core.core_dependencies.redis_dependency import RedisDependency

logger = logging.getLogger(__name__)

# Проверка не должна висеть дольше, чем интервал healthcheck'а: зависшая
# зависимость обязана выглядеть как недоступная, а не как «ещё думаем».
_PROBE_TIMEOUT_SECONDS = 3.0

health_router = APIRouter(tags=["Health"])


@health_router.get("/health", status_code=status.HTTP_200_OK)
async def liveness() -> dict[str, str]:
    """Процесс поднят и обрабатывает запросы. Без обращений к зависимостям."""
    return {"status": "ok"}


async def _check_db(db: DBDependency) -> bool:
    async with db.db_session() as session:
        await session.execute(text("SELECT 1"))
    return True


async def _check_redis(redis: RedisDependency) -> bool:
    async with redis.get_client() as client:
        await client.ping()
    return True


@health_router.get("/health/ready")
async def readiness(
    response: Response,
    db: DBDependency = Depends(DBDependency),
    redis: RedisDependency = Depends(RedisDependency),
) -> dict[str, object]:
    """Готовность обслуживать запросы: доступны ли Postgres и Redis.

    Отдаёт 200, если доступны оба, иначе 503 и перечень упавших. Названия
    зависимостей наружу отдавать безопасно, тексты ошибок — нет: они попадают
    только в лог.
    """
    checks: dict[str, str] = {}

    for name, probe, arg in (
        ("database", _check_db, db),
        ("redis", _check_redis, redis),
    ):
        try:
            await asyncio.wait_for(probe(arg), timeout=_PROBE_TIMEOUT_SECONDS)
            checks[name] = "ok"
        except TimeoutError:
            logger.warning("Health probe timed out: %s", name)
            checks[name] = "timeout"
        except Exception:
            logger.exception("Health probe failed: %s", name)
            checks[name] = "error"

    healthy = all(state == "ok" for state in checks.values())
    if not healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {"status": "ok" if healthy else "degraded", "checks": checks}
