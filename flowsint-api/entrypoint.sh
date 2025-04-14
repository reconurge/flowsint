#!/bin/sh
set -e  # Arrêter le script en cas d'erreur

if [ "$1" = "app" ]; then
    echo "Démarrage de FastAPI..."
    exec uvicorn app.main:app --host 0.0.0.0 --port 5000
elif [ "$1" = "celery" ]; then
    echo "Démarrage de Celery..."
    exec celery -A app.core.celery worker --loglevel=debug
else
    exec "$@"
fi
