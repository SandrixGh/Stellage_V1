"""Тесты health-эндпоинтов (core/health.py)."""
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock

import pytest
from starlette.testclient import TestClient
from tests.conftest import make_mock_redis

from stellage.core.core_dependencies.db_dependency import DBDependency
from stellage.core.core_dependencies.redis_dependency import RedisDependency
from stellage.main import app


def make_mock_db(*, failing: bool = False):
    """Заглушка DBDependency: db_session — фабрика асинхронных сессий."""
    session = AsyncMock()
    session.execute = AsyncMock(
        side_effect=OSError("connection refused") if failing else None
    )

    @asynccontextmanager
    async def _session_factory():
        yield session

    mock_dep = MagicMock(spec=DBDependency)
    # db_session — property, возвращающий вызываемую фабрику контекст-менеджера.
    type(mock_dep).db_session = property(lambda _: _session_factory)
    return mock_dep


@pytest.fixture
def health_client():
    yield from _health_client(db_failing=False, redis_failing=False)


def _health_client(*, db_failing: bool, redis_failing: bool):
    mock_redis = make_mock_redis()
    if redis_failing:
        @asynccontextmanager
        async def _broken_client():
            raise OSError("redis is down")
            yield  # pragma: no cover — делает функцию генератором

        mock_redis.get_client = _broken_client

    app.dependency_overrides[DBDependency] = lambda: make_mock_db(failing=db_failing)
    app.dependency_overrides[RedisDependency] = lambda: mock_redis
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


def test_liveness_is_ok_and_touches_no_dependencies(client):
    """Liveness обязан отвечать 200 без обращений к БД/Redis: иначе падение
    зависимости заставит оркестратор перезапускать исправное приложение."""
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_readiness_ok_when_dependencies_are_up(health_client):
    resp = health_client.get("/health/ready")
    assert resp.status_code == 200
    assert resp.json() == {
        "status": "ok",
        "checks": {"database": "ok", "redis": "ok"},
    }


def test_readiness_returns_503_when_database_is_down():
    for c in _health_client(db_failing=True, redis_failing=False):
        resp = c.get("/health/ready")
        assert resp.status_code == 503
        body = resp.json()
        assert body["status"] == "degraded"
        assert body["checks"]["database"] == "error"
        # Одна упавшая зависимость не должна маскировать состояние остальных.
        assert body["checks"]["redis"] == "ok"


def test_readiness_returns_503_when_redis_is_down():
    for c in _health_client(db_failing=False, redis_failing=True):
        resp = c.get("/health/ready")
        assert resp.status_code == 503
        body = resp.json()
        assert body["status"] == "degraded"
        assert body["checks"]["redis"] == "error"
        assert body["checks"]["database"] == "ok"


def test_readiness_does_not_leak_error_details():
    """Наружу отдаём только имя зависимости и состояние: тексты ошибок
    (хосты, DSN, стектрейсы) остаются в логе."""
    for c in _health_client(db_failing=True, redis_failing=True):
        raw = c.get("/health/ready").text
        assert "connection refused" not in raw
        assert "redis is down" not in raw
