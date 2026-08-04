"""fix_currencyenum_and_boxrarity_values

Revision ID: 9a1b2c3d4e5f
Revises: 8f2ea353g190
Create Date: 2026-08-04 22:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9a1b2c3d4e5f'
down_revision: Union[str, Sequence[str], None] = '8f2ea353g190'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ensure all possible casing variations of CurrencyEnum and BoxRarity exist in DB enums
    op.execute("ALTER TYPE currencyenum ADD VALUE IF NOT EXISTS 'STELLA';")
    op.execute("ALTER TYPE currencyenum ADD VALUE IF NOT EXISTS 'stella';")
    op.execute("ALTER TYPE boxrarity ADD VALUE IF NOT EXISTS 'common';")
    op.execute("ALTER TYPE boxrarity ADD VALUE IF NOT EXISTS 'rare';")
    op.execute("ALTER TYPE boxrarity ADD VALUE IF NOT EXISTS 'golden';")
    op.execute("ALTER TYPE boxrarity ADD VALUE IF NOT EXISTS 'developer''s';")


def downgrade() -> None:
    pass
