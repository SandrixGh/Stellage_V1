"""align box_instances.is_public default to PRIVATE

Дефолт видимости коробки расходился между слоями: модель SQLAlchemy ставила
PUBLIC, pydantic-схема BoxInstanceBase — PRIVATE, а у колонки в БД дефолта не
было вообще. На практике выигрывала схема (репозиторий делает
insert().values(**data.model_dump()), и is_public всегда присутствует в
значениях), поэтому созданные через API коробки приватные. Но дефолт модели
оставался заряженным ружьём: любой INSERT в обход схемы — скрипт, миграция,
будущая админка — получил бы PUBLIC и опубликовал чужой контент.

Миграция закрепляет PRIVATE на уровне БД, чтобы дефолт нельзя было обойти.

Данные СОЗНАТЕЛЬНО не трогаем. Единственный способ получить PUBLIC сегодня —
явно передать is_public в теле POST /boxes/create-box-instance, то есть это
осознанное действие, а не следствие дефекта. Массовый UPDATE молча снял бы с
публикации то, что было опубликовано намеренно. Проверить, есть ли такие
строки:

    SELECT is_public, count(*) FROM box_instances GROUP BY is_public;

Revision ID: c7d8e9f0a1b2
Revises: b1c2d3e4f5a6
Create Date: 2026-07-26 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'c7d8e9f0a1b2'
down_revision: Union[str, Sequence[str], None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Метки в visibilityenum — имена членов Python-энума (PUBLIC/PRIVATE/...),
    # а не их значения: так их создала миграция 2770e5b277b9.
    op.execute(
        "ALTER TABLE box_instances "
        "ALTER COLUMN is_public SET DEFAULT 'PRIVATE'::visibilityenum"
    )


def downgrade() -> None:
    # Возврат к состоянию «у колонки дефолта нет». Прежний PUBLIC не
    # восстанавливаем: он жил только в Python-модели, в схеме БД его не было.
    op.execute("ALTER TABLE box_instances ALTER COLUMN is_public DROP DEFAULT")
