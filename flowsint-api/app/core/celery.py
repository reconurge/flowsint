from celery import Celery
import os
from dotenv import load_dotenv
load_dotenv()


REDIS_URI = os.getenv("REDIS_URI")


print("REDIS_URI", REDIS_URI)


celery_app = Celery(
    "flowsint",
    broker=REDIS_URI,
    backend=REDIS_URI,
    include=["app.tasks.transform"]
)