# =====================
# Global configuration
# =====================

PROJECT_ROOT := $(shell pwd)

export DOCKER_BUILDKIT=0
export COMPOSE_PARALLEL_LIMIT=1

COMPOSE_DEV := docker compose -f docker-compose.dev.yml
COMPOSE_PROD := docker compose -f docker-compose.prod.yml

.PHONY: \
	dev prod \
	build-dev build-prod \
	up-dev up-prod down \
	api frontend celery \
	test migrate install clean check-env open-browser infra

ENV_DIRS := . flowsint-api flowsint-core flowsint-app

# =====================
# Helpers
# =====================

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

open-browser:
	@echo "Waiting for frontend..."
	@bash -c 'until curl -s http://localhost:5173 > /dev/null 2>&1; do sleep 1; done'
	@open http://localhost:5173 2>/dev/null || \
	 xdg-open http://localhost:5173 2>/dev/null || \
	 echo "Frontend ready at http://localhost:5173"

# =====================
# Build
# =====================

build-dev:
	@echo "Building DEV images..."
	$(COMPOSE_DEV) build

build-prod:
	@echo "Building PROD images..."
	$(COMPOSE_PROD) build

# =====================
# Infra
# =====================

infra:
	@echo "Starting infra (postgres / redis / neo4j)..."
	$(COMPOSE_DEV) up -d postgres redis neo4j

infra-stop:
	@echo "Stopping infra..."
	$(COMPOSE_DEV) stop postgres redis neo4j

# =====================
# Migrations
# =====================

migrate:
	@echo "Running migrations..."
	@if ! $(COMPOSE_DEV) ps -q neo4j | grep -q .; then \
		echo "Neo4j not running → starting infra"; \
		$(COMPOSE_DEV) up -d --wait neo4j; \
	fi
	yarn migrate

# =====================
# Main workflows
# =====================

dev:
	@echo "Starting DEV environment..."
	$(MAKE) check-env
	$(MAKE) infra
	$(MAKE) migrate
	$(MAKE) build-dev
	$(MAKE) up-dev
	$(MAKE) open-browser
	$(COMPOSE_DEV) logs -f

prod:
	@echo "Starting PROD environment..."
	$(MAKE) check-env
	$(MAKE) build-prod
	$(MAKE) up-prod

# =====================
# Up / Down
# =====================

up-dev:
	$(COMPOSE_DEV) up -d --no-build

up-prod:
	$(COMPOSE_PROD) up -d --no-build

down:
	-$(COMPOSE_DEV) down
	-$(COMPOSE_PROD) down

# =====================
# Local commands
# =====================

api:
	cd $(PROJECT_ROOT)/flowsint-api && \
	poetry run uvicorn app.main:app --host 0.0.0.0 --port 5001 --reload

frontend:
	$(COMPOSE_DEV) up -d flowsint-app
	$(MAKE) open-browser

celery:
	cd $(PROJECT_ROOT)/flowsint-core && \
	poetry run celery -A flowsint_core.core.celery \
	worker --loglevel=info --pool=threads --concurrency=10

# =====================
# Tests / Install
# =====================

test:
	cd flowsint-types && poetry run pytest
	cd flowsint-core && poetry run pytest
	cd flowsint-enrichers && poetry run pytest

install:
	poetry config virtualenvs.in-project true --local
	$(MAKE) infra
	poetry install
	cd flowsint-core && poetry install
	cd flowsint-enrichers && poetry install
	cd flowsint-api && poetry install && poetry run alembic upgrade head

# =====================
# Cleanup (dangerous)
# =====================

clean:
	@echo "This will remove ALL Docker data. Continue? [y/N]"
	@read confirm; \
	if [ "$$confirm" != "y" ]; then exit 1; fi
	-$(COMPOSE_DEV) down -v --rmi all --remove-orphans
	-$(COMPOSE_PROD) down -v --rmi all --remove-orphans
	rm -rf flowsint-app/node_modules
	rm -rf flowsint-core/.venv
	rm -rf flowsint-enrichers/.venv
	rm -rf flowsint-api/.venv
