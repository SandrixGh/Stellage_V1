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


class LikeState(BaseModel):
    """Состояние лайков коробки: счётчик + лайкнул ли текущий зритель
    (None для анонима)."""
    likes: int = 0
    is_liked: bool | None = None


class LikeActionResult(BaseModel):
    """Результат лайка/снятия лайка."""
    is_liked: bool
    likes: int
