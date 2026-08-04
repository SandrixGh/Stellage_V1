"""extend_messages_with_media_edit_and_gift

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
Create Date: 2026-07-17 12:00:00.000000

Расширяет messages для полноценного мессенджера:
- text становится nullable (сообщение может быть только вложением или подарком);
- kind (messagekindenum: TEXT/GIFT) — тип сообщения;
- edited_at — метка редактирования;
- asset_* — вложение фото/видео в приватном S3 (s3_key наружу не выходит);
- gift_instance_id — экземпляр подаренной коробки для системной карточки.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'f2a3b4c5d6e7'
down_revision: Union[str, Sequence[str], None] = 'e1f2a3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Новый enum типа сообщения. assetkindenum уже существует (таблица ассетов
    # коробок), поэтому его переиспользуем через create_type=False.
    message_kind = postgresql.ENUM('TEXT', 'GIFT', name='messagekindenum')
    message_kind.create(op.get_bind(), checkfirst=True)

    # text теперь опционален.
    op.alter_column('messages', 'text', existing_type=sa.String(length=4000), nullable=True)

    op.add_column(
        'messages',
        sa.Column(
            'kind',
            postgresql.ENUM('TEXT', 'GIFT', name='messagekindenum', create_type=False),
            nullable=False,
            server_default='TEXT',
        ),
    )
    op.add_column('messages', sa.Column('edited_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('messages', sa.Column('asset_key', sa.String(length=512), nullable=True))
    op.add_column('messages', sa.Column('asset_mime', sa.String(length=100), nullable=True))
    op.add_column(
        'messages',
        sa.Column(
            'asset_kind',
            postgresql.ENUM(name='assetkindenum', create_type=False),
            nullable=True,
        ),
    )
    op.add_column('messages', sa.Column('asset_name', sa.String(length=255), nullable=True))
    op.add_column('messages', sa.Column('asset_size', sa.BigInteger(), nullable=True))
    op.add_column(
        'messages',
        sa.Column(
            'gift_instance_id',
            sa.UUID(as_uuid=True),
            sa.ForeignKey('box_instances.id', ondelete='SET NULL'),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column('messages', 'gift_instance_id')
    op.drop_column('messages', 'asset_size')
    op.drop_column('messages', 'asset_name')
    op.drop_column('messages', 'asset_kind')
    op.drop_column('messages', 'asset_mime')
    op.drop_column('messages', 'asset_key')
    op.drop_column('messages', 'edited_at')
    op.drop_column('messages', 'kind')

    # Возвращаем NOT NULL: подставляем пустую строку там, где текста нет,
    # иначе ALTER упадёт на строках-вложениях/подарках.
    op.execute("UPDATE messages SET text = '' WHERE text IS NULL")
    op.alter_column('messages', 'text', existing_type=sa.String(length=4000), nullable=False)

    postgresql.ENUM(name='messagekindenum').drop(op.get_bind(), checkfirst=True)
