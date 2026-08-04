import enum


class NotificationTypeEnum(str, enum.Enum):
    """Тип уведомления. FOLLOW — на вас подписались; BOX_LIKE — лайкнули вашу
    коробку; MESSAGE — вам написали личное сообщение; GIFT — вам подарили
    коробку."""
    FOLLOW = "follow"
    BOX_LIKE = "box_like"
    MESSAGE = "message"
    GIFT = "gift"
