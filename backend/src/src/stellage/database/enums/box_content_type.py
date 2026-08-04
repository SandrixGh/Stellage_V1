import enum


class BoxContentTypeEnum(str, enum.Enum):
    """Тип наполнения коробки — выводится из реального содержимого (текст +
    ассеты), а не хранится отдельным полем: так он всегда консистентен с тем,
    что внутри. Рисует глиф на грани куба, чтобы было видно, что за коробка."""
    EMPTY = "empty"
    TEXT = "text"
    PHOTO = "photo"
    VIDEO = "video"
    MIXED = "mixed"
