#!/bin/bash

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "Starting Flowsint project services..."

cleanup() {
    echo "🛑 Stopping all services..."
    kill $API_PID $FRONTEND_PID $CELERY_PID 2>/dev/null || true
}
trap cleanup EXIT

start_service() {
    local name="$1"
    shift
    echo "▶️ Starting $name..."
    "$@" &
    local pid=$!
    sleep 2
    if ! kill -0 $pid 2>/dev/null; then
        echo "❌ $name failed to start (check logs)."
        return 1
    fi
    echo "✅ $name started (PID: $pid)"
    echo ""
    eval "$2=$pid"  # stocker le PID dans la variable donnée
}
cd "$PROJECT_ROOT/"
docker compose up -d

cd "$PROJECT_ROOT/flowsint-api"
start_service "API server" poetry run uvicorn app.main:app --host 0.0.0.0 --port 5001 --reload

cd "$PROJECT_ROOT/flowsint-app"
start_service "Frontend" npx electron-vite dev

cd "$PROJECT_ROOT/flowsint-core"
start_service "Celery worker" poetry run celery -A flowsint_core.core.celery worker --loglevel=info

echo "📊 Service status:"
echo "   - API server (PID: $API_PID): http://localhost:5001"
echo "   - Frontend (PID: $FRONTEND_PID)"
echo "   - Celery worker (PID: $CELERY_PID)"
echo ""
echo "🛑 Press Ctrl+C to stop all services"

wait
