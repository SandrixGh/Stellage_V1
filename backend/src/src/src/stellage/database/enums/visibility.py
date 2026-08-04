import enum


class VisibilityEnum(str, enum.Enum):
    PUBLIC = "public"
    PRIVATE = "private"
    LIMITED = "limited"
    BY_THE_LINK = "by the link"