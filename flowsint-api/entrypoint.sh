#!/bin/sh
set -e

if [ "$SKIP_MIGRATIONS" != "true" ]; then
  echo "Running database migrations..."
  alembic upgrade head
else
  echo "Skipping database migrations (SKIP_MIGRATIONS=true)..."
fi

echo "Starting application..."
exec "$@"
