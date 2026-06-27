"""API integration tests for /api.v1/shelf endpoints."""
import uuid
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException
from starlette.responses import JSONResponse

from stellage.apps.shelves.services import ShelfService
from stellage.apps.shelves.dependecies import get_current_main_shelf, get_current_main_shelf_with_boxes
from stellage.main import app
from tests.conftest import TEST_SHELF_ID, TEST_USER_ID


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_shelf_service(test_shelf, test_shelf_with_boxes):
    mock = AsyncMock(spec=ShelfService)
    mock.create_shelf = AsyncMock(return_value=test_shelf)
    mock.get_shelves = AsyncMock(return_value=[test_shelf])
    mock.get_main_shelf = AsyncMock(return_value=test_shelf)
    mock.get_main_shelf_with_boxes = AsyncMock(return_value=test_shelf_with_boxes)
    mock.get_shelf_by_id = AsyncMock(return_value=test_shelf)
    mock.get_shelf_with_boxes = AsyncMock(return_value=test_shelf_with_boxes)
    mock.delete_shelf = AsyncMock(
        return_value=JSONResponse(content={"detail": "Shelf was deleted successfully"})
    )
    return mock


# ── Create shelf ──────────────────────────────────────────────────────────────

def test_create_shelf_success(auth_client, mock_shelf_service):
    app.dependency_overrides[ShelfService] = lambda: mock_shelf_service

    resp = auth_client.post(
        "/api.v1/shelf/create-shelf",
        json={"title": "My New Shelf", "is_main": False, "is_public": True},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Test Shelf"
    assert data["user_id"] == str(TEST_USER_ID)
    app.dependency_overrides.pop(ShelfService, None)


def test_create_shelf_unauthenticated_returns_401(client, mock_shelf_service):
    app.dependency_overrides[ShelfService] = lambda: mock_shelf_service
    resp = client.post(
        "/api.v1/shelf/create-shelf",
        json={"title": "Shelf", "is_main": False, "is_public": True},
    )
    assert resp.status_code == 401
    app.dependency_overrides.pop(ShelfService, None)


def test_create_shelf_limit_exceeded_returns_409(auth_client):
    mock = AsyncMock(spec=ShelfService)
    mock.create_shelf = AsyncMock(
        side_effect=HTTPException(status_code=409, detail="You already have 2 stellages")
    )
    app.dependency_overrides[ShelfService] = lambda: mock

    resp = auth_client.post(
        "/api.v1/shelf/create-shelf",
        json={"title": "Third Shelf", "is_main": False, "is_public": True},
    )
    assert resp.status_code == 409
    assert "2 stellages" in resp.json()["detail"]
    app.dependency_overrides.pop(ShelfService, None)


def test_create_shelf_title_too_short_returns_422(auth_client):
    resp = auth_client.post(
        "/api.v1/shelf/create-shelf",
        json={"title": "AB", "is_main": False, "is_public": True},
    )
    assert resp.status_code == 422


# ── Get shelves ───────────────────────────────────────────────────────────────

def test_get_shelves_returns_list(auth_client, mock_shelf_service):
    app.dependency_overrides[ShelfService] = lambda: mock_shelf_service

    resp = auth_client.get("/api.v1/shelf/get-shelves")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    assert len(resp.json()) == 1
    app.dependency_overrides.pop(ShelfService, None)


def test_get_shelves_unauthenticated_returns_401(client):
    resp = client.get("/api.v1/shelf/get-shelves")
    assert resp.status_code == 401


# ── Main shelf ────────────────────────────────────────────────────────────────

def test_get_main_shelf_success(auth_client, test_shelf, mock_shelf_service):
    app.dependency_overrides[ShelfService] = lambda: mock_shelf_service
    app.dependency_overrides[get_current_main_shelf] = lambda: test_shelf

    resp = auth_client.get("/api.v1/shelf/main-shelf")
    assert resp.status_code == 200
    assert resp.json()["is_main"] is True
    app.dependency_overrides.pop(ShelfService, None)
    app.dependency_overrides.pop(get_current_main_shelf, None)


def test_get_main_shelf_with_boxes_success(auth_client, test_shelf_with_boxes, mock_shelf_service):
    app.dependency_overrides[ShelfService] = lambda: mock_shelf_service
    app.dependency_overrides[get_current_main_shelf_with_boxes] = lambda: test_shelf_with_boxes

    resp = auth_client.get("/api.v1/shelf/main-shelf-with-boxes")
    assert resp.status_code == 200
    body = resp.json()
    assert "boxes" in body
    assert isinstance(body["boxes"], list)
    app.dependency_overrides.pop(ShelfService, None)
    app.dependency_overrides.pop(get_current_main_shelf_with_boxes, None)


# ── Get shelf by id ───────────────────────────────────────────────────────────

def test_get_shelf_by_id_success(auth_client, mock_shelf_service):
    app.dependency_overrides[ShelfService] = lambda: mock_shelf_service

    resp = auth_client.get(f"/api.v1/shelf/get-shelf-by-id?shelf_id={TEST_SHELF_ID}")
    assert resp.status_code == 200
    assert resp.json()["id"] == str(TEST_SHELF_ID)
    app.dependency_overrides.pop(ShelfService, None)


def test_get_shelf_by_id_not_found_returns_404(auth_client):
    mock = AsyncMock(spec=ShelfService)
    mock.get_shelf_by_id = AsyncMock(
        side_effect=HTTPException(status_code=404, detail="Shelf not found")
    )
    app.dependency_overrides[ShelfService] = lambda: mock

    resp = auth_client.get(f"/api.v1/shelf/get-shelf-by-id?shelf_id={uuid.uuid4()}")
    assert resp.status_code == 404
    app.dependency_overrides.pop(ShelfService, None)


# ── Delete shelf ──────────────────────────────────────────────────────────────

def test_delete_shelf_success(auth_client, mock_shelf_service):
    app.dependency_overrides[ShelfService] = lambda: mock_shelf_service

    resp = auth_client.delete(f"/api.v1/shelf/delete-shelf?shelf_id={TEST_SHELF_ID}")
    assert resp.status_code == 200
    assert "deleted" in resp.json()["detail"].lower()
    app.dependency_overrides.pop(ShelfService, None)


def test_delete_shelf_unauthenticated_returns_401(client):
    resp = client.delete(f"/api.v1/shelf/delete-shelf?shelf_id={TEST_SHELF_ID}")
    assert resp.status_code == 401
