#!/bin/sh
set -e

# Ensure virtualenv binaries are in PATH
export PATH="/app/flowsint-api/.venv/bin:$PATH"

if [ "$SKIP_MIGRATIONS" != "true" ]; then
  echo "Running database migrations..."
  alembic upgrade head
else
  echo "Skipping database migrations (SKIP_MIGRATIONS=true)..."
fi

echo "Starting application..."
exec "$@"
