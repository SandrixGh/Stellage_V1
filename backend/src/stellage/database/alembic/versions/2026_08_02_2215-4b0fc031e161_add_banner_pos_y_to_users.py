"""add_banner_pos_y_to_users

Revision ID: 4b0fc031e161
Revises: 3a9fb920f050
Create Date: 2026-08-02 22:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4b0fc031e161'
down_revision: Union[str, Sequence[str], None] = '5c9eb920f070'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('banner_pos_y', sa.Integer(), server_default='50', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'banner_pos_y')
