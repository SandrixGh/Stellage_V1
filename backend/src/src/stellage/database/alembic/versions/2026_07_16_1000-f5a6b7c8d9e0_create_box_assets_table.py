"""create_box_assets_table

Revision ID: f5a6b7c8d9e0
Revises: e3c4d5f6a7b8
Create Date: 2026-07-16 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'f5a6b7c8d9e0'
down_revision: Union[str, Sequence[str], None] = 'e3c4d5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    asset_kind = postgresql.ENUM('PHOTO', 'VIDEO', name='assetkindenum')
    asset_status = postgresql.ENUM('PENDING', 'READY', 'DELETING', name='assetstatusenum')
    asset_kind.create(op.get_bind(), checkfirst=True)
    asset_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'box_assets',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        # SET NULL, не CASCADE: строка ассета — единственная запись о ключе
        # объекта в S3; при удалении коробки её подчищает sweeper.
        sa.Column(
            'instance_id',
            sa.UUID(as_uuid=True),
            sa.ForeignKey('box_instances.id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column(
            'owner_id',
            sa.UUID(as_uuid=True),
            sa.ForeignKey('users.id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column(
            'kind',
            postgresql.ENUM(name='assetkindenum', create_type=False),
            nullable=False,
        ),
        sa.Column('s3_key', sa.String(length=512), nullable=False, unique=True),
        sa.Column('mime', sa.String(length=100), nullable=False),
        sa.Column('size_bytes', sa.BigInteger(), nullable=False),
        sa.Column('original_name', sa.String(length=255), nullable=False),
        sa.Column(
            'status',
            postgresql.ENUM(name='assetstatusenum', create_type=False),
            nullable=False,
            server_default='PENDING',
        ),
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
        sa.CheckConstraint('size_bytes > 0', name='check_asset_size_positive'),
    )

    op.create_index('ix_box_assets_instance_id', 'box_assets', ['instance_id'])
    op.create_index('ix_box_assets_owner_id', 'box_assets', ['owner_id'])
    op.create_index('ix_box_assets_gc', 'box_assets', ['status', 'created_at'])


def downgrade() -> None:
    op.drop_index('ix_box_assets_gc', table_name='box_assets')
    op.drop_index('ix_box_assets_owner_id', table_name='box_assets')
    op.drop_index('ix_box_assets_instance_id', table_name='box_assets')
    op.drop_table('box_assets')

    postgresql.ENUM(name='assetstatusenum').drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name='assetkindenum').drop(op.get_bind(), checkfirst=True)
