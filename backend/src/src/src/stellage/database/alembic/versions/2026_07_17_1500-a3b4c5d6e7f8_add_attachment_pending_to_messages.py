"""add_attachment_pending_to_messages

Revision ID: a3b4c5d6e7f8
Revises: f2a3b4c5d6e7
Create Date: 2026-07-17 15:00:00.000000

Флаг attachment_pending: True между initiate и complete загрузки вложения.
complete финализирует только pending-черновик, поэтому повторный complete
идемпотентен (не задваивает уведомление и не «воскрешает» прочитанное как
непрочитанное). Существующие сообщения — уже подтверждённые, поэтому false.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a3b4c5d6e7f8'
down_revision: Union[str, Sequence[str], None] = 'f2a3b4c5d6e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'messages',
        sa.Column(
            'attachment_pending',
            sa.Boolean(),
            nullable=False,
            server_default='false',
        ),
    )


def downgrade() -> None:
    op.drop_column('messages', 'attachment_pending')
