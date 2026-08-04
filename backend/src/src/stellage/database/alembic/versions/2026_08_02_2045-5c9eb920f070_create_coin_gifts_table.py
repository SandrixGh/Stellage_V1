"""create_coin_gifts_table

Revision ID: 5c9eb920f070
Revises: 4b8fa920f060
Create Date: 2026-08-02 20:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5c9eb920f070'
down_revision: Union[str, Sequence[str], None] = '4b8fa920f060'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'coin_gifts',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('sender_id', sa.UUID(), nullable=False),
        sa.Column('recipient_id', sa.UUID(), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('is_gift_public', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['recipient_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['sender_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_coin_gifts_recipient_id', 'coin_gifts', ['recipient_id'], unique=False)
    op.create_index('ix_coin_gifts_sender_id', 'coin_gifts', ['sender_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_coin_gifts_sender_id', table_name='coin_gifts')
    op.drop_index('ix_coin_gifts_recipient_id', table_name='coin_gifts')
    op.drop_table('coin_gifts')
