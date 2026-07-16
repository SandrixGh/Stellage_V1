from typing import Annotated

from fastapi import APIRouter, Depends, status

from stellage.apps.auth.depends import get_current_user
from stellage.apps.auth.schemas import UserVerifySchema
from stellage.apps.messaging.schemas import (
    ConversationPreview,
    MessageRead,
    SendMessageRequest,
    UnreadMessagesCount,
)
from stellage.apps.messaging.services import MessageService

messaging_router = APIRouter(
    prefix="/messages",
    tags=["messages"],
)


@messaging_router.post(
    path="/send",
    status_code=status.HTTP_201_CREATED,
    response_model=MessageRead,
)
async def send_message(
    data: SendMessageRequest,
    service: Annotated[MessageService, Depends(MessageService)],
    user: Annotated[UserVerifySchema, Depends(get_current_user)],
) -> MessageRead:
    return await service.send_message(sender=user, data=data)


@messaging_router.get(
    path="/conversations",
    status_code=status.HTTP_200_OK,
    response_model=list[ConversationPreview],
)
async def list_conversations(
    service: Annotated[MessageService, Depends(MessageService)],
    user: Annotated[UserVerifySchema, Depends(get_current_user)],
) -> list[ConversationPreview]:
    return await service.list_conversations(user=user)


@messaging_router.get(
    path="/unread-count",
    status_code=status.HTTP_200_OK,
    response_model=UnreadMessagesCount,
)
async def unread_count(
    service: Annotated[MessageService, Depends(MessageService)],
    user: Annotated[UserVerifySchema, Depends(get_current_user)],
) -> UnreadMessagesCount:
    return await service.unread_count(user=user)


@messaging_router.get(
    path="/with/{username}",
    status_code=status.HTTP_200_OK,
    response_model=list[MessageRead],
)
async def get_conversation(
    username: str,
    service: Annotated[MessageService, Depends(MessageService)],
    user: Annotated[UserVerifySchema, Depends(get_current_user)],
) -> list[MessageRead]:
    # Открытие диалога помечает входящие прочитанными.
    return await service.get_conversation(user=user, username=username)
