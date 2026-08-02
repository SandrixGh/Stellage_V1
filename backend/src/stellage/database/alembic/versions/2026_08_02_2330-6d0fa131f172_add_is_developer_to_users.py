"""add_is_developer_to_users

Revision ID: 6d0fa131f172
Revises: 4b0fc031e161
Create Date: 2026-08-02 23:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6d0fa131f172'
down_revision: Union[str, Sequence[str], None] = '4b0fc031e161'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('is_developer', sa.Boolean(), server_default='false', nullable=False))
    op.execute("UPDATE users SET is_developer = true WHERE email IN ('alexanderak.0500@gmail.com', 'alexanderak.0501@gmail.com')")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'is_developer')
