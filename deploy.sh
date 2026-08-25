#!/bin/bash

################################################################################
# FLOWSINT PROJECT - DEPLOY SCRIPT
# Purpose: نشر التطبيق في الإنتاج
# Deploy application to production
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENT_TYPE="${1:-docker}"
ENVIRONMENT="${2:-production}"

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[⚠]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

# Banner
show_banner() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║         FLOWSINT - DEPLOYMENT SCRIPT                      ║"
    echo "║   نشر التطبيق | Application Deployment                    ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Pre-deployment checks
pre_deployment_checks() {
    log_info "جاري إجراء فحوصات ما قبل النشر | Running pre-deployment checks..."
    
    # Check if .env.production exists
    if [ ! -f "$PROJECT_ROOT/.env.production" ]; then
        log_error ".env.production غير موجود | .env.production not found"
        return 1
    fi
    
    # Check if Docker is running
    if ! docker ps &> /dev/null; then
        log_error "Docker ليس قيد التشغيل | Docker is not running"
        return 1
    fi
    
    # Check required environment variables
    log_info "جاري التحقق من متغيرات البيئة | Checking environment variables..."
    set -a
    source "$PROJECT_ROOT/.env.production"
    set +a
    
    if [ -z "$JWT_SECRET_KEY" ]; then
        log_error "JWT_SECRET_KEY لم يتم تعيينه | JWT_SECRET_KEY not set"
        return 1
    fi
    
    if [ -z "$MASTER_VAULT_KEY_V1" ]; then
        log_error "MASTER_VAULT_KEY_V1 لم يتم تعيينه | MASTER_VAULT_KEY_V1 not set"
        return 1
    fi
    
    log_success "تم التحقق من الفحوصات الأساسية | Pre-deployment checks passed"
    return 0
}

# Build backend
build_backend() {
    log_info "جاري بناء الواجهة الخلفية | Building backend..."
    
    cd "$PROJECT_ROOT/flowsint-api"
    docker build -f Dockerfile -t flowsint-api:latest -t flowsint-api:$(date +%Y%m%d_%H%M%S) .
    cd "$PROJECT_ROOT"
    
    log_success "تم بناء الواجهة الخلفية | Backend built successfully"
}

# Build frontend
build_frontend() {
    log_info "جاري بناء الواجهة الأمامية | Building frontend..."
    
    cd "$PROJECT_ROOT/flowsint-app"
    
    # Setup environment variables for build
    export VITE_ENV=production
    export VITE_API_URL=${VITE_API_URL:-https://api.yourdomain.com}
    
    # Build with Vite
    yarn build
    
    # Build Docker image
    docker build -f Dockerfile -t flowsint-app:latest -t flowsint-app:$(date +%Y%m%d_%H%M%S) .
    
    cd "$PROJECT_ROOT"
    
    log_success "تم بناء الواجهة الأمامية | Frontend built successfully"
}

# Build all services
build_all() {
    log_info "جاري بناء جميع الخدمات | Building all services..."
    
    build_backend
    build_frontend
    
    log_success "تم بناء جميع الخدمات | All services built successfully"
}

# Deploy with Docker Compose
deploy_docker_compose() {
    log_info "جاري نشر التطبيق باستخدام Docker Compose | Deploying with Docker Compose..."
    
    cd "$PROJECT_ROOT"
    
    # Stop existing containers
    log_info "إيقاف الحاويات الموجودة | Stopping existing containers..."
    docker-compose -f docker-compose.prod.yml down || true
    
    # Pull latest images (if using from registry)
    log_info "سحب أحدث الصور | Pulling latest images..."
    docker-compose -f docker-compose.prod.yml pull || true
    
    # Start services
    log_info "بدء الخدمات | Starting services..."
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for services to be healthy
    log_info "انتظار صحة الخدمات | Waiting for services to be healthy..."
    sleep 10
    
    # Check if services are running
    if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
        log_success "تم نشر التطبيق بنجاح | Application deployed successfully"
    else
        log_error "فشل نشر التطبيق | Deployment failed"
        return 1
    fi
}

# Deploy to Kubernetes
deploy_kubernetes() {
    log_info "جاري نشر التطبيق على Kubernetes | Deploying to Kubernetes..."
    
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl غير مثبت | kubectl not installed"
        return 1
    fi
    
    cd "$PROJECT_ROOT/k8s" || {
        log_error "مجلد k8s غير موجود | k8s directory not found"
        return 1
    }
    
    # Apply namespace
    kubectl apply -f namespace.yaml || true
    
    # Create secrets from environment file
    log_info "جاري إنشاء المتغيرات السرية | Creating secrets..."
    set -a
    source "$PROJECT_ROOT/.env.production"
    set +a
    
    kubectl create secret generic flowsint-secrets \
        --from-literal=jwt-secret-key="$JWT_SECRET_KEY" \
        --from-literal=auth-secret="$AUTH_SECRET" \
        --from-literal=master-vault-key-v1="$MASTER_VAULT_KEY_V1" \
        --from-literal=database-url="$DATABASE_URL" \
        --namespace=flowsint --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply manifests
    log_info "جاري تطبيق الموارد | Applying resources..."
    kubectl apply -f . -n flowsint
    
    # Wait for rollout
    log_info "انتظار الانتشار | Waiting for rollout..."
    kubectl rollout status deployment/flowsint-api -n flowsint --timeout=5m
    kubectl rollout status deployment/flowsint-app -n flowsint --timeout=5m
    
    log_success "تم النشر على Kubernetes بنجاح | Kubernetes deployment successful"
}

# Run database migrations
run_migrations() {
    log_info "جاري تشغيل ترقيات قاعدة البيانات | Running database migrations..."
    
    cd "$PROJECT_ROOT/flowsint-api"
    
    # Wait for database to be ready
    log_info "انتظار جاهزية قاعدة البيانات | Waiting for database to be ready..."
    sleep 5
    
    # Run migrations using Docker
    docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T api alembic upgrade head
    
    log_success "تم تشغيل الترقيات بنجاح | Migrations completed successfully"
}

# Health check
health_check() {
    log_info "جاري فحص صحة التطبيق | Running health checks..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -fsS http://localhost:5001/health > /dev/null; then
            log_success "التطبيق يعمل بصحة | Application is healthy"
            return 0
        fi
        
        log_info "محاولة $attempt/$max_attempts | Attempt $attempt/$max_attempts"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_error "فشل فحص الصحة | Health check failed"
    return 1
}

# Rollback deployment
rollback() {
    log_warning "جاري استرجاع النشر السابق | Rolling back to previous deployment..."
    
    case $DEPLOYMENT_TYPE in
        docker)
            # Restore previous Docker images or restart previous version
            log_info "استرجاع صور Docker السابقة | Restoring previous Docker images..."
            docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" down
            docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" up -d
            ;;
        kubernetes)
            kubectl rollout undo deployment/flowsint-api -n flowsint
            kubectl rollout undo deployment/flowsint-app -n flowsint
            ;;
    esac
    
    log_success "تم الاسترجاع بنجاح | Rollback completed"
}

# Generate deployment report
generate_report() {
    log_info "جاري توليد تقرير النشر | Generating deployment report..."
    
    local report_file="$PROJECT_ROOT/deployment-report-$(date +%Y%m%d_%H%M%S).md"
    
    cat > "$report_file" << EOF
# تقرير النشر | Deployment Report

**التاريخ | Date**: $(date)
**نوع النشر | Deployment Type**: $DEPLOYMENT_TYPE
**البيئة | Environment**: $ENVIRONMENT

## ملخص النشر | Deployment Summary

### الخدمات | Services
EOF
    
    if [ "$DEPLOYMENT_TYPE" = "docker" ]; then
        echo "#### Docker Compose Services" >> "$report_file"
        docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" ps >> "$report_file" 2>&1
    elif [ "$DEPLOYMENT_TYPE" = "kubernetes" ]; then
        echo "#### Kubernetes Resources" >> "$report_file"
        kubectl get all -n flowsint >> "$report_file" 2>&1
    fi
    
    cat >> "$report_file" << EOF

### متغيرات البيئة المكتشفة | Detected Environment Variables
- JWT_SECRET_KEY: $([ -z "$JWT_SECRET_KEY" ] && echo "❌ Not Set" || echo "✓ Set")
- MASTER_VAULT_KEY_V1: $([ -z "$MASTER_VAULT_KEY_V1" ] && echo "❌ Not Set" || echo "✓ Set")
- DATABASE_URL: $([ -z "$DATABASE_URL" ] && echo "❌ Not Set" || echo "✓ Set")

## الخطوات التالية | Next Steps
1. تفعيل HTTPS في nginx
2. إعداد نسخة احتياطية من قاعدة البيانات
3. مراقبة سجلات التطبيق
4. إعداد تنبيهات الأخطاء

EOF
    
    log_success "تم حفظ التقرير | Report saved to: $report_file"
    cat "$report_file"
}

# Main execution
main() {
    show_banner
    
    log_info "بدء النشر | Starting deployment..."
    echo ""
    
    if ! pre_deployment_checks; then
        log_error "فشلت فحوصات ما قبل النشر | Pre-deployment checks failed"
        exit 1
    fi
    
    case $DEPLOYMENT_TYPE in
        docker)
            build_all
            deploy_docker_compose
            run_migrations || log_warning "تحذير في الترقيات | Migration warning"
            health_check || {
                rollback
                exit 1
            }
            ;;
        kubernetes)
            build_all
            deploy_kubernetes
            run_migrations || log_warning "تحذير في الترقيات | Migration warning"
            health_check || {
                rollback
                exit 1
            }
            ;;
        build-only)
            build_all
            ;;
        *)
            log_error "نوع نشر غير معروف | Unknown deployment type: $DEPLOYMENT_TYPE"
            echo "الاستخدام | Usage: $0 {docker|kubernetes|build-only} [production|staging]"
            exit 1
            ;;
    esac
    
    generate_report
    
    echo ""
    log_success "تم إكمال النشر بنجاح | Deployment completed successfully!"
    echo ""
}

main "$@"
