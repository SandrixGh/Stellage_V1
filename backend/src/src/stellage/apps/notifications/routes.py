from typing import Annotated

from fastapi import APIRouter, Depends, status
from starlette.responses import JSONResponse

from stellage.apps.auth.depends import get_current_user
from stellage.apps.auth.schemas import UserVerifySchema
from stellage.apps.notifications.schemas import NotificationRead, UnreadCount
from stellage.apps.notifications.services import NotificationService

notifications_router = APIRouter(
    prefix="/notifications",
    tags=["notifications"],
)


@notifications_router.get(
    path="",
    status_code=status.HTTP_200_OK,
    response_model=list[NotificationRead],
)
async def list_notifications(
    service: Annotated[NotificationService, Depends(NotificationService)],
    user: Annotated[UserVerifySchema, Depends(get_current_user)],
) -> list[NotificationRead]:
    return await service.list_notifications(user=user)


@notifications_router.get(
    path="/unread-count",
    status_code=status.HTTP_200_OK,
    response_model=UnreadCount,
)
async def unread_count(
    service: Annotated[NotificationService, Depends(NotificationService)],
    user: Annotated[UserVerifySchema, Depends(get_current_user)],
) -> UnreadCount:
    return await service.unread_count(user=user)


@notifications_router.post(
    path="/mark-read",
    status_code=status.HTTP_200_OK,
)
async def mark_all_read(
    service: Annotated[NotificationService, Depends(NotificationService)],
    user: Annotated[UserVerifySchema, Depends(get_current_user)],
) -> JSONResponse:
    await service.mark_all_read(user=user)
    return JSONResponse(content={"message": "Notifications marked as read"})
