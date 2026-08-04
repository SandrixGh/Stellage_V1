import secrets
import string
import uuid
from datetime import datetime
from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from stellage.core.core_dependencies.db_dependency import DBDependency
from stellage.database.models.invite import InviteCode

def generate_random_invite_code(prefix: str = "STELLAGE") -> str:
    chars = string.ascii_uppercase + string.digits
    chars = chars.replace('O', '').replace('0', '').replace('I', '').replace('1', '')
    part1 = ''.join(secrets.choice(chars) for _ in range(4))
    part2 = ''.join(secrets.choice(chars) for _ in range(4))
    return f"{prefix}-{part1}-{part2}"

class InviteRepository:
    def __init__(self, db: DBDependency = Depends(DBDependency)):
        self.db = db

    async def get_by_code(self, code: str) -> InviteCode | None:
        async with self.db.db_session() as session:
            stmt = (
                select(InviteCode)
                .options(selectinload(InviteCode.creator))
                .where(InviteCode.code == code.strip().upper())
            )
            result = await session.execute(stmt)
            return result.scalar_one_or_none()

    async def get_user_invites(self, user_id: uuid.UUID) -> list[InviteCode]:
        async with self.db.db_session() as session:
            stmt = (
                select(InviteCode)
                .where(InviteCode.creator_id == user_id)
                .order_by(InviteCode.created_at.desc())
            )
            result = await session.execute(stmt)
            return list(result.scalars().all())

    async def create_invite(
        self,
        creator_id: uuid.UUID | None = None,
        max_uses: int = 1,
        code_override: str | None = None,
    ) -> InviteCode:
        code = code_override or generate_random_invite_code()
        async with self.db.db_session() as session:
            existing_stmt = select(InviteCode).where(InviteCode.code == code)
            existing = (await session.execute(existing_stmt)).scalar_one_or_none()
            while existing:
                code = generate_random_invite_code()
                existing_stmt = select(InviteCode).where(InviteCode.code == code)
                existing = (await session.execute(existing_stmt)).scalar_one_or_none()

            invite = InviteCode(
                code=code,
                creator_id=creator_id,
                max_uses=max_uses,
                uses_count=0,
                is_active=True,
            )
            session.add(invite)
            await session.commit()
            await session.refresh(invite)
            return invite

    async def use_invite(self, invite_id: uuid.UUID, user_id: uuid.UUID) -> InviteCode:
        async with self.db.db_session() as session:
            stmt = select(InviteCode).where(InviteCode.id == invite_id)
            invite = (await session.execute(stmt)).scalar_one()
            invite.uses_count += 1
            invite.used_by_id = user_id
            invite.used_at = datetime.utcnow()
            if invite.uses_count >= invite.max_uses:
                invite.is_active = False
            await session.commit()
            await session.refresh(invite)
            return invite
