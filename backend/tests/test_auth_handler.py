"""Unit tests for AuthHandler — pure Python, no I/O."""
import asyncio
import datetime
import uuid

import jwt
import pytest

from stellage.apps.auth.handlers import AuthHandler
from tests.conftest import run


@pytest.fixture
def handler():
    return AuthHandler()


# ── Password hashing ──────────────────────────────────────────────────────────

def test_hash_password_returns_non_empty_string(handler):
    hashed = run(handler.get_hashed_password("mypassword1"))
    assert isinstance(hashed, str)
    assert len(hashed) > 0


def test_hash_password_is_not_plain_text(handler):
    hashed = run(handler.get_hashed_password("mypassword1"))
    assert hashed != "mypassword1"


def test_hash_password_is_different_each_time(handler):
    h1 = run(handler.get_hashed_password("same_password1"))
    h2 = run(handler.get_hashed_password("same_password1"))
    assert h1 != h2  # bcrypt random salt


def test_verify_password_correct(handler):
    hashed = run(handler.get_hashed_password("correctpass1"))
    assert run(handler.verify_password("correctpass1", hashed)) is True


def test_verify_password_wrong(handler):
    hashed = run(handler.get_hashed_password("correctpass1"))
    assert run(handler.verify_password("wrongpass999", hashed)) is False


# ── JWT ───────────────────────────────────────────────────────────────────────

def test_create_access_token_returns_named_tuple(handler):
    result = run(handler.create_access_token(user_id=uuid.uuid4()))
    assert result.encoded_jwt
    assert isinstance(result.session_id, str)


def test_create_access_token_different_sessions_each_call(handler):
    uid = uuid.uuid4()
    t1 = run(handler.create_access_token(uid))
    t2 = run(handler.create_access_token(uid))
    assert t1.session_id != t2.session_id


def test_decode_token_contains_user_id(handler):
    uid = uuid.uuid4()
    token_tuple = run(handler.create_access_token(uid))
    payload = run(handler.decode_access_token(token_tuple.encoded_jwt))
    assert payload["user_id"] == str(uid)


def test_decode_token_contains_session_id(handler):
    uid = uuid.uuid4()
    token_tuple = run(handler.create_access_token(uid))
    payload = run(handler.decode_access_token(token_tuple.encoded_jwt))
    assert payload["session_id"] == token_tuple.session_id


def test_decode_invalid_token_raises_401(handler):
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        run(handler.decode_access_token("totally.invalid.token"))
    assert exc_info.value.status_code == 401


def test_decode_expired_token_raises_401(handler):
    from fastapi import HTTPException
    uid = uuid.uuid4()
    expired_payload = {
        "exp": datetime.datetime(2000, 1, 1, tzinfo=datetime.UTC),
        "sub": str(uid),
        "user_id": str(uid),
        "session_id": str(uuid.uuid4()),
    }
    expired_token = jwt.encode(expired_payload, handler.secret, algorithm="HS256")
    with pytest.raises(HTTPException) as exc_info:
        run(handler.decode_access_token(expired_token))
    assert exc_info.value.status_code == 401


# ── Confirmation code ─────────────────────────────────────────────────────────

def test_confirmation_code_correct_length(handler):
    code = run(handler.generate_confirmation_code(6))
    assert len(code) == 6


def test_confirmation_code_only_uppercase_alphanumeric(handler):
    import string
    code = run(handler.generate_confirmation_code(20))
    allowed = set(string.ascii_uppercase + string.digits)
    assert all(c in allowed for c in code)


def test_confirmation_code_different_each_time(handler):
    codes = {run(handler.generate_confirmation_code(10)) for _ in range(10)}
    assert len(codes) > 1
