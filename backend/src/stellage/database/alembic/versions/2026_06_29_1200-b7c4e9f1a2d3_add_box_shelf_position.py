"""add_box_shelf_position

Revision ID: b7c4e9f1a2d3
Revises: a438be2d18f6
Create Date: 2026-06-29 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b7c4e9f1a2d3'
down_revision: Union[str, Sequence[str], None] = 'a438be2d18f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('box_instances', sa.Column('shelf_row', sa.Integer(), nullable=True))
    op.add_column('box_instances', sa.Column('shelf_col', sa.Integer(), nullable=True))
    op.create_index(
        'uq_box_instances_shelf_position',
        'box_instances',
        ['shelf_id', 'shelf_row', 'shelf_col'],
        unique=True,
        postgresql_where=sa.text("shelf_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index('uq_box_instances_shelf_position', table_name='box_instances')
    op.drop_column('box_instances', 'shelf_col')
    op.drop_column('box_instances', 'shelf_row')
