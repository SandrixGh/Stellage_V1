from typing import Annotated

from fastapi import Depends, HTTPException, status

from stellage.apps.auth.handlers import AuthHandler
from stellage.apps.auth.managers import UserManager
from stellage.apps.auth.schemas import UserVerifySchema
from stellage.apps.auth.utils import get_token_from_cookies


async def get_current_user(
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

    user.session_id = session_id

    return user