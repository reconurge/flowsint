#!/bin/bash

################################################################################
# FLOWSINT PROJECT - SETUP SCRIPT
# Purpose: إعداد بيئة التطوير والإنتاج
# Setup development and production environments
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="flowsint"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVIRONMENT="${1:-development}"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Banner
show_banner() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║         ${PROJECT_NAME^^} - SETUP SCRIPT                      ║"
    echo "║   إعداد بيئة التطوير والإنتاج                              ║"
    echo "║   Setup: Development & Production Environments             ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "جاري التحقق من المتطلبات الأساسية | Checking prerequisites..."
    
    local missing_tools=()
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        missing_tools+=("docker")
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        missing_tools+=("docker-compose")
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        missing_tools+=("node")
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        missing_tools+=("python3")
    fi
    
    # Check Git
    if ! command -v git &> /dev/null; then
        missing_tools+=("git")
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        log_error "الأدوات التالية مفقودة | Missing tools: ${missing_tools[*]}"
        return 1
    fi
    
    log_success "جميع المتطلبات موجودة | All prerequisites met"
    return 0
}

# Setup environment variables
setup_env_files() {
    log_info "جاري إعداد ملفات البيئة | Setting up environment files..."
    
    # Development .env.development
    if [ ! -f "$PROJECT_ROOT/.env.development" ]; then
        cat > "$PROJECT_ROOT/.env.development" << 'EOF'
# Development Environment Configuration
ENVIRONMENT=development
DEBUG=true

# API Configuration
API_HOST=0.0.0.0
API_PORT=5001
API_WORKERS=2

# Database Configuration
POSTGRES_USER=flowsint_dev
POSTGRES_PASSWORD=flowsint_dev_pass
POSTGRES_DB=flowsint_dev
POSTGRES_PORT=5433
DATABASE_URL=postgresql://flowsint_dev:flowsint_dev_pass@localhost:5433/flowsint_dev

NEO4J_USER=neo4j
NEO4J_PASSWORD=flowsint_neo4j_dev
NEO4J_URI=bolt://localhost:7687
NEO4J_DATABASE=neo4j

# Redis Configuration
REDIS_URI=redis://localhost:6379/0
REDIS_URL=redis://localhost:6379/0

# JWT and Security
JWT_SECRET_KEY=dev-secret-key-change-in-production-min-32-chars!
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
AUTH_SECRET=dev-auth-secret-change-in-production!
MASTER_VAULT_KEY=dev-master-vault-key-32-character!1

# External APIs
MISTRAL_API_KEY=your_mistral_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
CELERY_WORKERS=2

# Frontend
VITE_API_URL=http://localhost:5001
VITE_ENV=development

# Logging
LOG_LEVEL=DEBUG
LOG_FORMAT=json
EOF
        log_success "تم إنشاء .env.development | Created .env.development"
    else
        log_warning ".env.development موجود بالفعل | .env.development already exists"
    fi
    
    # Production .env.production
    if [ ! -f "$PROJECT_ROOT/.env.production" ]; then
        cat > "$PROJECT_ROOT/.env.production" << 'EOF'
# Production Environment Configuration
ENVIRONMENT=production
DEBUG=false

# API Configuration
API_HOST=0.0.0.0
API_PORT=5001
API_WORKERS=4

# Database Configuration (Change these values!)
POSTGRES_USER=flowsint_prod
POSTGRES_PASSWORD=CHANGE_THIS_PASSWORD_IN_PRODUCTION
POSTGRES_DB=flowsint
POSTGRES_PORT=5432
DATABASE_URL=postgresql://flowsint_prod:CHANGE_THIS_PASSWORD_IN_PRODUCTION@postgres:5432/flowsint

NEO4J_USER=neo4j
NEO4J_PASSWORD=CHANGE_THIS_PASSWORD_IN_PRODUCTION
NEO4J_URI=bolt://neo4j:7687
NEO4J_DATABASE=neo4j

# Redis Configuration
REDIS_URI=redis://redis:6379/0
REDIS_URL=redis://redis:6379/0

# JWT and Security (Generate new secrets!)
JWT_SECRET_KEY=GENERATE_NEW_SECRET_KEY_AT_LEAST_32_CHARACTERS_LONG!
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
AUTH_SECRET=GENERATE_NEW_AUTH_SECRET_AT_LEAST_32_CHARS!
MASTER_VAULT_KEY=GENERATE_NEW_MASTER_VAULT_KEY_32_CHARS!

# External APIs
MISTRAL_API_KEY=your_production_mistral_api_key
OPENAI_API_KEY=your_production_openai_api_key

# Celery
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
CELERY_WORKERS=4

# Frontend
VITE_API_URL=https://api.yourdomain.com
VITE_ENV=production

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json

# HTTPS/SSL
SSL_CERT_PATH=/etc/nginx/ssl/cert.pem
SSL_KEY_PATH=/etc/nginx/ssl/key.pem
EOF
        log_success "تم إنشاء .env.production | Created .env.production"
    else
        log_warning ".env.production موجود بالفعل | .env.production already exists"
    fi
}

# Create necessary directories
create_directories() {
    log_info "جاري إنشاء المجلدات المطلوبة | Creating required directories..."
    
    mkdir -p "$PROJECT_ROOT/logs"
    mkdir -p "$PROJECT_ROOT/data"
    mkdir -p "$PROJECT_ROOT/backups"
    mkdir -p "$PROJECT_ROOT/storage"
    mkdir -p "$PROJECT_ROOT/.ssl"
    mkdir -p "$PROJECT_ROOT/scripts/migrations"
    
    log_success "تم إنشاء المجلدات | Directories created"
}

# Generate SSL certificates for development
generate_ssl_certs() {
    log_info "جاري إنشاء شهادات SSL مضمنة | Generating self-signed SSL certificates..."
    
    SSL_DIR="$PROJECT_ROOT/.ssl"
    
    if [ ! -f "$SSL_DIR/cert.pem" ] || [ ! -f "$SSL_DIR/key.pem" ]; then
        openssl req -x509 -newkey rsa:4096 -keyout "$SSL_DIR/key.pem" -out "$SSL_DIR/cert.pem" \
            -days 365 -nodes -subj "/CN=localhost"
        log_success "تم إنشاء شهادات SSL | SSL certificates generated"
    else
        log_warning "شهادات SSL موجودة بالفعل | SSL certificates already exist"
    fi
}

# Setup backend
setup_backend() {
    log_info "جاري إعداد الواجهة الخلفية | Setting up backend..."
    
    cd "$PROJECT_ROOT/flowsint-api"
    
    # Check for uv package manager
    if ! command -v uv &> /dev/null; then
        log_warning "uv غير مثبت، جاري التثبيت | uv not installed, installing..."
        curl -LsSf https://astral.sh/uv/install.sh | sh
    fi
    
    # Install dependencies
    log_info "جاري تثبيت المكتبات | Installing Python dependencies..."
    uv sync --all-extras
    
    cd "$PROJECT_ROOT"
    log_success "تم إعداد الواجهة الخلفية | Backend setup completed"
}

# Setup frontend
setup_frontend() {
    log_info "جاري إعداد الواجهة الأمامية | Setting up frontend..."
    
    cd "$PROJECT_ROOT/flowsint-app"
    
    # Install dependencies
    log_info "جاري تثبيت المكتبات | Installing Node dependencies..."
    yarn install
    
    cd "$PROJECT_ROOT"
    log_success "تم إعداد الواجهة الأمامية | Frontend setup completed"
}

# Validate setup
validate_setup() {
    log_info "جاري التحقق من الإعداد | Validating setup..."
    
    local validation_passed=true
    
    # Check environment files
    if [ ! -f "$PROJECT_ROOT/.env.development" ]; then
        log_error "ملف .env.development مفقود | .env.development not found"
        validation_passed=false
    fi
    
    # Check directories
    if [ ! -d "$PROJECT_ROOT/logs" ]; then
        log_error "مجلد logs مفقود | logs directory not found"
        validation_passed=false
    fi
    
    if [ "$validation_passed" = true ]; then
        log_success "تم التحقق من الإعداد بنجاح | Setup validation passed"
        return 0
    else
        log_error "فشل التحقق من الإعداد | Setup validation failed"
        return 1
    fi
}

# Main execution
main() {
    show_banner
    
    log_info "بدء الإعداد للبيئة: $ENVIRONMENT | Starting setup for environment: $ENVIRONMENT"
    
    check_prerequisites || exit 1
    
    create_directories
    setup_env_files
    
    if [ "$ENVIRONMENT" = "development" ]; then
        generate_ssl_certs
        setup_backend
        setup_frontend
    fi
    
    validate_setup || exit 1
    
    echo ""
    log_success "تم إكمال الإعداد بنجاح | Setup completed successfully!"
    echo ""
    echo -e "${BLUE}الخطوات التالية | Next steps:${NC}"
    echo "1. تعديل ملفات البيئة | Edit environment files:"
    echo "   - .env.development (للتطوير | for development)"
    echo "   - .env.production (للإنتاج | for production)"
    echo ""
    echo "2. تشغيل المشروع | Start the project:"
    echo "   ./start.sh development"
    echo ""
}

main "$@"
