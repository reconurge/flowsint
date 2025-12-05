PROJECT_ROOT := $(shell pwd)

.PHONY: install run stop stop-dev stop-prod infra api frontend celery clean dev prod check-env build-dev build-prod open-browser test
ENV_DIRS := . flowsint-api flowsint-core flowsint-app

open-browser:
	@echo "⏳ Waiting for frontend to be ready..."
	@bash -c 'until curl -s http://localhost:5173 > /dev/null 2>&1; do sleep 1; done'
	@echo "🌐 Opening browser..."
	@open http://localhost:5173 2>/dev/null || xdg-open http://localhost:5173 2>/dev/null || echo "✅ Flowsint ready at http://localhost:5173"

dev:
	@echo "🐙 Starting Flowsint in DEVELOPMENT mode..."
	$(MAKE) check-env
	docker compose -f docker-compose.dev.yml up --build -d
	$(MAKE) open-browser
	docker compose -f docker-compose.dev.yml logs -f

prod:
	@echo "🐙 Starting Flowsint in PRODUCTION mode..."
	$(MAKE) check-env
	docker compose -f docker-compose.prod.yml up -d
	$(MAKE) open-browser

build-dev:
	@echo "🔨 Building development images..."
	docker compose -f docker-compose.dev.yml build

build-prod:
	@echo "🔨 Building production images..."
	docker compose -f docker-compose.prod.yml build

check-env:
	@echo "🔎 Checking .env files..."
	@for dir in $(ENV_DIRS); do \
		env_file="$$dir/.env"; \
		env_example="$(PROJECT_ROOT)/.env.example"; \
		if [ -f "$$env_file" ]; then \
			echo "✅ Using existing .env in $$dir"; \
		else \
			echo "⚠️ .env missing in $$dir, copying from .env.example"; \
			cp "$$env_example" "$$env_file"; \
		fi; \
	done

test:
	@echo "🔎 Running tests..."
	cd $(PROJECT_ROOT)/flowsint-types && poetry run pytest
	cd $(PROJECT_ROOT)/flowsint-core && poetry run pytest
	cd $(PROJECT_ROOT)/flowsint-enrichers && poetry run pytest

install:
	@echo "🐙 Installing Flowsint project modules..."
	@if ! command -v poetry >/dev/null 2>&1; then \
		echo "⚠️ Poetry is not installed. Please install it:"; \
		echo "pipx install poetry"; \
		echo "or"; \
		echo "curl -sSL https://install.python-poetry.org | python3 -"; \
		exit 1; \
	fi
	poetry config virtualenvs.in-project true --local
	docker compose up -d postgres redis neo4j
	poetry install
	cd $(PROJECT_ROOT)/flowsint-core && poetry install
	cd $(PROJECT_ROOT)/flowsint-enrichers && poetry install
	cd $(PROJECT_ROOT)/flowsint-api && poetry install && poetry run alembic upgrade head
	@echo "✅ All modules installed successfully!"

infra:
	docker compose up -d

api:
	cd $(PROJECT_ROOT)/flowsint-api && poetry run uvicorn app.main:app --host 0.0.0.0 --port 5001 --reload

frontend:
	@echo "🐙 Starting frontend and opening browser..."
	@docker compose up -d flowsint-app
	@bash -c 'until curl -s http://localhost:5173 > /dev/null 2>&1; do sleep 1; done; open http://localhost:5173 2>/dev/null || xdg-open http://localhost:5173 2>/dev/null || echo "✅ Frontend ready at http://localhost:5173"'

frontend_prod:
	cd $(PROJECT_ROOT)/flowsint-app && npm run build

celery:
	cd $(PROJECT_ROOT)/flowsint-core && poetry run celery -A flowsint_core.core.celery worker --loglevel=info --pool=solo

run:
	@echo "🐙 Starting all services..."
	docker compose up -d
	@echo "⏳ Waiting for frontend to be ready..."
	@bash -c 'until curl -s http://localhost:5173 > /dev/null 2>&1; do sleep 1; done'
	@echo "🌐 Opening browser..."
	@open http://localhost:5173 2>/dev/null || xdg-open http://localhost:5173 2>/dev/null || echo "✅ All services ready! Flowsint at http://localhost:5173"
	$(MAKE) -j2 api celery

stop:
	@echo "🛑 Stopping all services..."
	-docker compose -f docker-compose.dev.yml down
	-docker compose -f docker-compose.prod.yml down
	-docker compose down

stop-dev:
	@echo "🛑 Stopping development services..."
	docker compose -f docker-compose.dev.yml down

stop-prod:
	@echo "🛑 Stopping production services..."
	docker compose -f docker-compose.prod.yml down

clean:
	@echo "⚠️  WARNING: This will remove ALL Docker containers, images, volumes, and virtual environments."
	@echo "⚠️  ALL DATA in databases and volumes will be permanently deleted!"
	@echo ""
	@read -p "Are you sure you want to continue? [y/N]: " confirm; \
	if [ "$$confirm" != "y" ] && [ "$$confirm" != "Y" ]; then \
		echo "❌ Cleanup cancelled."; \
		exit 1; \
	fi
	@echo "🧹 Removing containers, images, volumes and venvs..."
	-docker compose -f docker-compose.dev.yml down -v --rmi all --remove-orphans
	-docker compose -f docker-compose.prod.yml down -v --rmi all --remove-orphans
	-docker compose down -v --rmi all --remove-orphans
	rm -rf $(PROJECT_ROOT)/flowsint-app/node_modules
	rm -rf $(PROJECT_ROOT)/flowsint-core/.venv
	rm -rf $(PROJECT_ROOT)/flowsint-enrichers/.venv
	rm -rf $(PROJECT_ROOT)/flowsint-api/.venv
	@echo "✅ Cleanup complete!"
