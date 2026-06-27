"""API integration tests for /api.v1/auth endpoints."""
from unittest.mock import AsyncMock

from fastapi import HTTPException
from starlette.responses import JSONResponse

from stellage.apps.auth.services import UserService
from stellage.main import app


# ── Helpers ───────────────────────────────────────────────────────────────────

def _mock_user_service(test_user_return=None):
    mock = AsyncMock(spec=UserService)
    mock.register_user = AsyncMock(return_value=test_user_return)
    mock.login_user = AsyncMock(
        return_value=JSONResponse(content={"message": "Login is successful"})
    )
    mock.logout_user = AsyncMock(
        return_value=JSONResponse(content={"message": "Logged out"})
    )
    mock.delete_account = AsyncMock(
        return_value=JSONResponse(content={"message": "Deleting the account was successful"})
    )
    return mock


# ── Registration ──────────────────────────────────────────────────────────────

def test_register_success(client, test_user_return):
    mock_svc = _mock_user_service(test_user_return)
    app.dependency_overrides[UserService] = lambda: mock_svc

    resp = client.post(
        "/api.v1/auth/register",
        json={"email": "new@example.com", "password": "strongpass1"},
    )
    assert resp.status_code == 201
    assert resp.json()["email"] == "test@example.com"
    app.dependency_overrides.pop(UserService, None)


def test_register_password_too_short_returns_422(client):
    resp = client.post(
        "/api.v1/auth/register",
        json={"email": "user@example.com", "password": "short"},
    )
    assert resp.status_code == 422


def test_register_invalid_email_returns_422(client):
    resp = client.post(
        "/api.v1/auth/register",
        json={"email": "not-an-email", "password": "validpass1"},
    )
    assert resp.status_code == 422


def test_register_duplicate_email_returns_400(client):
    mock_svc = AsyncMock(spec=UserService)
    mock_svc.register_user = AsyncMock(
        side_effect=HTTPException(status_code=400, detail="User already exists")
    )
    app.dependency_overrides[UserService] = lambda: mock_svc

    resp = client.post(
        "/api.v1/auth/register",
        json={"email": "dup@example.com", "password": "strongpass1"},
    )
    assert resp.status_code == 400
    assert "already exists" in resp.json()["detail"]
    app.dependency_overrides.pop(UserService, None)


# ── Login ─────────────────────────────────────────────────────────────────────

def test_login_success(client):
    response_with_cookie = JSONResponse(content={"message": "Login is successful"})
    response_with_cookie.set_cookie("Authorization", "faketoken", httponly=True)
    mock_svc = AsyncMock(spec=UserService)
    mock_svc.login_user = AsyncMock(return_value=response_with_cookie)
    app.dependency_overrides[UserService] = lambda: mock_svc

    resp = client.post(
        "/api.v1/auth/login",
        json={"email": "test@example.com", "password": "correctpass1"},
    )
    assert resp.status_code == 200
    assert resp.json()["message"] == "Login is successful"
    app.dependency_overrides.pop(UserService, None)


def test_login_wrong_password_returns_401(client):
    mock_svc = AsyncMock(spec=UserService)
    mock_svc.login_user = AsyncMock(
        side_effect=HTTPException(status_code=401, detail="Wrong email or password")
    )
    app.dependency_overrides[UserService] = lambda: mock_svc

    resp = client.post(
        "/api.v1/auth/login",
        json={"email": "x@example.com", "password": "wrongpassword"},
    )
    assert resp.status_code == 401
    app.dependency_overrides.pop(UserService, None)


def test_login_unverified_user_returns_401(client):
    mock_svc = AsyncMock(spec=UserService)
    mock_svc.login_user = AsyncMock(
        side_effect=HTTPException(status_code=401, detail="Exist user is not verified")
    )
    app.dependency_overrides[UserService] = lambda: mock_svc

    resp = client.post(
        "/api.v1/auth/login",
        json={"email": "unverified@example.com", "password": "strongpass1"},
    )
    assert resp.status_code == 401
    assert "not verified" in resp.json()["detail"]
    app.dependency_overrides.pop(UserService, None)


def test_login_missing_body_returns_422(client):
    resp = client.post("/api.v1/auth/login", json={})
    assert resp.status_code == 422


# ── Authenticated endpoints ───────────────────────────────────────────────────

def test_get_user_authenticated(auth_client, test_user):
    resp = auth_client.get("/api.v1/auth/get-user")
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == test_user.email
    assert data["id"] == str(test_user.id)


def test_get_user_unauthenticated_returns_401(client):
    resp = client.get("/api.v1/auth/get-user")
    assert resp.status_code == 401


def test_logout_success(auth_client):
    mock_svc = AsyncMock(spec=UserService)
    mock_svc.logout_user = AsyncMock(
        return_value=JSONResponse(content={"message": "Logged out"})
    )
    app.dependency_overrides[UserService] = lambda: mock_svc

    resp = auth_client.post("/api.v1/auth/logout")
    assert resp.status_code == 200
    assert resp.json()["message"] == "Logged out"
    app.dependency_overrides.pop(UserService, None)


def test_delete_account_success(auth_client):
    mock_svc = AsyncMock(spec=UserService)
    mock_svc.delete_account = AsyncMock(
        return_value=JSONResponse(
            content={"message": "Deleting the account was successful"}
        )
    )
    app.dependency_overrides[UserService] = lambda: mock_svc

    resp = auth_client.delete("/api.v1/auth/delete-account")
    assert resp.status_code == 200
    app.dependency_overrides.pop(UserService, None)


def test_logout_unauthenticated_returns_401(client):
    resp = client.post("/api.v1/auth/logout")
    assert resp.status_code == 401
