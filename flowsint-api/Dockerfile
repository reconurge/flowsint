FROM python:3.12-slim AS builder

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

# build deps + uv
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    libpq-dev \
    pkg-config \
    libcairo2-dev \
    && rm -rf /var/lib/apt/lists/* \
    && curl -LsSf https://astral.sh/uv/install.sh | sh

ENV PATH="/root/.local/bin:$PATH"

# Copy workspace config
COPY pyproject.toml uv.lock ./

# Copy all workspace members
COPY flowsint-types ./flowsint-types
COPY flowsint-core ./flowsint-core
COPY flowsint-enrichers ./flowsint-enrichers
COPY flowsint-api ./flowsint-api

RUN uv sync --frozen --no-dev

# DEV
FROM python:3.12-slim AS dev

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    APP_ENV=development \
    PATH="/app/.venv/bin:$PATH"

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libcairo2 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder /app/.venv ./.venv

# Copy application code
COPY flowsint-core ./flowsint-core
COPY flowsint-types ./flowsint-types
COPY flowsint-enrichers ./flowsint-enrichers
COPY flowsint-api ./flowsint-api

WORKDIR /app/flowsint-api

# Make entrypoint executable
RUN chmod +x entrypoint.sh

EXPOSE 5001

ENTRYPOINT ["./entrypoint.sh"]

# Dev command with hot-reload
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5001", "--reload"]

# PROD
FROM python:3.12-slim AS production

LABEL org.opencontainers.image.source="https://github.com/reconurge/flowsint"
LABEL org.opencontainers.image.description="Flowsint API & Worker"
LABEL org.opencontainers.image.licenses="Apache-2.0"

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    APP_ENV=production \
    PATH="/app/.venv/bin:$PATH"

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libcairo2 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user
RUN groupadd -g 1001 flowsint && \
    useradd -u 1001 -g flowsint -s /bin/bash -m flowsint

WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder --chown=flowsint:flowsint /app/.venv ./.venv

# Copy application code
COPY --chown=flowsint:flowsint flowsint-core ./flowsint-core
COPY --chown=flowsint:flowsint flowsint-types ./flowsint-types
COPY --chown=flowsint:flowsint flowsint-enrichers ./flowsint-enrichers
COPY --chown=flowsint:flowsint flowsint-api ./flowsint-api

WORKDIR /app/flowsint-api

# Make entrypoint executable
RUN chmod +x entrypoint.sh

# Switch to non-root user
# USER flowsint

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5001/health || exit 1

ENTRYPOINT ["./entrypoint.sh"]

# Production command (no reload)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5001"]
