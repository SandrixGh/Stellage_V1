from celery import Celery

from stellage.core.settings import settings

celery_app = Celery(
    main="stellage",
    broker=settings.redis_settings.redis_url,
    backend=settings.redis_settings.redis_url,
)

celery_app.autodiscover_tasks(
    packages=[
        "stellage.apps.auth",
        "stellage.apps.profile",
        "stellage.apps.boxes.assets",
    ],
    related_name="tasks",
    force=True,
)

# Часовой sweeper S3-ассетов (воркер запущен с -B, отдельный beat не нужен).
celery_app.conf.beat_schedule = {
    "cleanup-stale-assets": {
        "task": "stellage.apps.boxes.assets.tasks.cleanup_stale_assets",
        "schedule": 3600.0,
    },
}

