#!/bin/bash

################################################################################
# FLOWSINT PROJECT - START SCRIPT
# Purpose: بدء التطبيق في بيئة التطوير أو الإنتاج
# Start application in development or production
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVIRONMENT="${1:-development}"
SERVICES="${2:-all}"
COMMAND=""

if [ "$#" -gt 0 ]; then
    case "$1" in
        status|stop|help|--help|-h)
            COMMAND="$1"
            ENVIRONMENT="${2:-development}"
            ;;
        *)
            ENVIRONMENT="${1:-development}"
            SERVICES="${2:-all}"
            ;;
    esac
fi

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[⚠]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

# Banner
show_banner() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║         FLOWSINT - START SCRIPT                           ║"
    echo "║   بدء التطبيق | Start Application                        ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Check environment file
check_env() {
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    
    if [ ! -f "$env_file" ]; then
        log_error "ملف البيئة غير موجود | Environment file not found: $env_file"
        log_info "جاري تشغيل setup.sh | Running setup.sh..."
        bash "$PROJECT_ROOT/setup.sh" "$ENVIRONMENT"
    fi
    
    set -a
    . "$env_file"
    set +a
}

# Start development environment
start_dev() {
    log_info "جاري بدء بيئة التطوير | Starting development environment..."
    
    check_env
    
    case $SERVICES in
        all)
            log_info "بدء جميع الخدمات | Starting all services..."
            docker-compose -f "$PROJECT_ROOT/docker-compose.dev.yml" up -d
            
            log_success "تم بدء جميع الخدمات | All services started"
            echo ""
            echo -e "${CYAN}الخدمات التي يتم تشغيلها:${NC}"
            echo "  API          : http://localhost:5001"
            echo "  API Docs     : http://localhost:5001/docs"
            echo "  Frontend     : http://localhost:5173"
            echo "  PostgreSQL   : localhost:5433"
            echo "  Neo4j        : http://localhost:7474"
            echo "  Redis        : localhost:6379"
            echo ""
            ;;
        backend)
            log_info "بدء الخدمات الأساسية فقط | Starting infrastructure only..."
            docker-compose -f "$PROJECT_ROOT/docker-compose.dev.yml" up -d postgres neo4j redis
            
            log_info "بدء الواجهة الخلفية | Starting backend..."
            cd "$PROJECT_ROOT/flowsint-api"
            uvicorn app.main:app --reload --host 0.0.0.0 --port 5001
            ;;
        frontend)
            log_info "بدء الواجهة الأمامية فقط | Starting frontend only..."
            cd "$PROJECT_ROOT/flowsint-app"
            yarn dev
            ;;
        infrastructure)
            log_info "بدء الخدمات الأساسية فقط | Starting infrastructure services only..."
            docker-compose -f "$PROJECT_ROOT/docker-compose.dev.yml" up -d postgres neo4j redis
            log_success "تم بدء الخدمات الأساسية | Infrastructure services started"
            ;;
        *)
            log_error "خدمات غير معروفة | Unknown services: $SERVICES"
            echo "الخيارات المتاحة | Available options: all, backend, frontend, infrastructure"
            exit 1
            ;;
    esac
}

# Start production environment
start_prod() {
    log_info "جاري بدء بيئة الإنتاج | Starting production environment..."
    
    check_env
    
    # Verify required environment variables
    if [ -z "$JWT_SECRET_KEY" ]; then
        log_error "JWT_SECRET_KEY لم يتم تعيينه | JWT_SECRET_KEY not set"
        exit 1
    fi
    
    if [ -z "$MASTER_VAULT_KEY_V1" ]; then
        log_error "MASTER_VAULT_KEY_V1 لم يتم تعيينه | MASTER_VAULT_KEY_V1 not set"
        exit 1
    fi
    
    case $SERVICES in
        all)
            log_info "بدء جميع خدمات الإنتاج | Starting all production services..."
            docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" up -d
            
            log_success "تم بدء خدمات الإنتاج | Production services started"
            log_warning "الخدمات الآتية مفعلة | The following services are now active:"
            docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" ps
            ;;
        backend)
            log_info "بدء خدمات الإنتاج الأساسية | Starting production backend services..."
            docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" up -d api postgres neo4j redis
            log_success "تم بدء خدمات الإنتاج | Production services started"
            ;;
        frontend)
            log_info "بدء واجهة الإنتاج الأمامية | Starting production frontend..."
            docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" up -d app
            log_success "تم بدء الواجهة الأمامية | Frontend started"
            ;;
        *)
            log_error "خدمات غير معروفة | Unknown services: $SERVICES"
            exit 1
            ;;
    esac
}

# Display service status
show_status() {
    log_info "حالة الخدمات | Service Status:"
    echo ""
    
    case $ENVIRONMENT in
        development)
            docker-compose -f "$PROJECT_ROOT/docker-compose.dev.yml" ps
            ;;
        production)
            docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" ps
            ;;
    esac
    
    echo ""
}

# Stop services
stop_services() {
    log_warning "جاري إيقاف الخدمات | Stopping services..."
    
    case $ENVIRONMENT in
        development)
            docker-compose -f "$PROJECT_ROOT/docker-compose.dev.yml" down
            ;;
        production)
            docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" down
            ;;
    esac
    
    log_success "تم إيقاف جميع الخدمات | All services stopped"
}

# Show help
show_help() {
    echo "الاستخدام | Usage: $0 [environment] [services]"
    echo "          | Usage: $0 {status|stop|help} [environment]"
    echo ""
    echo "البيئة | Environment:"
    echo "  development  - بيئة التطوير (Default)"
    echo "  production   - بيئة الإنتاج"
    echo ""
    echo "الخدمات | Services:"
    echo "  all           - جميع الخدمات (Default)"
    echo "  backend       - الواجهة الخلفية فقط"
    echo "  frontend      - الواجهة الأمامية فقط"
    echo "  infrastructure - الخدمات الأساسية (DB, Cache, etc)"
    echo ""
    echo "الأمثلة | Examples:"
    echo "  $0 development all"
    echo "  $0 production backend"
    echo "  $0 development infrastructure"
    echo ""
}

# Main execution
main() {
    show_banner

    case "$COMMAND" in
        status)
            show_status
            return
            ;;
        stop)
            stop_services
            return
            ;;
        help|--help|-h)
            show_help
            return
            ;;
    esac

    case $ENVIRONMENT in
        development)
            start_dev
            ;;
        production)
            start_prod
            ;;
        *)
            log_error "بيئة غير معروفة | Unknown environment: $ENVIRONMENT"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
