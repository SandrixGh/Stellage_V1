import uuid
from fastapi import Depends

from stellage.apps.invites.repositories import InviteRepository
from stellage.apps.invites.schemas import InviteCodeOut, InviteValidateResponse
from stellage.database.models.invite import InviteCode

class InviteService:
    def __init__(self, repo: InviteRepository = Depends(InviteRepository)):
        self.repo = repo

    async def validate_code(self, code: str) -> InviteValidateResponse:
        invite = await self.repo.get_by_code(code)
        if not invite:
            return InviteValidateResponse(
                is_valid=False,
                code=code,
                message="Инвайт-код не найден",
            )
        if not invite.is_active or invite.uses_count >= invite.max_uses:
            return InviteValidateResponse(
                is_valid=False,
                code=code,
                message="Инвайт-код уже использован или истёк",
            )

        inviter_name = None
        if invite.creator:
            inviter_name = invite.creator.nickname or invite.creator.username or invite.creator.email

        return InviteValidateResponse(
            is_valid=True,
            code=code,
            message="Инвайт-код действителен",
            inviter_nickname=inviter_name,
        )

    async def get_user_invites(self, user_id: uuid.UUID) -> list[InviteCodeOut]:
        invites = await self.repo.get_user_invites(user_id)
        return [InviteCodeOut.model_validate(inv) for inv in invites]

    async def create_user_default_invites(self, user_id: uuid.UUID, count: int = 3) -> list[InviteCode]:
        created = []
        for _ in range(count):
            inv = await self.repo.create_invite(creator_id=user_id, max_uses=1)
            created.append(inv)
        return created

    async def generate_extra_invite(self, user_id: uuid.UUID) -> InviteCodeOut:
        inv = await self.repo.create_invite(creator_id=user_id, max_uses=1)
        return InviteCodeOut.model_validate(inv)
