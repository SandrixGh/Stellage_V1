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
        "stellage.apps.profile"
    ],
    related_name="tasks",
    force=True,
)

