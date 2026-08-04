from fastapi import APIRouter, Depends, HTTPException, status

from stellage.apps.auth.depends import get_current_user
from stellage.apps.invites.schemas import (
    InviteCodeOut,
    InviteGenerateResponse,
    InviteValidateResponse,
)
from stellage.apps.invites.services import InviteService
from stellage.database.models.user import User

router = APIRouter(prefix="/invites", tags=["Invites"])

@router.get("/validate/{code}", response_model=InviteValidateResponse)
async def validate_invite_code(
    code: str,
    service: InviteService = Depends(InviteService),
):
    return await service.validate_code(code)

@router.get("/my-codes", response_model=list[InviteCodeOut])
async def get_my_invite_codes(
    user: User = Depends(get_current_user),
    service: InviteService = Depends(InviteService),
):
    return await service.get_user_invites(user.id)

@router.post("/generate", response_model=InviteGenerateResponse)
async def generate_invite_code(
    user: User = Depends(get_current_user),
    service: InviteService = Depends(InviteService),
):
    created = await service.generate_extra_invite(user.id)
    return InviteGenerateResponse(code=created.code, invite=created)
