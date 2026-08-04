import datetime
from typing import Annotated

from fastapi import Depends, HTTPException, Response, status
from starlette.requests import Request

from stellage.apps.auth.handlers import AuthHandler
from stellage.apps.auth.managers import UserManager
from stellage.apps.auth.schemas import UserVerifySchema
from stellage.apps.auth.utils import get_token_from_cookies
from stellage.apps.profile.managers import ProfileManager
from stellage.core.settings import settings

LAST_SEEN_THROTTLE_SECONDS = 60

# Re-issue the access token once it has passed this fraction of its lifetime.
# This turns the fixed-lifetime token into a sliding session so that actively
# browsing users are never logged out at the hard expiry mark.
TOKEN_REFRESH_THRESHOLD_RATIO = 0.5


async def get_current_user(
    response: Response,
    token: Annotated[
        str,
        Depends(get_token_from_cookies)
    ],
    handler: Annotated[
        AuthHandler,
        Depends(AuthHandler)
    ],
    manager: Annotated[
        UserManager,
        Depends(UserManager)
    ],
    profile_manager: Annotated[
        ProfileManager,
        Depends(ProfileManager)
    ],
) -> UserVerifySchema:
    decoded_token = await handler.decode_access_token(token)

    user_id = decoded_token["user_id"]
    session_id = decoded_token["session_id"]

    if not await manager.get_access_token(
        user_id=user_id,
        session_id=session_id,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid"
        )

    user = await manager.get_user_by_id(user_id=user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    # Деактивированный аккаунт (бан) не должен работать по живой сессии до
    # истечения TTL токена — рвём немедленно.
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is disabled"
        )

    # Sliding session: once the token is past the refresh threshold of its
    # lifetime, transparently issue a fresh one (same session_id) and bump the
    # Redis TTL + cookie so active users stay logged in indefinitely.
    try:
        exp = decoded_token.get("exp")
        if exp is not None:
            now_ts = datetime.datetime.now(datetime.UTC).timestamp()
            remaining = exp - now_ts
            if remaining < settings.access_token_expire * TOKEN_REFRESH_THRESHOLD_RATIO:
                new_token, _ = await handler.create_access_token(
                    user_id=user_id,
                    session_id=session_id,
                )
                await manager.store_access_token(
                    user_id=user_id,
                    token=new_token,
                    session_id=session_id,
                )
                response.set_cookie(
                    key="Authorization",
                    value=new_token,
                    httponly=True,
                    secure=settings.cookie_secure,
                    samesite="lax",
                    max_age=settings.access_token_expire,
                )
    except Exception:
        pass

    try:
        async with manager.redis.get_client() as client:
            last_seen_key = f"last_seen:{user_id}"
            if not await client.get(last_seen_key):
                now = datetime.datetime.now(datetime.UTC)
                await profile_manager.update_user_fields(
                    user_id=user_id,
                    last_seen_at=now,
                )
                await client.set(last_seen_key, "1", ex=LAST_SEEN_THROTTLE_SECONDS)
    except Exception:
        pass

    user.session_id = session_id
    return user


async def get_optional_current_user(
    request: Request,
    handler: Annotated[
        AuthHandler,
        Depends(AuthHandler)
    ],
    manager: Annotated[
        UserManager,
        Depends(UserManager)
    ],
) -> UserVerifySchema | None:
    """Мягкая версия get_current_user для публичных эндпоинтов: анонима и любой
    невалидный/просроченный токен превращает в None вместо 401. Без sliding-refresh
    и побочных эффектов — только идентификация зрителя для проверки видимости."""
    token = request.cookies.get("Authorization")
    if not token:
        return None

    try:
        decoded_token = await handler.decode_access_token(token)
    except HTTPException:
        return None

    user_id = decoded_token.get("user_id")
    session_id = decoded_token.get("session_id")
    if not user_id or not session_id:
        return None

    if not await manager.get_access_token(
        user_id=user_id,
        session_id=session_id,
    ):
        return None

    user = await manager.get_user_by_id(user_id=user_id)
    if not user or not user.is_active:
        return None

    user.session_id = session_id
    return user