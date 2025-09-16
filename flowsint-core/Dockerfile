FROM python:3.12-slim

# Installer Poetry
RUN pip install --no-cache-dir poetry

WORKDIR /app
COPY ./pyproject.toml ./poetry.lock* /app/
RUN poetry install --no-root --no-interaction --no-ansi

COPY ./ /app

CMD ["poetry", "run", "celery", "-A", "app.worker", "worker", "--loglevel=info"]
