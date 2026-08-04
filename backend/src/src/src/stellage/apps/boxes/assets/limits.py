"""Лимиты и валидация контента. Константы кода, не настройки окружения:
их изменение — осознанное продуктовое решение, а не деплой-конфиг."""

from stellage.database.enums.asset_kind import AssetKindEnum

PHOTO_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
VIDEO_MIME_TYPES = {"video/mp4", "video/webm"}

ALLOWED_MIME_TYPES: dict[AssetKindEnum, set[str]] = {
    AssetKindEnum.PHOTO: PHOTO_MIME_TYPES,
    AssetKindEnum.VIDEO: VIDEO_MIME_TYPES,
}

MAX_BYTES: dict[AssetKindEnum, int] = {
    AssetKindEnum.PHOTO: 10 * 2**20,   # 10 MB
    AssetKindEnum.VIDEO: 200 * 2**20,  # 200 MB
}

# PENDING + READY: недозагруженные ассеты тоже занимают слот, чтобы нельзя было
# бесконечно плодить initiate.
MAX_ASSETS_PER_BOX = 10
MAX_USER_STORAGE_BYTES = 2 * 2**30  # 2 GB на пользователя

# PENDING старше этого срока считается брошенным и убирается sweeper'ом.
PENDING_TTL_HOURS = 24

# Расширение в ключе объекта выводится ТОЛЬКО из серверной карты — имя файла
# клиента в ключ не попадает никогда.
MIME_EXTENSIONS: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
}

# Сигнатуры первых байтов файла (третий рубеж против MIME-спуфинга после
# POST-политики и head_object). Внешний список — альтернативы (достаточно
# одной), внутренний — условия, обязательные одновременно.
MAGIC_PROBE_BYTES = 16
MAGIC_SIGNATURES: dict[str, list[list[tuple[int, bytes]]]] = {
    "image/jpeg": [[(0, b"\xff\xd8\xff")]],
    "image/png": [[(0, b"\x89PNG\r\n\x1a\n")]],
    "image/gif": [[(0, b"GIF87a")], [(0, b"GIF89a")]],
    "image/webp": [[(0, b"RIFF"), (8, b"WEBP")]],
    "video/mp4": [[(4, b"ftyp")]],
    "video/webm": [[(0, b"\x1a\x45\xdf\xa3")]],
}


def matches_magic(mime: str, head: bytes) -> bool:
    alternatives = MAGIC_SIGNATURES.get(mime)
    if not alternatives:
        return False
    return any(
        all(head[offset:offset + len(sig)] == sig for offset, sig in alternative)
        for alternative in alternatives
    )
