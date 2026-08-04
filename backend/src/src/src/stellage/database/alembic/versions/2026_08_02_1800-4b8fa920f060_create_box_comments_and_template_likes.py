"""create_box_comments_and_template_likes

Revision ID: 4b8fa920f060
Revises: 3a9fb920f060
Create Date: 2026-08-02 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4b8fa920f060'
down_revision: Union[str, Sequence[str], None] = '3a9fb920f050'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add stella to currencyenum if not present
    op.execute("ALTER TYPE currencyenum ADD VALUE IF NOT EXISTS 'stella';")

    # 2. Modify box_likes table to support template_id
    op.add_column('box_likes', sa.Column('template_id', sa.UUID(), nullable=True))
    op.create_foreign_key('fk_box_likes_template_id', 'box_likes', 'box_templates', ['template_id'], ['id'], ondelete='CASCADE')
    op.create_index('ix_box_likes_template_id', 'box_likes', ['template_id'], unique=False)
    op.alter_column('box_likes', 'instance_id', existing_type=sa.UUID(), nullable=True)
    op.create_unique_constraint('uq_box_template_like_pair', 'box_likes', ['user_id', 'template_id'])

    # 3. Create box_comments table
    op.create_table(
        'box_comments',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('template_id', sa.UUID(), nullable=True),
        sa.Column('instance_id', sa.UUID(), nullable=True),
        sa.Column('text', sa.String(length=500), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['instance_id'], ['box_instances.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['template_id'], ['box_templates.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_box_comments_instance_id', 'box_comments', ['instance_id'], unique=False)
    op.create_index('ix_box_comments_template_id', 'box_comments', ['template_id'], unique=False)
    op.create_index('ix_box_comments_user_id', 'box_comments', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_box_comments_user_id', table_name='box_comments')
    op.drop_index('ix_box_comments_template_id', table_name='box_comments')
    op.drop_index('ix_box_comments_instance_id', table_name='box_comments')
    op.drop_table('box_comments')

    op.drop_constraint('uq_box_template_like_pair', 'box_likes', type_='unique')
    op.drop_index('ix_box_likes_template_id', table_name='box_likes')
    op.drop_constraint('fk_box_likes_template_id', 'box_likes', type_='foreignkey')
    op.drop_column('box_likes', 'template_id')
