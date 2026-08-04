import uuid

from stellage.database.enums.box_sealing import SealingEnum
from stellage.database.enums.visibility import VisibilityEnum


def can_view_box_content(
    *,
    viewer_id: uuid.UUID | None,
    owner_id: uuid.UUID,
    creator_id: uuid.UUID | None = None,
    is_sealed: SealingEnum = SealingEnum.NOT_SEALED,
    is_public: VisibilityEnum = VisibilityEnum.PUBLIC,
    shelf_id: uuid.UUID | None = None,
    shelf_is_public: bool | None = None,
) -> bool:
    """Единственный источник истины по видимости содержимого коробки.

    Правила:
    1. Создатель коробки (creator_id) видит её содержимое ВСЕГДА (даже если она запечатана).
    2. Если коробка запечатана (is_sealed == SEALED), сторонние пользователи и покупатели
       НЕ видят ее содержимое до тех пор, пока владелец её не распечатает.
    3. Если коробка распечатана (NOT_SEALED), её владелец (owner_id) всегда видит контент.
    4. Для всех остальных: контент виден только если коробка распечатана (NOT_SEALED),
       публичная (is_public == PUBLIC) и стоит на публичной полке.
    """
    if viewer_id is not None:
        if creator_id is not None and viewer_id == creator_id:
            return True
        if viewer_id == owner_id:
            return is_sealed == SealingEnum.NOT_SEALED

    if is_sealed == SealingEnum.SEALED:
        return False

    return (
        is_public == VisibilityEnum.PUBLIC
        and shelf_id is not None
        and bool(shelf_is_public)
    )


def can_see_box(
    *,
    viewer_id: uuid.UUID | None,
    owner_id: uuid.UUID,
    creator_id: uuid.UUID | None = None,
    is_sealed: SealingEnum = SealingEnum.NOT_SEALED,
    is_public: VisibilityEnum = VisibilityEnum.PUBLIC,
    shelf_id: uuid.UUID | None = None,
    shelf_is_public: bool | None = None,
) -> bool:
    """Видна ли коробка как ОБЪЕКТ на витрине."""
    return can_view_box_content(
        viewer_id=viewer_id,
        owner_id=owner_id,
        creator_id=creator_id,
        is_sealed=is_sealed,
        is_public=is_public,
        shelf_id=shelf_id,
        shelf_is_public=shelf_is_public,
    )

