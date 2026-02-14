PROJECT_ROOT := $(shell pwd)

COMPOSE_DEV    := docker compose -f docker-compose.dev.yml
COMPOSE_PROD   := docker compose -f docker-compose.prod.yml
COMPOSE_DEPLOY := docker compose -f docker-compose.deploy.yml

.PHONY: \
	dev prod deploy \
	build-dev build-prod \
	up-dev up-prod up-deploy down \
	infra-dev infra-prod infra-stop-dev infra-stop-prod \
	migrate-dev migrate-prod \
	alembic-upgrade alembic-downgrade alembic-revision \
	api frontend celery \
	test install clean check-env open-browser-dev open-browser-prod \
	logs-dev logs-prod logs-deploy status \
	regenerate-router

ENV_DIRS := . flowsint-api flowsint-core flowsint-app

check-env:
	@echo "Checking .env files..."
	@for dir in $(ENV_DIRS); do \
		env_file="$$dir/.env"; \
		env_example="$(PROJECT_ROOT)/.env.example"; \
		if [ ! -f "$$env_file" ]; then \
			cp "$$env_example" "$$env_file"; \
			echo "Created $$env_file"; \
		fi; \
	done

dev:
	@echo "Starting DEV environment..."
	$(MAKE) check-env
	$(MAKE) build-dev
	$(MAKE) up-dev
	$(MAKE) open-browser-dev
	$(COMPOSE_DEV) logs -f

build-dev:
	@echo "Building DEV images..."
	$(COMPOSE_DEV) build

up-dev:
	$(COMPOSE_DEV) up -d

infra-dev:
	@echo "Starting DEV infra (postgres / redis / neo4j)..."
	$(COMPOSE_DEV) up -d postgres redis neo4j

infra-stop-dev:
	@echo "Stopping DEV infra..."
	$(COMPOSE_DEV) stop postgres redis neo4j

logs-dev:
	$(COMPOSE_DEV) logs -f

open-browser-dev:
	@echo "Waiting for frontend on port 5173..."
	@bash -c 'until curl -s http://localhost:5173 > /dev/null 2>&1; do sleep 1; done'
	@open http://localhost:5173 2>/dev/null || \
	 xdg-open http://localhost:5173 2>/dev/null || \
	 echo "Frontend ready at http://localhost:5173"

prod:
	@echo "Starting PROD environment..."
	$(MAKE) check-env
	$(MAKE) build-prod
	$(MAKE) up-prod
	@echo ""
	@echo "Production started!"
	@echo "  Frontend: http://localhost:5173"
	@echo "  API:      http://localhost:5001"

build-prod:
	@echo "Building PROD images..."
	$(COMPOSE_PROD) build

up-prod:
	$(COMPOSE_PROD) up -d

infra-prod:
	@echo "Starting PROD infra (postgres / redis / neo4j)..."
	$(COMPOSE_PROD) up -d postgres redis neo4j

infra-stop-prod:
	@echo "Stopping PROD infra..."
	$(COMPOSE_PROD) stop postgres redis neo4j

logs-prod:
	$(COMPOSE_PROD) logs -f

open-browser-prod:
	@echo "Waiting for frontend on port 80 (Traefik)..."
	@bash -c 'until curl -s http://localhost > /dev/null 2>&1; do sleep 2; done'
	@open http://localhost 2>/dev/null || \
	 xdg-open http://localhost 2>/dev/null || \
	 echo "Frontend ready at http://localhost"

deploy:
	@echo "Starting DEPLOY environment (GHCR images)..."
	$(MAKE) check-env
	$(COMPOSE_DEPLOY) pull
	$(COMPOSE_DEPLOY) up -d
	@echo ""
	@echo "Deploy started!"
	@echo "  Frontend: http://localhost (via Traefik)"
	@echo "  API:      http://localhost/api"

up-deploy:
	$(COMPOSE_DEPLOY) up -d

logs-deploy:
	$(COMPOSE_DEPLOY) logs -f

migrate-dev:
	@echo "Running DEV migrations..."
	@if ! $(COMPOSE_DEV) ps -q neo4j | grep -q .; then \
		echo "Neo4j not running → starting DEV infra"; \
		$(COMPOSE_DEV) up -d --wait neo4j; \
	fi
	yarn migrate

migrate-prod:
	@echo "⚠️  Running PROD migrations"
	@echo "This will ALTER production data."
	@read -p "Type 'prod' to continue: " confirm; \
	if [ "$$confirm" != "prod" ]; then \
		echo "Aborted."; exit 1; \
	fi
	yarn migrate

alembic-upgrade:
	@echo "Running Alembic migrations (upgrade head)..."
	cd $(PROJECT_ROOT)/flowsint-api && poetry run alembic upgrade head

alembic-downgrade:
	@echo "Rolling back last Alembic migration..."
	cd $(PROJECT_ROOT)/flowsint-api && poetry run alembic downgrade -1

alembic-revision:
	@if [ -z "$(m)" ]; then \
		echo "Usage: make alembic-revision m=\"your migration message\""; exit 1; \
	fi
	@echo "Creating new Alembic migration: $(m)"
	cd $(PROJECT_ROOT)/flowsint-api && poetry run alembic revision --autogenerate -m "$(m)"

api:
	cd $(PROJECT_ROOT)/flowsint-api && \
	poetry run uvicorn app.main:app --host 0.0.0.0 --port 5001 --reload

frontend:
	cd $(PROJECT_ROOT)/flowsint-app && yarn dev

celery:
	cd $(PROJECT_ROOT)/flowsint-api && \
	poetry run celery -A flowsint_core.core.celery \
	worker --loglevel=info --pool=threads --concurrency=10

test:
	cd flowsint-types && poetry run pytest
	cd flowsint-core && poetry run pytest
	cd flowsint-enrichers && poetry run pytest

install:
	poetry config virtualenvs.in-project true --local
	$(MAKE) infra-dev
	poetry install
	cd flowsint-core && poetry install
	cd flowsint-enrichers && poetry install
	cd flowsint-api && poetry install && poetry run alembic upgrade head

status:
	@echo "=== DEV Containers ==="
	@$(COMPOSE_DEV) ps 2>/dev/null || echo "No DEV containers"
	@echo ""
	@echo "=== PROD Containers ==="
	@$(COMPOSE_PROD) ps 2>/dev/null || echo "No PROD containers"

down:
	-$(COMPOSE_DEV) down
	-$(COMPOSE_PROD) down
	-$(COMPOSE_DEPLOY) down

clean:
	@echo "This will remove ALL Docker data. Continue? [y/N]"
	@read confirm; \
	if [ "$$confirm" != "y" ]; then exit 1; fi
	-$(COMPOSE_DEV) down -v --rmi all --remove-orphans
	-$(COMPOSE_PROD) down -v --rmi all --remove-orphans
	-$(COMPOSE_DEPLOY) down -v --rmi all --remove-orphans
	rm -rf flowsint-app/node_modules
	rm -rf flowsint-core/.venv
	rm -rf flowsint-enrichers/.venv
	rm -rf flowsint-api/.venv

regenerate-router:
	@echo "Regenerating flowsint-app/src/routeTree.gen.ts"
	cd $(PROJECT_ROOT)/flowsint-app && npx tsr generate

help:
	@echo "Flowsint Makefile"
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Start DEV environment (local build, hot-reload)"
	@echo "  make build-dev    - Build DEV images"
	@echo "  make up-dev       - Start DEV containers"
	@echo "  make logs-dev     - Follow DEV logs"
	@echo "  make infra-dev    - Start only infra (postgres/redis/neo4j)"
	@echo ""
	@echo "Production (local build):"
	@echo "  make prod         - Start PROD environment (local build + Traefik)"
	@echo "  make build-prod   - Build PROD images"
	@echo "  make up-prod      - Start PROD containers"
	@echo "  make logs-prod    - Follow PROD logs"
	@echo ""
	@echo "Deploy (GHCR images):"
	@echo "  make deploy       - Start with GHCR images (no build)"
	@echo "  make up-deploy    - Start DEPLOY containers"
	@echo "  make logs-deploy  - Follow DEPLOY logs"
	@echo ""
	@echo "Local (no Docker):"
	@echo "  make api          - Run API locally"
	@echo "  make frontend     - Run frontend locally"
	@echo "  make celery       - Run Celery worker locally"
	@echo ""
	@echo "Migrations:"
	@echo "  make migrate-dev           - Run Neo4j DEV migrations"
	@echo "  make migrate-prod          - Run Neo4j PROD migrations"
	@echo "  make alembic-upgrade       - Run Alembic migrations (upgrade head)"
	@echo "  make alembic-downgrade     - Rollback last Alembic migration"
	@echo "  make alembic-revision m=.. - Create new Alembic migration"
	@echo ""
	@echo "Utilities:"
	@echo "  make status       - Show container status"
	@echo "  make down         - Stop all containers"
	@echo "  make clean        - Remove all Docker data"
	@echo "  make install      - Install dependencies locally"
	@echo "  make test         - Run tests"
