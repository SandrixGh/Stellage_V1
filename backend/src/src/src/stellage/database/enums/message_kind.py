import enum


class MessageKindEnum(str, enum.Enum):
    """Тип сообщения в диалоге. TEXT — обычное (текст и/или вложение),
    GIFT — системная карточка о подаренной коробке."""
    TEXT = "text"
    GIFT = "gift"
