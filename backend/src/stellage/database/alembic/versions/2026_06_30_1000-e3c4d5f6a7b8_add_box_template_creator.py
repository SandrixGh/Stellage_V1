"""add_box_template_creator

Revision ID: e3c4d5f6a7b8
Revises: d2b3c4e5f6a7
Create Date: 2026-06-30 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'e3c4d5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'd2b3c4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'box_templates',
        sa.Column('creator_id', sa.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        'fk_box_templates_creator_id_users',
        'box_templates',
        'users',
        ['creator_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint(
        'fk_box_templates_creator_id_users',
        'box_templates',
        type_='foreignkey',
    )
    op.drop_column('box_templates', 'creator_id')
