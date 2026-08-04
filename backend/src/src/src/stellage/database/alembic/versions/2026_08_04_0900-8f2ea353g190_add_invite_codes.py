"""add_invite_codes_table_and_invited_by_id

Revision ID: 8f2ea353g190
Revises: 7e1fa242f080
Create Date: 2026-08-04 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8f2ea353g190'
down_revision: Union[str, Sequence[str], None] = '7e1fa242f080'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add invited_by_id to users
    op.add_column('users', sa.Column('invited_by_id', sa.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'fk_users_invited_by_id_users',
        'users', 'users',
        ['invited_by_id'], ['id'],
        ondelete='SET NULL'
    )

    # 2. Create invite_codes table
    op.create_table(
        'invite_codes',
        sa.Column('id', sa.UUID(as_uuid=True), nullable=False),
        sa.Column('code', sa.String(length=32), nullable=False),
        sa.Column('creator_id', sa.UUID(as_uuid=True), nullable=True),
        sa.Column('used_by_id', sa.UUID(as_uuid=True), nullable=True),
        sa.Column('uses_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('max_uses', sa.Integer(), server_default='1', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['creator_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['used_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_invite_codes_code'), 'invite_codes', ['code'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_invite_codes_code'), table_name='invite_codes')
    op.drop_table('invite_codes')
    op.drop_constraint('fk_users_invited_by_id_users', 'users', type_='foreignkey')
    op.drop_column('users', 'invited_by_id')
