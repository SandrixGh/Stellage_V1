"""add_study_mode_enabled_to_users

Revision ID: 7e1fa242f080
Revises: 6d0fa131f172
Create Date: 2026-08-04 07:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7e1fa242f080'
down_revision: Union[str, Sequence[str], None] = '6d0fa131f172'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('study_mode_enabled', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'study_mode_enabled')
