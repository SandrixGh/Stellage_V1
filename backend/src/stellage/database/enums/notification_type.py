import enum


class NotificationTypeEnum(str, enum.Enum):
    """Тип уведомления. FOLLOW — на вас подписались; BOX_LIKE — лайкнули вашу
    коробку."""
    FOLLOW = "follow"
    BOX_LIKE = "box_like"
