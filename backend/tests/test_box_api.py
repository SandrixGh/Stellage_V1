"""API integration tests for /api.v1/boxes endpoints."""
import uuid
from unittest.mock import AsyncMock

from fastapi import HTTPException

from stellage.apps.boxes.instances.services import InstanceService
from stellage.apps.boxes.templates.services import TemplateService
from stellage.apps.boxes.templates.schemas import BoxTemplateReturnWithInstances
from stellage.main import app
from tests.conftest import TEST_TEMPLATE_ID, TEST_INSTANCE_ID, TEST_SHELF_ID, TEST_USER_ID


# ── Fixtures ──────────────────────────────────────────────────────────────────

import pytest

@pytest.fixture
def mock_template_service(test_template):
    mock = AsyncMock(spec=TemplateService)
    mock.get_templates = AsyncMock(return_value=[test_template])
    mock.get_template_with_instances = AsyncMock(
        return_value=BoxTemplateReturnWithInstances(**test_template.model_dump(), instances=[])
    )
    mock.create_template = AsyncMock(return_value=test_template)
    return mock


@pytest.fixture
def mock_instance_service(test_box_instance):
    mock = AsyncMock(spec=InstanceService)
    mock.get_instances = AsyncMock(return_value=[test_box_instance])
    mock.get_instance_by_id = AsyncMock(return_value=test_box_instance)
    mock.create_instance = AsyncMock(return_value=test_box_instance)
    mock.move_to_shelf = AsyncMock(return_value=test_box_instance)
    mock.delete_instance = AsyncMock(return_value=None)
    return mock


# ── Box templates ─────────────────────────────────────────────────────────────

def test_get_box_templates_is_public(client, mock_template_service):
    app.dependency_overrides[TemplateService] = lambda: mock_template_service

    resp = client.get("/api.v1/boxes/get-box-templates")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["title"] == "Test Template"
    app.dependency_overrides.pop(TemplateService, None)


def test_create_box_template_authenticated(auth_client, mock_template_service):
    app.dependency_overrides[TemplateService] = lambda: mock_template_service

    resp = auth_client.post(
        "/api.v1/boxes/create-box-template",
        json={"title": "New Box", "price": "10.00", "currency": "rub", "rarity": "common"},
    )
    assert resp.status_code == 201
    assert resp.json()["title"] == "Test Template"
    app.dependency_overrides.pop(TemplateService, None)


def test_create_box_template_unauthenticated_returns_401(client):
    resp = client.post(
        "/api.v1/boxes/create-box-template",
        json={"title": "New Box", "price": "10.00", "currency": "rub", "rarity": "common"},
    )
    assert resp.status_code == 401


def test_get_box_template_by_id(client, mock_template_service):
    app.dependency_overrides[TemplateService] = lambda: mock_template_service

    resp = client.get(f"/api.v1/boxes/get-box-template?template_id={TEST_TEMPLATE_ID}")
    assert resp.status_code == 200
    assert resp.json()["id"] == str(TEST_TEMPLATE_ID)
    app.dependency_overrides.pop(TemplateService, None)


# ── Box instances ─────────────────────────────────────────────────────────────

def test_get_box_instances_authenticated(auth_client, mock_instance_service):
    app.dependency_overrides[InstanceService] = lambda: mock_instance_service

    resp = auth_client.get("/api.v1/boxes/get-box-instances")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["serial_number"] == 1
    app.dependency_overrides.pop(InstanceService, None)


def test_get_box_instances_unauthenticated_returns_401(client):
    resp = client.get("/api.v1/boxes/get-box-instances")
    assert resp.status_code == 401


def test_create_box_instance_success(auth_client, mock_instance_service):
    app.dependency_overrides[InstanceService] = lambda: mock_instance_service

    resp = auth_client.post(
        "/api.v1/boxes/create-box-instance",
        json={
            "template_id": str(TEST_TEMPLATE_ID),
            "shelf_id": None,
            "is_sealed": "sealed",
            "is_public": "private",
            "is_verified": "not verified",
            "content": None,
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["template"]["id"] == str(TEST_TEMPLATE_ID)
    assert data["user_id"] == str(TEST_USER_ID)
    app.dependency_overrides.pop(InstanceService, None)


def test_create_box_instance_unauthenticated_returns_401(client):
    resp = client.post(
        "/api.v1/boxes/create-box-instance",
        json={
            "template_id": str(TEST_TEMPLATE_ID),
            "shelf_id": None,
            "is_sealed": "sealed",
            "is_public": "private",
            "is_verified": "not verified",
        },
    )
    assert resp.status_code == 401


def test_get_box_instance_by_id(auth_client, mock_instance_service):
    app.dependency_overrides[InstanceService] = lambda: mock_instance_service

    resp = auth_client.get(f"/api.v1/boxes/get-box-instance?instance_id={TEST_INSTANCE_ID}")
    assert resp.status_code == 200
    assert resp.json()["id"] == str(TEST_INSTANCE_ID)
    app.dependency_overrides.pop(InstanceService, None)


def test_get_box_instance_not_found_returns_404(auth_client):
    mock = AsyncMock(spec=InstanceService)
    mock.get_instance_by_id = AsyncMock(
        side_effect=HTTPException(status_code=404, detail="Box not found")
    )
    app.dependency_overrides[InstanceService] = lambda: mock

    resp = auth_client.get(f"/api.v1/boxes/get-box-instance?instance_id={uuid.uuid4()}")
    assert resp.status_code == 404
    app.dependency_overrides.pop(InstanceService, None)


# ── Move box to shelf ─────────────────────────────────────────────────────────

def test_move_box_to_shelf_success(auth_client, mock_instance_service):
    app.dependency_overrides[InstanceService] = lambda: mock_instance_service

    resp = auth_client.post(
        f"/api.v1/boxes/move-box-to-shelf?instance_id={TEST_INSTANCE_ID}&shelf_id={TEST_SHELF_ID}"
    )
    assert resp.status_code == 200
    app.dependency_overrides.pop(InstanceService, None)


def test_unshelf_box_no_shelf_id(auth_client, mock_instance_service):
    app.dependency_overrides[InstanceService] = lambda: mock_instance_service

    resp = auth_client.post(
        f"/api.v1/boxes/move-box-to-shelf?instance_id={TEST_INSTANCE_ID}"
    )
    assert resp.status_code == 200
    app.dependency_overrides.pop(InstanceService, None)


# ── Delete box instance ───────────────────────────────────────────────────────

def test_delete_box_instance_success(auth_client, mock_instance_service):
    app.dependency_overrides[InstanceService] = lambda: mock_instance_service

    resp = auth_client.delete(
        f"/api.v1/boxes/delete-box-instance?instance_id={TEST_INSTANCE_ID}"
    )
    assert resp.status_code == 204
    app.dependency_overrides.pop(InstanceService, None)


def test_delete_box_instance_unauthenticated_returns_401(client):
    resp = client.delete(
        f"/api.v1/boxes/delete-box-instance?instance_id={TEST_INSTANCE_ID}"
    )
    assert resp.status_code == 401
