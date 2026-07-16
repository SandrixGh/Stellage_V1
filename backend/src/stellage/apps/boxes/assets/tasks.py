"""Celery-задачи жизненного цикла S3-ассетов.

Гарантия отсутствия осиротевших объектов держится на двух уровнях:
немедленная задача delete_asset_objects (после удаления коробки) и часовой
sweeper cleanup_stale_assets, который добирает всё, что сорвалось: строки
DELETING, ассеты удалённых коробок (instance_id IS NULL после SET NULL)
и брошенные PENDING старше суток.
"""
import asyncio
import datetime
import logging
import uuid

from botocore.exceptions import ClientError
from celery import shared_task
from sqlalchemy import and_, delete, or_, select

from stellage.apps.boxes.assets.limits import PENDING_TTL_HOURS
from stellage.core.core_dependencies.db_dependency import DBDependency
from stellage.core.core_dependencies.s3_dependency import S3Dependency
from stellage.database.enums.asset_status import AssetStatusEnum
from stellage.database.models import BoxAsset

# В логах только id — presigned-ссылки и ключи объектов не логируются.
logger = logging.getLogger(__name__)


async def _remove_assets(rows: list[tuple[uuid.UUID, str]]) -> int:
    """Удаляет объекты в S3 и затем их строки в БД. Отсутствие объекта в S3 —
    не ошибка (повторный запуск идемпотентен). Любой сбой оставляет строку
    на месте — её доберёт следующий проход sweeper'а."""
    if not rows:
        return 0

    db = DBDependency()
    s3 = S3Dependency()
    removed = 0

    async with s3.get_client() as client:
        for asset_id, s3_key in rows:
            try:
                try:
                    await client.delete_object(Bucket=s3.bucket, Key=s3_key)
                except ClientError:
                    pass

                async with db.db_session() as session:
                    await session.execute(
                        delete(BoxAsset).where(BoxAsset.id == asset_id)
                    )
                    await session.commit()

                removed += 1
            except Exception:
                logger.warning(
                    "asset removal deferred to next sweep: asset_id=%s",
                    asset_id,
                )

    return removed


async def _collect_and_remove_by_ids(asset_ids: list[uuid.UUID]) -> int:
    db = DBDependency()
    async with db.db_session() as session:
        result = await session.execute(
            select(BoxAsset.id, BoxAsset.s3_key)
            .where(
                BoxAsset.id.in_(asset_ids),
                BoxAsset.status == AssetStatusEnum.DELETING,
            )
        )
        rows = [(row.id, row.s3_key) for row in result.fetchall()]

    return await _remove_assets(rows)


async def _collect_and_remove_stale() -> int:
    cutoff = (
        datetime.datetime.now(datetime.UTC)
        - datetime.timedelta(hours=PENDING_TTL_HOURS)
    )

    db = DBDependency()
    async with db.db_session() as session:
        result = await session.execute(
            select(BoxAsset.id, BoxAsset.s3_key)
            .where(
                or_(
                    BoxAsset.status == AssetStatusEnum.DELETING,
                    BoxAsset.instance_id.is_(None),
                    and_(
                        BoxAsset.status == AssetStatusEnum.PENDING,
                        BoxAsset.created_at < cutoff,
                    ),
                )
            )
        )
        rows = [(row.id, row.s3_key) for row in result.fetchall()]

    return await _remove_assets(rows)


@shared_task(
    autoretry_for=(Exception,),
    max_retries=3,
    default_retry_delay=60,
)
def delete_asset_objects(asset_ids: list[str]) -> int:
    """Немедленное удаление объектов ассетов, уже помеченных DELETING."""
    removed = asyncio.run(
        _collect_and_remove_by_ids([uuid.UUID(a) for a in asset_ids])
    )
    logger.info("delete_asset_objects: removed=%d of %d", removed, len(asset_ids))
    return removed


@shared_task
def cleanup_stale_assets() -> int:
    """Часовой sweeper — страховка от любых сбоев немедленного удаления."""
    removed = asyncio.run(_collect_and_remove_stale())
    if removed:
        logger.info("cleanup_stale_assets: removed=%d", removed)
    return removed
