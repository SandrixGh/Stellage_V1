"""add integrity constraints and fk indexes

Уникальность (template_id, serial_number) — от гонки coalesce(max)+1 (C6);
частичный уникальный индекс «одна главная полка на пользователя» (M6);
индексы на внешние ключи box_instances (M10).

Перед добавлением уникальных ограничений чистим возможные нарушения в уже
существующих данных, иначе upgrade упал бы на проде:
- дубли serial_number внутри шаблона перенумеровываются по порядку создания;
- при нескольких главных полках у пользователя главной остаётся самая старая.

Revision ID: b1c2d3e4f5a6
Revises: a3b4c5d6e7f8
Create Date: 2026-07-17 23:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, Sequence[str], None] = 'a3b4c5d6e7f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # ── Data cleanup: перенумеровать дубли serial_number внутри шаблона ──
    # Оконная нумерация по created_at даёт плотный 1..N без дублей; трогаем
    # только строки, где новый номер отличается от текущего.
    conn.execute(sa.text("""
        WITH renumbered AS (
            SELECT
                id,
                ROW_NUMBER() OVER (
                    PARTITION BY template_id
                    ORDER BY created_at, id
                ) AS rn
            FROM box_instances
        )
        UPDATE box_instances AS b
        SET serial_number = r.rn
        FROM renumbered AS r
        WHERE b.id = r.id
          AND b.serial_number IS DISTINCT FROM r.rn
    """))

    # ── Data cleanup: оставить одну (самую старую) главную полку на юзера ──
    conn.execute(sa.text("""
        WITH ranked AS (
            SELECT
                id,
                ROW_NUMBER() OVER (
                    PARTITION BY user_id
                    ORDER BY created_at, id
                ) AS rn
            FROM shelves
            WHERE is_main
        )
        UPDATE shelves AS s
        SET is_main = false
        FROM ranked AS r
        WHERE s.id = r.id
          AND r.rn > 1
    """))

    # ── Constraints и индексы ──
    op.create_unique_constraint(
        'uq_box_instances_template_serial',
        'box_instances',
        ['template_id', 'serial_number'],
    )
    op.create_index(
        'uq_shelves_one_main_per_user',
        'shelves',
        ['user_id'],
        unique=True,
        postgresql_where=sa.text('is_main'),
    )
    op.create_index('ix_box_instances_user_id', 'box_instances', ['user_id'])
    op.create_index('ix_box_instances_template_id', 'box_instances', ['template_id'])
    op.create_index('ix_box_instances_shelf_id', 'box_instances', ['shelf_id'])


def downgrade() -> None:
    op.drop_index('ix_box_instances_shelf_id', table_name='box_instances')
    op.drop_index('ix_box_instances_template_id', table_name='box_instances')
    op.drop_index('ix_box_instances_user_id', table_name='box_instances')
    op.drop_index('uq_shelves_one_main_per_user', table_name='shelves')
    op.drop_constraint(
        'uq_box_instances_template_serial',
        'box_instances',
        type_='unique',
    )
