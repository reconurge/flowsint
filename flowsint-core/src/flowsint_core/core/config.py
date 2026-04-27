import os
from dotenv import load_dotenv

load_dotenv()

_DEFAULT_REDIS_URL = "redis://localhost:6379/0"


class Settings:
    CELERY_BROKER_URL = os.getenv("REDIS_URL", _DEFAULT_REDIS_URL)
    CELERY_RESULT_BACKEND = os.getenv("REDIS_URL", _DEFAULT_REDIS_URL)


settings = Settings()
