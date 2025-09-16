# --- Production stage ---
FROM python:3.12-slim AS prod

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV POETRY_VIRTUALENVS_CREATE=false
ENV APP_ENV=prod

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN curl -sSL https://install.python-poetry.org | python3 - \
    && ln -s /root/.local/bin/poetry /usr/local/bin/poetry

WORKDIR /app

# Copy only dependency files to leverage Docker cache
COPY pyproject.toml poetry.lock ./

# Install production dependencies only (no dev)
RUN poetry install --no-dev --no-root

# Copy the source code
COPY . .

# Expose FastAPI port
EXPOSE 5001

# Run FastAPI
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5001"]
