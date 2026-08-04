"""Stellage Production Database Cleanup Utility

Safely resets test boxes, shelves, messages, notifications, likes, comments,
gifts, non-admin accounts, and invite codes to prepare Stellage for a clean deployment.

Usage:
    poetry run python scripts/clear_production_db.py [--keep-superusers] [--clean-s3]
"""

import argparse
import asyncio
import logging
import sys
from pathlib import Path

# Add src/ to pythonpath
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from stellage.core.settings import settings
from stellage.database.models import (
    BoxAsset,
    BoxComment,
    BoxInstance,
    BoxLike,
    CoinGift,
    Follow,
    InviteCode,
    Message,
    Notification,
    Shelf,
    User,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("clear_db")


async def clear_database(keep_superusers: bool = True):
    engine = create_async_engine(settings.db_settings.db_url, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        logger.info("Starting Stellage database cleanup...")

        # 1. Clear Box Instances, Comments, Likes, Assets
        await session.execute(delete(BoxComment))
        await session.execute(delete(BoxLike))
        await session.execute(delete(CoinGift))
        await session.execute(delete(Message))
        await session.execute(delete(Notification))
        await session.execute(delete(Follow))
        await session.execute(delete(BoxAsset))
        await session.execute(delete(BoxInstance))
        await session.execute(delete(Shelf))

        # 2. Clear Invite Codes
        await session.execute(delete(InviteCode))

        # 3. Clear Users
        if keep_superusers:
            stmt = delete(User).where(User.is_superuser == False)  # noqa: E712
            res = await session.execute(stmt)
            logger.info("Deleted non-superuser accounts (%d users removed).", res.rowcount)
        else:
            res = await session.execute(delete(User))
            logger.info("Deleted ALL user accounts (%d users removed).", res.rowcount)

        # 4. Seed initial Pioneer Bootstrap Invites for launch
        pioneer_codes = ["STELLAGE-ALPHA-2026", "STELLAGE-BETA-7777", "STELLAGE-LAUNCH-1001"]
        for code in pioneer_codes:
            inv = InviteCode(
                code=code,
                max_uses=10,  # Alpha codes can invite up to 10 pioneer members
                uses_count=0,
                is_active=True,
            )
            session.add(inv)

        await session.commit()
        logger.info("Database cleaned successfully! Initial pioneer invite codes created:")
        for code in pioneer_codes:
            logger.info("  -> %s (10 uses)", code)

    await engine.dispose()


def main():
    parser = argparse.ArgumentParser(description="Stellage Database Cleanup Tool")
    parser.add_argument("--all", action="store_true", help="Delete ALL users including superusers")
    args = parser.parse_args()

    asyncio.run(clear_database(keep_superusers=not args.all))


if __name__ == "__main__":
    main()
