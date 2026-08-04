from collections.abc import Iterable

from stellage.database.enums.asset_kind import AssetKindEnum
from stellage.database.enums.box_content_type import BoxContentTypeEnum


def resolve_content_type(
    has_text: bool,
    asset_kinds: Iterable[AssetKindEnum | str],
) -> BoxContentTypeEnum:
    """Выводит тип наполнения коробки из реального содержимого.

    Один вид контента → его тип; несколько разных одновременно → MIXED;
    ничего → EMPTY. Тип не хранится в БД — считается на лету из текста и
    ассетов, поэтому всегда совпадает с тем, что действительно внутри.
    """
    kinds: set[str] = {str(getattr(k, "value", k)) for k in asset_kinds}
    has_photo = AssetKindEnum.PHOTO.value in kinds
    has_video = AssetKindEnum.VIDEO.value in kinds

    present = sum((has_text, has_photo, has_video))
    if present == 0:
        return BoxContentTypeEnum.EMPTY
    if present > 1:
        return BoxContentTypeEnum.MIXED
    if has_video:
        return BoxContentTypeEnum.VIDEO
    if has_photo:
        return BoxContentTypeEnum.PHOTO
    return BoxContentTypeEnum.TEXT
