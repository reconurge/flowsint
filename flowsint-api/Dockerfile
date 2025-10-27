# --- Base stage with Python 3.12 ---
FROM python:3.12-slim AS base

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV POETRY_VIRTUALENVS_CREATE=false

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    libpq-dev \
    pkg-config \
    libcairo2-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN curl -sSL https://install.python-poetry.org | python3 - \
    && ln -s /root/.local/bin/poetry /usr/local/bin/poetry

WORKDIR /app

# --- Development stage ---
FROM base AS dev

ENV APP_ENV=development

# Copy all dependency packages
COPY flowsint-core /app/flowsint-core
COPY flowsint-types /app/flowsint-types
COPY flowsint-transforms /app/flowsint-transforms

# Copy API files
COPY flowsint-api /app/flowsint-api

WORKDIR /app/flowsint-api

# Install dependencies with dev packages
RUN poetry install --no-root

# Expose FastAPI port
EXPOSE 5001

ENTRYPOINT ["/app/flowsint-api/entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5001", "--reload"]

# --- Production stage ---
FROM base AS prod

ENV APP_ENV=production

# Copy all dependency packages
COPY flowsint-core /app/flowsint-core
COPY flowsint-types /app/flowsint-types
COPY flowsint-transforms /app/flowsint-transforms

# Copy API files
COPY flowsint-api /app/flowsint-api

WORKDIR /app/flowsint-api

# Install production dependencies only (no dev)
RUN poetry install

# Expose FastAPI port
EXPOSE 5001

ENTRYPOINT ["/app/flowsint-api/entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5001"]
