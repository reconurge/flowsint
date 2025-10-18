PROJECT_ROOT := $(shell pwd)

.PHONY: install run stop infra api frontend celery clean dev check-env
ENV_DIRS := . flowsint-api flowsint-core flowsint-app


dev:
	$(MAKE) check-env
	$(MAKE) install
	$(MAKE) run

prod:
	$(MAKE) check-env
	docker compose up -d
	$(MAKE) frontend_prod

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
	docker compose up -d
	poetry install
	cd $(PROJECT_ROOT)/flowsint-core && poetry install
	cd $(PROJECT_ROOT)/flowsint-transforms && poetry install
	cd $(PROJECT_ROOT)/flowsint-api && poetry install && poetry run alembic upgrade head
	cd $(PROJECT_ROOT)/flowsint-app && yarn install
	@echo "✅ All modules installed successfully!"

infra:
	docker compose up -d

api:
	cd $(PROJECT_ROOT)/flowsint-api && poetry run uvicorn app.main:app --host 0.0.0.0 --port 5001 --reload

frontend:
	cd $(PROJECT_ROOT)/flowsint-app && npm run dev

frontend_prod:
	cd $(PROJECT_ROOT)/flowsint-app && npm run build

celery:
	cd $(PROJECT_ROOT)/flowsint-core && poetry run celery -A flowsint_core.core.celery worker --loglevel=info --pool=solo

run: infra
	$(MAKE) -j3 api frontend celery

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
