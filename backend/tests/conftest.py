"""Shared fixtures for all tests."""
import asyncio
import datetime
import uuid
from contextlib import asynccontextmanager
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest
from starlette.testclient import TestClient

from stellage.main import app
from stellage.apps.auth.depends import get_current_user
from stellage.apps.auth.schemas import UserVerifySchema, UserReturnData
from stellage.apps.auth.services import UserService
from stellage.apps.shelves.services import ShelfService
from stellage.apps.shelves.schemas import ShelfReturnData, ShelfWithBoxInstances
from stellage.apps.boxes.instances.services import InstanceService
from stellage.apps.boxes.templates.services import TemplateService
from stellage.apps.boxes.templates.schemas import BoxTemplateReturn
from stellage.apps.boxes.instances.schemas import BoxInstanceWithTemplate
from stellage.core.core_dependencies.redis_dependency import RedisDependency
from stellage.database.enums.box_rarity import BoxRarity
from stellage.database.enums.currency import CurrencyEnum
from stellage.database.enums.box_sealing import SealingEnum
from stellage.database.enums.verification import VerifyEnum
from stellage.database.enums.visibility import VisibilityEnum

# ── Stable IDs ────────────────────────────────────────────────────────────────
TEST_USER_ID = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
TEST_SESSION_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
TEST_SHELF_ID = uuid.UUID("cccccccc-cccc-cccc-cccc-cccccccccccc")
TEST_TEMPLATE_ID = uuid.UUID("dddddddd-dddd-dddd-dddd-dddddddddddd")
TEST_INSTANCE_ID = uuid.UUID("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee")
NOW = datetime.datetime(2026, 1, 1, 12, 0, 0)


def run(coro):
    """Run an async coroutine synchronously (helper for unit tests)."""
    return asyncio.get_event_loop().run_until_complete(coro)


# ── Domain fixtures ───────────────────────────────────────────────────────────

@pytest.fixture
def test_user() -> UserVerifySchema:
    return UserVerifySchema(
        id=TEST_USER_ID,
        email="test@example.com",
        session_id=TEST_SESSION_ID,
    )


@pytest.fixture
def test_user_return() -> UserReturnData:
    return UserReturnData(
        id=TEST_USER_ID,
        email="test@example.com",
        is_verified=True,
        is_active=True,
        is_superuser=False,
        created_at=NOW,
        updated_at=NOW,
    )


@pytest.fixture
def test_shelf() -> ShelfReturnData:
    return ShelfReturnData(
        id=TEST_SHELF_ID,
        user_id=TEST_USER_ID,
        title="Test Shelf",
        is_main=True,
        is_public=True,
        created_at=NOW,
        updated_at=NOW,
    )


@pytest.fixture
def test_shelf_with_boxes(test_shelf) -> ShelfWithBoxInstances:
    return ShelfWithBoxInstances(**test_shelf.model_dump(), boxes=[])


@pytest.fixture
def test_template() -> BoxTemplateReturn:
    return BoxTemplateReturn(
        id=TEST_TEMPLATE_ID,
        title="Test Template",
        description=None,
        price=Decimal("0.00"),
        currency=CurrencyEnum.RUB,
        rarity=BoxRarity.COMMON,
        created_at=NOW,
        updated_at=NOW,
    )


@pytest.fixture
def test_box_instance(test_template) -> BoxInstanceWithTemplate:
    return BoxInstanceWithTemplate(
        id=TEST_INSTANCE_ID,
        serial_number=1,
        template_id=TEST_TEMPLATE_ID,
        shelf_id=None,
        user_id=TEST_USER_ID,
        is_sealed=SealingEnum.SEALED,
        is_public=VisibilityEnum.PRIVATE,
        is_verified=VerifyEnum.NOT_VERIFIED,
        content=None,
        template=test_template,
        created_at=NOW,
        updated_at=NOW,
    )


# ── Mock Redis ────────────────────────────────────────────────────────────────

def make_mock_redis():
    mock_client = AsyncMock()
    mock_client.incr = AsyncMock(return_value=1)
    mock_client.expire = AsyncMock(return_value=True)
    mock_client.set = AsyncMock(return_value=True)
    mock_client.get = AsyncMock(return_value=None)
    mock_client.delete = AsyncMock(return_value=1)
    mock_client.aclose = AsyncMock()

    mock_dep = MagicMock(spec=RedisDependency)

    @asynccontextmanager
    async def _get_client():
        yield mock_client

    mock_dep.get_client = _get_client
    return mock_dep


# ── HTTP clients ──────────────────────────────────────────────────────────────

@pytest.fixture
def client():
    """Unauthenticated sync TestClient with mocked Redis."""
    mock_redis = make_mock_redis()
    app.dependency_overrides[RedisDependency] = lambda: mock_redis
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def auth_client(test_user):
    """Authenticated sync TestClient (get_current_user returns test_user)."""
    mock_redis = make_mock_redis()
    app.dependency_overrides[RedisDependency] = lambda: mock_redis
    app.dependency_overrides[get_current_user] = lambda: test_user
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()
