import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class InviteValidateResponse(BaseModel):
    is_valid: bool
    code: str
    message: str
    inviter_nickname: str | None = None

class InviteCodeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    uses_count: int
    max_uses: int
    is_active: bool
    created_at: datetime
    used_at: datetime | None = None
    used_by_id: uuid.UUID | None = None

class InviteGenerateResponse(BaseModel):
    code: str
    invite: InviteCodeOut
