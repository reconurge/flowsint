from celery import Celery
from .config import settings

celery = Celery(
    "flowsint",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "flowsint_core.tasks.event",
        "flowsint_core.tasks.transform",
        "flowsint_core.tasks.flow",
    ],
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour
    worker_max_tasks_per_child=1000,
    worker_prefetch_multiplier=1,
)
