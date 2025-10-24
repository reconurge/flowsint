PROJECT_ROOT := $(shell pwd)

.PHONY: install run stop infra api frontend celery clean dev check-env
ENV_DIRS := . flowsint-api flowsint-core flowsint-app


dev:
	$(MAKE) check-env
	$(MAKE) install
	$(MAKE) run

prod:
	# temporary
	$(MAKE) check-env
	$(MAKE) install
	$(MAKE) run

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

install:
	@echo "🚀 Installing Flowsint project modules..."
	@if ! command -v poetry >/dev/null 2>&1; then \
		echo "⚠️ Poetry is not installed. Please install it:"; \
		echo "pipx install poetry"; \
		echo "or"; \
		echo "curl -sSL https://install.python-poetry.org | python3 -"; \
		exit 1; \
	fi
	poetry config virtualenvs.in-project true --local
	poetry env use python3.12
	docker compose up -d postgres redis neo4j
	poetry install
	cd $(PROJECT_ROOT)/flowsint-core && poetry install
	cd $(PROJECT_ROOT)/flowsint-transforms && poetry install
	cd $(PROJECT_ROOT)/flowsint-api && poetry install && poetry run alembic upgrade head
	@echo "✅ All modules installed successfully!"

infra:
	docker compose up -d

api:
	cd $(PROJECT_ROOT)/flowsint-api && poetry run uvicorn app.main:app --host 0.0.0.0 --port 5001 --reload

frontend:
	@echo "🚀 Starting frontend and opening browser..."
	@docker compose up -d flowsint-app
	@bash -c 'until curl -s http://localhost:5173 > /dev/null 2>&1; do sleep 1; done; open http://localhost:5173 2>/dev/null || xdg-open http://localhost:5173 2>/dev/null || echo "✅ Frontend ready at http://localhost:5173"'

frontend_prod:
	cd $(PROJECT_ROOT)/flowsint-app && npm run build

celery:
	cd $(PROJECT_ROOT)/flowsint-core && poetry run celery -A flowsint_core.core.celery worker --loglevel=info --pool=solo

run:
	@echo "🚀 Starting all services..."
	docker compose up -d
	@echo "⏳ Waiting for frontend to be ready..."
	@bash -c 'until curl -s http://localhost:5173 > /dev/null 2>&1; do sleep 1; done'
	@echo "🌐 Opening browser..."
	@open http://localhost:5173 2>/dev/null || xdg-open http://localhost:5173 2>/dev/null || echo "✅ All services ready! Frontend at http://localhost:5173"
	$(MAKE) -j2 api celery

stop:
	@echo "🛑 Stopping all services..."
	-docker compose down

# --- Nettoyage complet ---
clean:
	@echo "Removing containers, volumes and venvs..."
	docker compose down -v --remove-orphans
	rm -rf $(PROJECT_ROOT)/flowsint-app/node_modules
	rm -rf $(PROJECT_ROOT)/flowsint-core/.venv
	rm -rf $(PROJECT_ROOT)/flowsint-transforms/.venv
	rm -rf $(PROJECT_ROOT)/flowsint-api/.venv
