import logging
from typing import Any

from pydantic import BaseModel, ValidationError

logger = logging.getLogger(__name__)


def pack_to_json(data: BaseModel) -> str:
    return data.model_dump_json()

def unpack_from_json(
    json_str: str,
    schema: type[BaseModel]
) -> Any | None:
    """Десериализует запись кэша. Битую/несовместимую запись (например, после
    деплоя с изменением схемы — в Redis остаются старые записи на TTL) трактуем
    как «в кэше нет» (None), чтобы вызывающий сделал fallback к БД, а не отдал
    500. Раньше несовместимость прорывалась как ValidationError в эндпоинт."""
    try:
        return schema.model_validate_json(json_str)
    except (ValidationError, ValueError):
        logger.warning("dropping incompatible cache entry for %s", schema.__name__)
        return None