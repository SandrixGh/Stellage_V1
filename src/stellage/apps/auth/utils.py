from fastapi import HTTPException, status
from starlette.requests import Request


async def get_token_from_cookies(
    request: Request
) -> str:
    token = request.get("Authorization")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is missing"
        )

    return token