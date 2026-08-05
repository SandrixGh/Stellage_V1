import uuid

from stellage.database.enums.box_sealing import SealingEnum
from stellage.database.enums.visibility import VisibilityEnum


def _is_public_val(val: VisibilityEnum | str | None) -> bool:
    if val is None:
        return True
    if isinstance(val, VisibilityEnum):
        return val == VisibilityEnum.PUBLIC
    if isinstance(val, str):
        return val.lower() == "public"
    return True


def _is_sealed_val(val: SealingEnum | str | None) -> bool:
    if val is None:
        return False
    if isinstance(val, SealingEnum):
        return val == SealingEnum.SEALED
    if isinstance(val, str):
        return val.lower() in ("sealed", "is_sealed")
    return False


def can_see_box(
    *,
    viewer_id: uuid.UUID | None,
    owner_id: uuid.UUID,
    creator_id: uuid.UUID | None = None,
    is_public: VisibilityEnum | str = VisibilityEnum.PUBLIC,
    **_kwargs,
) -> bool:
    """Видна ли коробка как ОБЪЕКТ на витрине/стеллаже/в поиске/в профиле.

    Правила:
    1. Владелец коробки (owner_id) видит свою коробку ВСЕГДА.
    2. Создатель шаблона (creator_id) видит её экземпляр ВСЕГДА.
    3. Для всех остальных сторонних зрителей: коробка видна ТОЛЬКО если она публичная (is_public == PUBLIC).
       Приватная коробка (is_public == PRIVATE) полностью скрыта от чужих глаз.
    """
    if viewer_id is not None:
        if viewer_id == owner_id:
            return True
        if creator_id is not None and viewer_id == creator_id:
            return True

    return _is_public_val(is_public)


def can_view_box_content(
    *,
    viewer_id: uuid.UUID | None,
    owner_id: uuid.UUID,
    creator_id: uuid.UUID | None = None,
    is_sealed: SealingEnum | str = SealingEnum.NOT_SEALED,
    is_public: VisibilityEnum | str = VisibilityEnum.PUBLIC,
    shelf_id: uuid.UUID | None = None,
    shelf_is_public: bool | None = None,
) -> bool:
    """Единственный источник истины по видимости НАПОЛНЕНИЯ (текста, ассетов) коробки.

    Правила:
    1. Если сама коробка не видна зрителю (can_see_box == False), контент скрыт.
    2. Создатель коробки (creator_id) видит её содержимое ВСЕГДА (даже если она запечатана).
    3. Если коробка запечатана (is_sealed == SEALED), никто кроме создателя НЕ видит её контент.
    4. Если коробка распечатана (NOT_SEALED):
       - Владелец (owner_id) видит контент всегда.
       - Сторонние зрители видят контент только если коробка публичная (PUBLIC) и стоит на публичной полке.
    """
    if not can_see_box(
        viewer_id=viewer_id,
        owner_id=owner_id,
        creator_id=creator_id,
        is_public=is_public,
    ):
        return False

    # Создатель видит контент всегда (даже в запечатанной коробке)
    if viewer_id is not None and creator_id is not None and viewer_id == creator_id:
        return True

    # Запечатанная коробка скрывает содержимое от всех кроме создателя
    if _is_sealed_val(is_sealed):
        return False

    # Распечатанная коробка: владелец видит всегда
    if viewer_id is not None and viewer_id == owner_id:
        return True

    # Сторонний пользователь: только если коробка публичная и полка публичная
    return (
        _is_public_val(is_public)
        and shelf_id is not None
        and bool(shelf_is_public)
    )
