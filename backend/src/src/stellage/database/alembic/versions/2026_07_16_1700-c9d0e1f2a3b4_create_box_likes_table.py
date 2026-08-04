"""create_box_likes_table

Revision ID: c9d0e1f2a3b4
Revises: b8c9d0e1f2a3
Create Date: 2026-07-16 17:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'c9d0e1f2a3b4'
down_revision: Union[str, Sequence[str], None] = 'b8c9d0e1f2a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'box_likes',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            'user_id',
            sa.UUID(as_uuid=True),
            sa.ForeignKey('users.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column(
            'instance_id',
            sa.UUID(as_uuid=True),
            sa.ForeignKey('box_instances.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint('user_id', 'instance_id', name='uq_box_like_pair'),
    )

    op.create_index('ix_box_likes_user_id', 'box_likes', ['user_id'])
    op.create_index('ix_box_likes_instance_id', 'box_likes', ['instance_id'])


def downgrade() -> None:
    op.drop_index('ix_box_likes_instance_id', table_name='box_likes')
    op.drop_index('ix_box_likes_user_id', table_name='box_likes')
    op.drop_table('box_likes')
