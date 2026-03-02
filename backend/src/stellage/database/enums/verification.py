import enum


class VerifyEnum(str, enum.Enum):
    VERIFIED = "verified"
    NOT_VERIFIED = "not verified"
    ON_CHECKING = "on checking"
    SCAM = "scam"
