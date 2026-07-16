import uuid

from stellage.database.enums.visibility import VisibilityEnum


def can_view_box_content(
    *,
    viewer_id: uuid.UUID | None,
    owner_id: uuid.UUID,
    is_public: VisibilityEnum,
    shelf_id: uuid.UUID | None,
    shelf_is_public: bool | None,
) -> bool:
    """Единственный источник истины по видимости содержимого коробки.

    Запечатанность (is_sealed) — коллекционное состояние («не вскрыто»,
    как запакованная Funko Pop / Lego на полке), а НЕ замок на контент.
    Поэтому она не влияет на видимость: владелец видит контент всегда,
    остальные (включая анонимов, viewer_id=None) — если коробка публичная
    И стоит на публичной полке. Любой другой случай — контент невидим.
    """
    if viewer_id is not None and viewer_id == owner_id:
        return True

    return (
        is_public == VisibilityEnum.PUBLIC
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
    """Видна ли коробка как ОБЪЕКТ на витрине (можно ли, например, лайкнуть).

    С тех пор как запечатанность перестала прятать контент, правило видимости
    объекта и правило видимости содержимого совпадают — делегируем, чтобы не
    держать одно и то же условие в двух местах. Имя оставлено осмысленным для
    вызывающих (лайки/витрина), где речь именно об объекте, а не о контенте.
    """
    return can_view_box_content(
        viewer_id=viewer_id,
        owner_id=owner_id,
        is_public=is_public,
        shelf_id=shelf_id,
        shelf_is_public=shelf_is_public,
    )
