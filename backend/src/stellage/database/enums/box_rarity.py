import enum


class BoxRarity(str, enum.Enum):
    COMMON = "common"
    RARE = "rare"
    GOLDEN = "golden"
    DEV = "developer's"
