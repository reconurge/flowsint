PROJECT_ROOT := $(shell pwd)

COMPOSE_DEV    := docker compose -f docker-compose.dev.yml
COMPOSE_PROD   := docker compose -f docker-compose.prod.yml

.PHONY: \
	dev prod \
	build-dev \
	up-dev up-prod down \
	infra-dev infra-prod infra-stop-dev infra-stop-prod \
	migrate-dev migrate-prod \
	alembic-upgrade alembic-downgrade alembic-revision \
	api frontend celery \
	test install clean check-env open-browser-dev open-browser-prod \
	logs-dev logs-prod status \
	regenerate-router \
	lint lint-fix typecheck

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
	@echo "Starting PROD environment (pre-built images)..."
	$(MAKE) check-env
	$(COMPOSE_PROD) pull
	$(MAKE) up-prod
	@echo ""
	@echo "Production started!"
	@echo "  Frontend: http://localhost:5173"
	@echo "  API:      http://localhost:5173/api (proxied)"

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
	@echo "Waiting for frontend on port 5173..."
	@bash -c 'until curl -s http://localhost:5173 > /dev/null 2>&1; do sleep 2; done'
	@open http://localhost:5173 2>/dev/null || \
	 xdg-open http://localhost:5173 2>/dev/null || \
	 echo "Frontend ready at http://localhost:5173"

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
	cd $(PROJECT_ROOT)/flowsint-api && uv run alembic upgrade head

alembic-downgrade:
	@echo "Rolling back last Alembic migration..."
	cd $(PROJECT_ROOT)/flowsint-api && uv run alembic downgrade -1

alembic-revision:
	@if [ -z "$(m)" ]; then \
		echo "Usage: make alembic-revision m=\"your migration message\""; exit 1; \
	fi
	@echo "Creating new Alembic migration: $(m)"
	cd $(PROJECT_ROOT)/flowsint-api && uv run alembic revision --autogenerate -m "$(m)"

api:
	cd $(PROJECT_ROOT)/flowsint-api && \
	uv run uvicorn app.main:app --host 0.0.0.0 --port 5001 --reload

frontend:
	cd $(PROJECT_ROOT)/flowsint-app && yarn dev

celery:
	cd $(PROJECT_ROOT)/flowsint-api && \
	uv run celery -A flowsint_core.core.celery \
	worker --loglevel=info --pool=threads --concurrency=10

test:
	cd flowsint-types && uv run pytest
	cd flowsint-core && uv run pytest
	cd flowsint-enrichers && uv run pytest
	cd flowsint-api && uv run pytest

PY_SRC := flowsint-core/src flowsint-core/tests \
	flowsint-api/app flowsint-api/tests flowsint-api/alembic \
	flowsint-enrichers/src flowsint-enrichers/tests \
	flowsint-types/src flowsint-types/tests

# Full-repo, blocking: formatting and lint are 100% clean today, so any
# regression here is new debt — no reason to let it in. ruff replaces
# black+isort+flake8 (one tool, one config — see [tool.ruff] in the root
# pyproject.toml, which every package's ruff invocation inherits by walking
# up the directory tree to find it). Frontend prettier/eslint are just as
# clean today (0 errors — eslint's ~130 remaining findings are all
# warnings, e.g. no-explicit-any, not failures), so they're blocking here
# too rather than living only in flowsint-app's own yarn scripts.
lint:
	uv run ruff format --check $(PY_SRC)
	uv run ruff check $(PY_SRC)
	cd flowsint-app && yarn format:check && yarn lint:check

lint-fix:
	uv run ruff format $(PY_SRC)
	uv run ruff check --fix $(PY_SRC)
	cd flowsint-app && yarn format && yarn lint

# mypy has ~2200 pre-existing errors across the workspace (real, not fixed
# blindly in one pass — see CI notes). Gating full-repo would be a
# lie from day one. Ratchet instead: block only on files this branch touches,
# so new code is held to the strict config and the backlog shrinks as files
# get touched, without a red CI on every unrelated PR.
#
# "Touches" means semantically, not cosmetically: a repo-wide `ruff format`
# adoption (or any future bulk reformat) diffs every file against BASE_REF
# without changing what any of them mean — if that gets counted as "changed",
# the ratchet degrades into gating the whole backlog on whichever PR happens
# to run the formatter first. A file only counts if re-running ruff on the
# BASE_REF version doesn't reproduce today's content byte-for-byte. Resolve
# the ruff binary once up front and call it directly in the loop below —
# invoking `uv run ruff` per file (up to ~2x per changed file) was flaky,
# occasionally producing a spurious empty result that made a purely
# reformatted file look "meaningful".
BASE_REF ?= origin/main
typecheck:
	@ruff_bin=$$(uv run which ruff); \
	changed=$$(git diff --name-only --diff-filter=ACMR $(BASE_REF)...HEAD -- '*.py' 2>/dev/null); \
	meaningful=""; \
	for f in $$changed; do \
		if git cat-file -e $(BASE_REF):$$f 2>/dev/null; then \
			old_reformatted=$$(git show $(BASE_REF):$$f | "$$ruff_bin" format --stdin-filename "$$f" - 2>/dev/null | "$$ruff_bin" check --fix --stdin-filename "$$f" - 2>/dev/null); \
			if [ "$$old_reformatted" = "$$(cat "$$f")" ]; then continue; fi; \
		fi; \
		meaningful="$$meaningful $$f"; \
	done; \
	changed=$$(printf '%s\n' $$meaningful); \
	if [ -z "$$changed" ]; then \
		echo "No semantically changed Python files vs $(BASE_REF) — skipping mypy."; \
		exit 0; \
	fi; \
	echo "$$changed"; \
	mypy_status=0; \
	for pkg in flowsint-core flowsint-api flowsint-enrichers flowsint-types; do \
		files=$$(echo "$$changed" | grep "^$$pkg/" | sed "s|^$$pkg/||"); \
		[ -z "$$files" ] && continue; \
		echo "== mypy: $$pkg =="; \
		(cd $$pkg && echo "$$files" | xargs -r uv run mypy) || mypy_status=1; \
	done; \
	exit $$mypy_status

install:
	$(MAKE) infra-dev
	uv sync
	cd flowsint-api && uv run alembic upgrade head

status:
	@echo "=== DEV Containers ==="
	@$(COMPOSE_DEV) ps 2>/dev/null || echo "No DEV containers"
	@echo ""
	@echo "=== PROD Containers ==="
	@$(COMPOSE_PROD) ps 2>/dev/null || echo "No PROD containers"

down:
	-$(COMPOSE_DEV) down
	-$(COMPOSE_PROD) down

clean:
	@echo "This will remove ALL Docker data. Continue? [y/N]"
	@read confirm; \
	if [ "$$confirm" != "y" ]; then exit 1; fi
	-$(COMPOSE_DEV) down -v --rmi all --remove-orphans
	-$(COMPOSE_PROD) down -v --rmi all --remove-orphans
	rm -rf flowsint-app/node_modules
	rm -rf .venv

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
	@echo "Production (pre-built GHCR images):"
	@echo "  make prod         - Pull images and start PROD environment"
	@echo "  make up-prod      - Start PROD containers"
	@echo "  make logs-prod    - Follow PROD logs"
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
