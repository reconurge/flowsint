import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    CELERY_BROKER_URL = os.environ["REDIS_URL"]
    CELERY_RESULT_BACKEND = os.environ["REDIS_URL"]


settings = Settings()
