"""Integration tests for Invite System (/api.v1/invites)."""
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime
import uuid
import pytest

from stellage.apps.invites.schemas import InviteValidateResponse, InviteCodeOut
from stellage.apps.invites.services import InviteService
from stellage.main import app

def test_validate_invite_code_valid(client):
    mock_svc = AsyncMock(spec=InviteService)
    mock_svc.validate_code = AsyncMock(
        return_value=InviteValidateResponse(
            is_valid=True,
            code="STELLAGE-TEST-1234",
            message="Инвайт-код действителен",
            inviter_nickname="Pioneer",
        )
    )
    app.dependency_overrides[InviteService] = lambda: mock_svc

    resp = client.get("/api.v1/invites/validate/STELLAGE-TEST-1234")
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_valid"] is True
    assert data["code"] == "STELLAGE-TEST-1234"
    assert data["inviter_nickname"] == "Pioneer"
    app.dependency_overrides.pop(InviteService, None)

def test_validate_invite_code_invalid(client):
    mock_svc = AsyncMock(spec=InviteService)
    mock_svc.validate_code = AsyncMock(
        return_value=InviteValidateResponse(
            is_valid=False,
            code="BAD-CODE",
            message="Инвайт-код не найден",
        )
    )
    app.dependency_overrides[InviteService] = lambda: mock_svc

    resp = client.get("/api.v1/invites/validate/BAD-CODE")
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_valid"] is False
    app.dependency_overrides.pop(InviteService, None)
