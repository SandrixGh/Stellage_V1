import enum


class SealingEnum(str, enum.Enum):
    SEALED = "sealed"
    NOT_SEALED = "not sealed"