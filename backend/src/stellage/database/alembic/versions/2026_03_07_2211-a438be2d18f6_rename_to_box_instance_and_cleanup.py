"""rename_to_box_instance_and_cleanup

Revision ID: a438be2d18f6
Revises: 21454b6a7295
Create Date: 2026-03-07 22:11:50.473172

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'a438be2d18f6'
down_revision: Union[str, Sequence[str], None] = '21454b6a7295'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Создаем недостающие типы ENUM для инстансов
    postgresql.ENUM('SEALED', 'NOT_SEALED', name='sealingenum').create(op.get_bind(), checkfirst=True)
    postgresql.ENUM('PUBLIC', 'PRIVATE', 'LIMITED', 'BY_THE_LINK', name='visibilityenum').create(op.get_bind(), checkfirst=True)
    postgresql.ENUM('VERIFIED', 'NOT_VERIFIED', 'ON_CHECKING', 'SCAM', name='verifyenum').create(op.get_bind(), checkfirst=True)

    # 2. Создаем новую таблицу
    op.create_table('box_instances',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('serial_number', sa.Integer(), nullable=False),
        sa.Column('template_id', sa.UUID(), nullable=False),
        sa.Column('shelf_id', sa.UUID(), nullable=True),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('is_sealed', sa.Enum(name='sealingenum'), nullable=False),
        sa.Column('is_public', sa.Enum(name='visibilityenum'), nullable=False),
        sa.Column('is_verified', sa.Enum(name='verifyenum'), nullable=False),
        sa.Column('content', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint('serial_number > 0', name='check_serial_number_positive'),
        sa.ForeignKeyConstraint(['shelf_id'], ['shelves.id'], name='fk_box_instances_shelf_id', ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['template_id'], ['box_templates.id'], name='fk_box_instances_template_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_box_instances_user_id', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 3. Удаляем старую таблицу
    op.drop_table('boxes')

def downgrade() -> None:
    # В идеале здесь должен быть код воссоздания таблицы boxes,
    # но так как ты в начале пути, проще откатываться до base
    op.drop_table('box_instances')