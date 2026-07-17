import asyncio
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect

from stellage.apps.auth.handlers import AuthHandler
from stellage.apps.auth.managers import UserManager
from stellage.apps.messaging.events import user_channel
from stellage.core.core_dependencies.redis_dependency import RedisDependency

logger = logging.getLogger(__name__)

messaging_ws_router = APIRouter(prefix="/messages", tags=["messages"])

# Код закрытия для неаутентифицированного сокета (4000-4999 — прикладной диапазон).
WS_UNAUTHORIZED = 4401


async def _authenticate(
    websocket: WebSocket,
    handler: AuthHandler,
    manager: UserManager,
) -> str | None:
    """user_id по cookie сокета, тем же путём, что и HTTP get_current_user:
    декодируем access-токен и проверяем, что сессия ещё жива в Redis. Любой
    сбой → None (сокет закроется). Побочных эффектов (sliding-refresh, last_seen)
    у сокета нет — он живёт минуты и переоткрывается."""
    token = websocket.cookies.get("Authorization")
    if not token:
        return None
    try:
        decoded = await handler.decode_access_token(token)
    except Exception:
        return None

    user_id = decoded.get("user_id")
    session_id = decoded.get("session_id")
    if not user_id or not session_id:
        return None
    if not await manager.get_access_token(user_id=user_id, session_id=session_id):
        return None
    return user_id


@messaging_ws_router.websocket("/ws")
async def messages_ws(
    websocket: WebSocket,
    handler: Annotated[AuthHandler, Depends(AuthHandler)],
    manager: Annotated[UserManager, Depends(UserManager)],
    redis: Annotated[RedisDependency, Depends(RedisDependency)],
) -> None:
    """Личный real-time канал: сервер шлёт клиенту события чата (новое сообщение,
    правка, удаление, прочтение), опубликованные в Redis-канал этого
    пользователя. Клиент ничего осмысленного не шлёт — при отправке/правке ходит
    обычным HTTP; сокет только для доставки. Ping-фреймы клиента игнорируем."""
    user_id = await _authenticate(websocket, handler, manager)
    if user_id is None:
        await websocket.close(code=WS_UNAUTHORIZED)
        return

    await websocket.accept()
    channel = user_channel(user_id)

    async with redis.get_client() as client:
        pubsub = client.pubsub()
        await pubsub.subscribe(channel)
        try:
            # Две задачи: качаем сообщения из Redis в сокет и читаем сокет (чтобы
            # ловить закрытие/пинги). Что первым завершилось — рвём соединение.
            reader = asyncio.create_task(_pump_redis_to_ws(pubsub, websocket))
            receiver = asyncio.create_task(_drain_ws(websocket))
            done, pending = await asyncio.wait(
                {reader, receiver},
                return_when=asyncio.FIRST_COMPLETED,
            )
            for task in pending:
                task.cancel()
        except WebSocketDisconnect:
            pass
        except Exception:
            logger.warning("messages ws loop error", exc_info=False)
        finally:
            try:
                await pubsub.unsubscribe(channel)
                await pubsub.aclose()
            except Exception:
                pass


async def _pump_redis_to_ws(pubsub, websocket: WebSocket) -> None:
    """Пересылает сообщения Redis pub/sub клиенту как есть (payload уже JSON).
    Обрыв сокета — штатное завершение задачи."""
    try:
        async for message in pubsub.listen():
            if message is None or message.get("type") != "message":
                continue
            data = message.get("data")
            if data is None:
                continue
            await websocket.send_text(data)
    except WebSocketDisconnect:
        return


async def _drain_ws(websocket: WebSocket) -> None:
    """Читаем входящие фреймы, чтобы детектить закрытие. Содержимое не важно —
    клиент по сокету команд не шлёт (всё через HTTP). Отключение клиента —
    штатное завершение задачи, а не ошибка."""
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        return
