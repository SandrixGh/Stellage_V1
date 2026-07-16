import uuid

from pydantic import BaseModel


class FollowCounts(BaseModel):
    """Счётчики подписок для витрины профиля + отношение текущего зрителя."""
    followers: int = 0
    following: int = 0
    # Подписан ли текущий пользователь на просматриваемого (None для анонима
    # и для своего же профиля).
    is_following: bool | None = None


class FollowActionResult(BaseModel):
    """Результат подписки/отписки: актуальное отношение и число подписчиков."""
    is_following: bool
    followers: int
