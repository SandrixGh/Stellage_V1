import uuid

from stellage.database.enums.box_sealing import SealingEnum
from stellage.database.enums.visibility import VisibilityEnum


def can_view_box_content(
    *,
    viewer_id: uuid.UUID | None,
    owner_id: uuid.UUID,
    is_public: VisibilityEnum,
    is_sealed: SealingEnum,
    shelf_id: uuid.UUID | None,
    shelf_is_public: bool | None,
) -> bool:
    """Единственный источник истины по видимости содержимого коробки.

    Владелец видит контент всегда. Все остальные (включая анонимов,
    viewer_id=None) — только если коробка публичная, распечатанная И стоит
    на публичной полке. Любой другой случай — контент невидим.
    """
    if viewer_id is not None and viewer_id == owner_id:
        return True

    return (
        is_public == VisibilityEnum.PUBLIC
        and is_sealed == SealingEnum.NOT_SEALED
        and shelf_id is not None
        and bool(shelf_is_public)
    )


def can_see_box(
    *,
    viewer_id: uuid.UUID | None,
    owner_id: uuid.UUID,
    is_public: VisibilityEnum,
    shelf_id: uuid.UUID | None,
    shelf_is_public: bool | None,
) -> bool:
    """Видна ли коробка как ОБЪЕКТ на витрине (в отличие от её содержимого).

    Отличие от can_view_box_content: НЕ требует распечатанности — запечатанная
    коробка на публичной полке видна другим как объект (виден куб и метаданные),
    поэтому её можно, например, лайкнуть. Содержимое при этом остаётся скрытым.
    Владелец видит свою коробку всегда; остальные — только публичную на публичной
    полке (коробка в инвентаре, без полки, чужим не видна).
    """
    if viewer_id is not None and viewer_id == owner_id:
        return True

    return (
        is_public == VisibilityEnum.PUBLIC
        and shelf_id is not None
        and bool(shelf_is_public)
    )
