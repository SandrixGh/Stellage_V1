"""create_notifications_table

Revision ID: d0e1f2a3b4c5
Revises: c9d0e1f2a3b4
Create Date: 2026-07-16 18:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'd0e1f2a3b4c5'
down_revision: Union[str, Sequence[str], None] = 'c9d0e1f2a3b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    notif_type = postgresql.ENUM('FOLLOW', 'BOX_LIKE', name='notificationtypeenum')
    notif_type.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'notifications',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            'recipient_id',
            sa.UUID(as_uuid=True),
            sa.ForeignKey('users.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column(
            'actor_id',
            sa.UUID(as_uuid=True),
            sa.ForeignKey('users.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column(
            'type',
            postgresql.ENUM(name='notificationtypeenum', create_type=False),
            nullable=False,
        ),
        sa.Column(
            'instance_id',
            sa.UUID(as_uuid=True),
            sa.ForeignKey('box_instances.id', ondelete='CASCADE'),
            nullable=True,
        ),
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

    op.create_index('ix_notifications_recipient_id', 'notifications', ['recipient_id'])
    op.create_index(
        'ix_notifications_recipient_read',
        'notifications',
        ['recipient_id', 'is_read'],
    )


def downgrade() -> None:
    op.drop_index('ix_notifications_recipient_read', table_name='notifications')
    op.drop_index('ix_notifications_recipient_id', table_name='notifications')
    op.drop_table('notifications')
    postgresql.ENUM(name='notificationtypeenum').drop(op.get_bind(), checkfirst=True)
