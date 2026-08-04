"""create_messages_table_and_extend_notification_enum

Revision ID: e1f2a3b4c5d6
Revises: d0e1f2a3b4c5
Create Date: 2026-07-16 19:00:00.000000

Добавляет таблицу личных сообщений (messages) и расширяет notificationtypeenum
значениями MESSAGE и GIFT (для уведомлений о сообщении и подарке коробки).
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, Sequence[str], None] = 'd0e1f2a3b4c5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Новые значения enum. IF NOT EXISTS — идемпотентно; в этой миграции значения
    # только добавляются, но не используются в INSERT, поэтому транзакция ок.
    op.execute("ALTER TYPE notificationtypeenum ADD VALUE IF NOT EXISTS 'MESSAGE'")
    op.execute("ALTER TYPE notificationtypeenum ADD VALUE IF NOT EXISTS 'GIFT'")

    op.create_table(
        'messages',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            'sender_id',
            sa.UUID(as_uuid=True),
            sa.ForeignKey('users.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column(
            'recipient_id',
            sa.UUID(as_uuid=True),
            sa.ForeignKey('users.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column('text', sa.String(length=4000), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.false()),
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
    )

    op.create_index('ix_messages_sender_id', 'messages', ['sender_id'])
    op.create_index('ix_messages_recipient_id', 'messages', ['recipient_id'])
    op.create_index(
        'ix_messages_pair_created',
        'messages',
        ['sender_id', 'recipient_id', 'created_at'],
    )
    op.create_index(
        'ix_messages_recipient_read',
        'messages',
        ['recipient_id', 'is_read'],
    )


def downgrade() -> None:
    op.drop_index('ix_messages_recipient_read', table_name='messages')
    op.drop_index('ix_messages_pair_created', table_name='messages')
    op.drop_index('ix_messages_recipient_id', table_name='messages')
    op.drop_index('ix_messages_sender_id', table_name='messages')
    op.drop_table('messages')
    # Значения enum PostgreSQL удалить нельзя без пересоздания типа —
    # оставляем MESSAGE/GIFT как безвредные (миграция вниз их не трогает).
