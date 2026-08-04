"""Схемы публичного детального просмотра коробки.

Вынесены отдельно от instances.schemas, чтобы не создавать цикл импортов
instances.schemas → profile.schemas → shelves.schemas → instances.schemas.
Этот модуль импортируется из роут/сервис-слоя (после старта приложения), когда
обе зависимые схемы уже полностью построены.
"""
from pydantic import BaseModel

from stellage.apps.boxes.instances.schemas import BoxInstanceWithTemplate
from stellage.apps.profile.schemas import PublicUser


class BoxPublicView(BaseModel):
    """Детальный публичный просмотр коробки: сама коробка + публичная карточка
    владельца + флаг is_owner (для показа действий владельца). Роут отдаёт эту
    схему только если зритель вправе видеть коробку (иначе 404)."""
    box: BoxInstanceWithTemplate
    owner: PublicUser
    is_owner: bool = False
