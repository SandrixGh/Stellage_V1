import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from stellage.apps.auth.depends import get_current_user
from stellage.apps.auth.schemas import UserVerifySchema
from stellage.apps.messaging.schemas import (
    AttachmentCompleteRequest,
    AttachmentInitiateRequest,
    AttachmentUploadTarget,
    ConversationPreview,
    EditMessageRequest,
    MessageRead,
    SendMessageRequest,
    UnreadMessagesCount,
)
from stellage.apps.messaging.services import MessageService
from stellage.core.rate_limit import rate_limit

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


@messaging_router.post(
    path="/attachment/initiate",
    status_code=status.HTTP_201_CREATED,
    response_model=AttachmentUploadTarget,
    dependencies=[Depends(rate_limit(max_calls=20, window_seconds=60))],
)
async def initiate_attachment(
    data: AttachmentInitiateRequest,
    service: Annotated[MessageService, Depends(MessageService)],
    user: Annotated[UserVerifySchema, Depends(get_current_user)],
    response: Response,
) -> AttachmentUploadTarget:
    response.headers["Cache-Control"] = "no-store"
    return await service.initiate_attachment(sender=user, data=data)


@messaging_router.post(
    path="/attachment/complete",
    status_code=status.HTTP_201_CREATED,
    response_model=MessageRead,
    dependencies=[Depends(rate_limit(max_calls=30, window_seconds=60))],
)
async def complete_attachment(
    data: AttachmentCompleteRequest,
    service: Annotated[MessageService, Depends(MessageService)],
    user: Annotated[UserVerifySchema, Depends(get_current_user)],
) -> MessageRead:
    return await service.complete_attachment(sender=user, data=data)


@messaging_router.patch(
    path="/{message_id}",
    status_code=status.HTTP_200_OK,
    response_model=MessageRead,
)
async def edit_message(
    message_id: uuid.UUID,
    data: EditMessageRequest,
    service: Annotated[MessageService, Depends(MessageService)],
    user: Annotated[UserVerifySchema, Depends(get_current_user)],
) -> MessageRead:
    return await service.edit_message(user=user, message_id=message_id, data=data)


@messaging_router.delete(
    path="/{message_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_message(
    message_id: uuid.UUID,
    service: Annotated[MessageService, Depends(MessageService)],
    user: Annotated[UserVerifySchema, Depends(get_current_user)],
) -> None:
    await service.delete_message(user=user, message_id=message_id)


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
    before: str | None = None,
) -> list[MessageRead]:
    # Открытие диалога помечает входящие прочитанными; before — догрузка истории.
    return await service.get_conversation(user=user, username=username, before=before)
