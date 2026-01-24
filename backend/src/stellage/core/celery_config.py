from celery import Celery
from stellage.core.settings import settings

celery_app = Celery(
    main="stellage",
    broker=settings.redis_settings.redis_url,
    backend=settings.redis_settings.redis_url,
    include=["stellage.apps"]
)

celery_app.autodiscover_tasks(
    packages=["stellage.apps"],
    force=True
)

