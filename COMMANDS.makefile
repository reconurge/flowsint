.PHONY: help setup install build deploy start stop restart logs status health clean update

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m

ENVIRONMENT ?= development
SERVICES ?= all

##@ Help
help: ## Display this help screen | عرض هذه الشاشة
	@echo "$(BLUE)╔════════════════════════════════════════════════════╗$(NC)"
	@echo "$(BLUE)║     FLOWSINT - Make Commands                      ║$(NC)"
	@echo "$(BLUE)║     الأوامر المتاحة                               ║$(NC)"
	@echo "$(BLUE)╚════════════════════════════════════════════════════╝$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

##@ Setup & Installation
setup: ## Run setup script | تشغيل سكريبت الإعداد
	@chmod +x setup.sh
	@./setup.sh $(ENVIRONMENT)
.PHONY: setup

install: ## Run installation script | تشغيل سكريبت التثبيت
	@chmod +x install.sh
	@./install.sh full
.PHONY: install

install-backend: ## Install backend only | تثبيت الواجهة الخلفية فقط
	@chmod +x install.sh
	@./install.sh backend
.PHONY: install-backend

install-frontend: ## Install frontend only | تثبيت الواجهة الأمامية فقط
	@chmod +x install.sh
	@./install.sh frontend
.PHONY: install-frontend

##@ Building
build: ## Build all services | بناء جميع الخدمات
	@chmod +x deploy.sh
	@./deploy.sh build-only $(ENVIRONMENT)
.PHONY: build

build-api: ## Build API Docker image | بناء صورة API
	@cd flowsint-api && docker build -f Dockerfile -t flowsint-api:latest .
.PHONY: build-api

build-app: ## Build Frontend Docker image | بناء صورة الواجهة الأمامية
	@cd flowsint-app && docker build -f Dockerfile -t flowsint-app:latest .
.PHONY: build-app

##@ Development
dev: ## Start development environment | بدء بيئة التطوير
	@chmod +x start.sh
	@./start.sh development all
.PHONY: dev

dev-backend: ## Start backend in development | بدء الواجهة الخلفية فقط
	@chmod +x start.sh
	@./start.sh development backend
.PHONY: dev-backend

dev-frontend: ## Start frontend in development | بدء الواجهة الأمامية فقط
	@chmod +x start.sh
	@./start.sh development frontend
.PHONY: dev-frontend

dev-infra: ## Start infrastructure only | بدء الخدمات الأساسية فقط
	@chmod +x start.sh
	@./start.sh development infrastructure
.PHONY: dev-infra

##@ Production
prod: ## Start production environment | بدء بيئة الإنتاج
	@chmod +x start.sh
	@./start.sh production all
.PHONY: prod

deploy: ## Deploy to production | النشر في الإنتاج
	@chmod +x deploy.sh
	@./deploy.sh docker production
.PHONY: deploy

deploy-k8s: ## Deploy to Kubernetes | النشر على Kubernetes
	@chmod +x deploy.sh
	@./deploy.sh kubernetes production
.PHONY: deploy-k8s

##@ Services Management
start: ## Start services | بدء الخدمات
	@chmod +x start.sh
	@./start.sh $(ENVIRONMENT) $(SERVICES)
.PHONY: start

stop: ## Stop all services | إيقاف جميع الخدمات
	@chmod +x start.sh
	@./start.sh stop
.PHONY: stop

restart: ## Restart services | إعادة تشغيل الخدمات
	@$(MAKE) stop
	@sleep 3
	@$(MAKE) start
.PHONY: restart

status: ## Show services status | عرض حالة الخدمات
	@chmod +x start.sh
	@./start.sh status
.PHONY: status

health: ## Check services health | فحص صحة الخدمات
	@echo "$(BLUE)Checking API health...$(NC)"
	@curl -s http://localhost:5001/api/health || echo "$(RED)API is not responding$(NC)"
	@echo ""
	@echo "$(BLUE)Service status:$(NC)"
	@docker-compose -f docker-compose.dev.yml ps 2>/dev/null || echo "$(YELLOW)docker-compose.dev.yml not found$(NC)"
.PHONY: health

##@ Database
db-migrate: ## Run database migrations | تطبيق ترقيات قاعدة البيانات
	@echo "$(BLUE)Running migrations...$(NC)"
	@cd flowsint-api && alembic upgrade head
.PHONY: db-migrate

db-backup: ## Create database backup | عمل نسخة احتياطية
	@echo "$(BLUE)Creating database backup...$(NC)"
	@docker-compose exec postgres pg_dump -U flowsint_dev flowsint_dev | gzip > backup-$(shell date +%Y%m%d_%H%M%S).sql.gz
	@echo "$(GREEN)Backup created successfully$(NC)"
.PHONY: db-backup

db-restore: ## Restore database backup | استرجاع النسخة الاحتياطية
	@echo "$(YELLOW)Enter backup filename (e.g., backup-20240101_120000.sql.gz):$(NC)"
	@read BACKUP_FILE; \
	if [ -f $$BACKUP_FILE ]; then \
		gunzip -c $$BACKUP_FILE | docker-compose exec -T postgres psql -U flowsint_dev flowsint_dev; \
		echo "$(GREEN)Database restored successfully$(NC)"; \
	else \
		echo "$(RED)Backup file not found: $$BACKUP_FILE$(NC)"; \
	fi
.PHONY: db-restore

db-shell: ## Open database shell | فتح قوقعة قاعدة البيانات
	@echo "$(BLUE)Connecting to PostgreSQL...$(NC)"
	@docker-compose exec postgres psql -U flowsint_dev flowsint_dev
.PHONY: db-shell

##@ Logs & Monitoring
logs: ## Show services logs | عرض سجلات الخدمات
	@docker-compose logs -f --tail=100
.PHONY: logs

logs-api: ## Show API logs | عرض سجلات API
	@docker-compose logs -f --tail=100 api
.PHONY: logs-api

logs-db: ## Show database logs | عرض سجلات قاعدة البيانات
	@docker-compose logs -f --tail=100 postgres
.PHONY: logs-db

logs-neo4j: ## Show Neo4j logs | عرض سجلات Neo4j
	@docker-compose logs -f --tail=100 neo4j
.PHONY: logs-neo4j

##@ Testing
test: ## Run all tests | تشغيل جميع الاختبارات
	@echo "$(BLUE)Running tests...$(NC)"
	@cd flowsint-types && pytest -v
	@cd flowsint-core && pytest -v
	@cd flowsint-enrichers && pytest -v
	@echo "$(GREEN)Tests completed$(NC)"
.PHONY: test

test-core: ## Run core tests | اختبارات Core
	@cd flowsint-core && pytest -v
.PHONY: test-core

test-types: ## Run types tests | اختبارات Types
	@cd flowsint-types && pytest -v
.PHONY: test-types

test-enrichers: ## Run enrichers tests | اختبارات Enrichers
	@cd flowsint-enrichers && pytest -v
.PHONY: test-enrichers

lint: ## Run linting | تشغيل التدقيق
	@echo "$(BLUE)Running linting...$(NC)"
	@cd flowsint-api && pylint app/ --disable=all --enable=syntax-error,undefined-variable || true
	@cd flowsint-app && npm run lint || true
	@echo "$(GREEN)Linting completed$(NC)"
.PHONY: lint

##@ Cleanup
clean: ## Clean up temporary files | تنظيف الملفات المؤقتة
	@echo "$(YELLOW)Cleaning up temporary files...$(NC)"
	@find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name node_modules/.cache -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@echo "$(GREEN)Cleanup completed$(NC)"
.PHONY: clean

docker-clean: ## Clean Docker resources | تنظيف موارد Docker
	@echo "$(YELLOW)Cleaning Docker resources...$(NC)"
	@docker system prune -f --volumes
	@echo "$(GREEN)Docker cleanup completed$(NC)"
.PHONY: docker-clean

##@ Update & Maintenance
update: ## Update dependencies | تحديث المكتبات
	@echo "$(BLUE)Updating dependencies...$(NC)"
	@cd flowsint-app && yarn upgrade
	@cd flowsint-api && uv sync --upgrade
	@echo "$(GREEN)Updates completed$(NC)"
.PHONY: update

requirements: ## Generate requirements files | توليد ملفات المتطلبات
	@echo "$(BLUE)Generating requirements...$(NC)"
	@cd flowsint-api && pip freeze > requirements.txt
	@echo "$(GREEN)Requirements generated$(NC)"
.PHONY: requirements

##@ Documentation
docs: ## Generate documentation | توليد الوثائق
	@echo "$(BLUE)Generating documentation...$(NC)"
	@echo "$(GREEN)Documentation ready$(NC)"
.PHONY: docs

info: ## Show system info | عرض معلومات النظام
	@echo "$(BLUE)System Information:$(NC)"
	@echo "Docker version: $$(docker --version 2>/dev/null || echo 'Not installed')"
	@echo "Docker Compose version: $$(docker-compose --version 2>/dev/null || echo 'Not installed')"
	@echo "Node version: $$(node -v 2>/dev/null || echo 'Not installed')"
	@echo "Python version: $$(python3 --version 2>/dev/null || echo 'Not installed')"
	@echo "Yarn version: $$(yarn --version 2>/dev/null || echo 'Not installed')"
	@echo ""
	@echo "$(BLUE)Project Information:$(NC)"
	@echo "Project: FLOWSINT"
	@echo "Environment: $(ENVIRONMENT)"
	@echo "Services: $(SERVICES)"
.PHONY: info

##@ Quick Start
quick-start: ## Quick start setup for development | إعداد سريع للتطوير
	@echo "$(BLUE)Starting quick setup for development...$(NC)"
	@$(MAKE) setup ENVIRONMENT=development
	@$(MAKE) install
	@$(MAKE) dev
.PHONY: quick-start

quick-prod: ## Quick start setup for production | إعداد سريع للإنتاج
	@echo "$(BLUE)Starting quick setup for production...$(NC)"
	@$(MAKE) setup ENVIRONMENT=production
	@$(MAKE) install
	@$(MAKE) deploy
.PHONY: quick-prod
