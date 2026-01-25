# =====================
# Global configuration
# =====================
PROJECT_ROOT := $(shell pwd)

# Disable BuildKit for local stability
export DOCKER_BUILDKIT=0
export COMPOSE_PARALLEL_LIMIT=1

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

open-browser:
	@echo "Waiting for frontend..."
	@bash -c 'until curl -s http://localhost:5173 > /dev/null 2>&1; do sleep 1; done'
	@open http://localhost:5173 2>/dev/null || \
	 xdg-open http://localhost:5173 2>/dev/null || \
	 echo "Frontend ready at http://localhost:5173"

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

# =====================
# Build targets
# =====================

build-dev:
	@echo "Building DEV images..."
	docker compose -f docker-compose.dev.yml build

build-prod:
	@echo "Building PROD images..."
	docker compose -f docker-compose.prod.yml build

# =====================
# Up / Down
# =====================

up-dev:
	docker compose -f docker-compose.dev.yml up -d --no-build

up-prod:
	docker compose -f docker-compose.prod.yml up -d --no-build

down:
	-docker compose -f docker-compose.dev.yml down
	-docker compose -f docker-compose.prod.yml down
	-docker compose down

# =====================
# Main workflows
# =====================

dev:
	@echo "Starting DEV environment..."
	$(MAKE) check-env
	$(MAKE) migrate
	$(MAKE) build-dev
	$(MAKE) up-dev
	$(MAKE) open-browser
	docker compose -f docker-compose.dev.yml logs -f

prod:
	@echo "Starting PROD environment..."
	$(MAKE) check-env
	$(MAKE) migrate
	$(MAKE) build-prod
	$(MAKE) up-prod
	$(MAKE) open-browser

# =====================
# Local commands
# =====================

api:
	cd $(PROJECT_ROOT)/flowsint-api && \
	poetry run uvicorn app.main:app --host 0.0.0.0 --port 5001 --reload

frontend:
	docker compose up -d flowsint-app
	$(MAKE) open-browser

celery:
	cd $(PROJECT_ROOT)/flowsint-core && \
	poetry run celery -A flowsint_core.core.celery \
	worker --loglevel=info --pool=threads --concurrency=10

# =====================
# Infra / DB
# =====================

infra:
	docker compose up -d postgres redis neo4j

migrate:
	@echo "Running migrations..."
	docker compose up -d --wait neo4j
	yarn migrate
	docker compose stop neo4j

# =====================
# Tests / Install
# =====================

test:
	cd $(PROJECT_ROOT)/flowsint-types && poetry run pytest
	cd $(PROJECT_ROOT)/flowsint-core && poetry run pytest
	cd $(PROJECT_ROOT)/flowsint-enrichers && poetry run pytest

install:
	poetry config virtualenvs.in-project true --local
	docker compose up -d postgres redis neo4j
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
	-docker compose -f docker-compose.dev.yml down -v --rmi all --remove-orphans
	-docker compose -f docker-compose.prod.yml down -v --rmi all --remove-orphans
	rm -rf flowsint-app/node_modules
	rm -rf flowsint-core/.venv
	rm -rf flowsint-enrichers/.venv
	rm -rf flowsint-api/.venv
