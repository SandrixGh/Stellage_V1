"""rename_box_to_instance_and_add_template

Revision ID: 21454b6a7295
Revises: 2770e5b277b9
Create Date: 2026-03-07 21:31:53.086411

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '21454b6a7295'
down_revision: Union[str, Sequence[str], None] = '2770e5b277b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Явное создание типов ENUM
    currency_enum = postgresql.ENUM('USD', 'RUB', 'EUR', 'GBP', 'CNY', 'JPY', 'KZT', 'BYN', 'TRY', name='currencyenum')
    currency_enum.create(op.get_bind(), checkfirst=True)
    rarity_enum = postgresql.ENUM('COMMON', 'RARE', 'GOLDEN', 'DEV', name='boxrarity')
    rarity_enum.create(op.get_bind(), checkfirst=True)

    op.create_table('box_templates',
                    sa.Column('id', sa.UUID(), nullable=False),
                    sa.Column('title', sa.String(length=100), nullable=False),
                    sa.Column('description', sa.String(length=100), nullable=True),
                    sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=False),
                    sa.Column('currency', sa.Enum(name='currencyenum'), nullable=False),
                    sa.Column('rarity', sa.Enum(name='boxrarity'), nullable=False),
                    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                              nullable=False),
                    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                              nullable=False),
                    sa.PrimaryKeyConstraint('id')
                    )

    op.add_column('boxes', sa.Column('template_id', sa.UUID(), nullable=True))
    op.create_foreign_key('fk_boxes_template_id', 'boxes', 'box_templates', ['template_id'], ['id'], ondelete='CASCADE')


def downgrade() -> None:
    op.drop_constraint('fk_boxes_template_id', 'boxes', type_='foreignkey')
    op.drop_column('boxes', 'template_id')
    op.drop_table('box_templates')
    # Типы ENUM обычно не удаляют в downgrade, чтобы не сломать другие таблицы, если они их используют