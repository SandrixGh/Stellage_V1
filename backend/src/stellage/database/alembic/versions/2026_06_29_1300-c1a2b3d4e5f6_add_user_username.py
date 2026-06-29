"""add_user_username

Revision ID: c1a2b3d4e5f6
Revises: b7c4e9f1a2d3
Create Date: 2026-06-29 13:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'c1a2b3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'b7c4e9f1a2d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('username', sa.String(length=30), nullable=True))
    # Partial-friendly unique index: Postgres allows multiple NULLs, so users
    # without a chosen username don't collide.
    op.create_index('uq_users_username', 'users', ['username'], unique=True)


def downgrade() -> None:
    op.drop_index('uq_users_username', table_name='users')
    op.drop_column('users', 'username')
