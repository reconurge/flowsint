import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    CELERY_BROKER_URL = os.getenv("REDIS_URI", "redis://localhost:6379/0")
    CELERY_RESULT_BACKEND = os.getenv("REDIS_URI", "redis://localhost:6379/0")


settings = Settings()
