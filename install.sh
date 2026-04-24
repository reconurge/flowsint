#!/bin/bash

################################################################################
# FLOWSINT PROJECT - INSTALL SCRIPT
# Purpose: تثبيت جميع المكتبات والمتطلبات
# Install all dependencies and requirements
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_TYPE="${1:-full}"

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[⚠]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

# Banner
show_banner() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║         FLOWSINT - INSTALL SCRIPT                         ║"
    echo "║   تثبيت المكتبات والمتطلبات | Install Dependencies       ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Install system dependencies
install_system_deps() {
    log_info "جاري تثبيت متطلبات النظام | Installing system dependencies..."
    
    if command -v apt-get &> /dev/null; then
        log_info "الكشف عن نظام Ubuntu/Debian | Detected Ubuntu/Debian"
        sudo apt-get update
        sudo apt-get install -y \
            build-essential \
            curl \
            git \
            wget \
            libssl-dev \
            libffi-dev \
            python3-dev \
            python3-pip \
            libpq-dev \
            libcairo2-dev \
            pkg-config \
            nodejs \
            npm
        log_success "تم تثبيت متطلبات النظام | System dependencies installed"
    elif command -v brew &> /dev/null; then
        log_info "الكشف عن macOS | Detected macOS"
        brew install python@3.12 node cairo pkg-config
        log_success "تم تثبيت متطلبات النظام | System dependencies installed"
    else
        log_warning "لم يتم التعرف على نظام التشغيل | Unknown system, skipping system deps"
    fi
}

# Install Node.js dependencies
install_node_deps() {
    log_info "جاري تثبيت مكتبات Node.js | Installing Node.js dependencies..."
    
    # Check if yarn is available, otherwise use npm
    if command -v yarn &> /dev/null; then
        log_info "استخدام yarn | Using yarn"
        cd "$PROJECT_ROOT/flowsint-app"
        yarn install
        cd "$PROJECT_ROOT"
        log_success "تم تثبيت مكتبات Node.js | Node.js dependencies installed"
    else
        log_info "تثبيت yarn عالمياً | Installing yarn globally"
        npm install -g yarn
        cd "$PROJECT_ROOT/flowsint-app"
        yarn install
        cd "$PROJECT_ROOT"
        log_success "تم تثبيت مكتبات Node.js | Node.js dependencies installed"
    fi
}

# Install Python dependencies
install_python_deps() {
    log_info "جاري تثبيت مكتبات Python | Installing Python dependencies..."
    
    # Check if uv is installed
    if ! command -v uv &> /dev/null; then
        log_info "تثبيت uv package manager"
        curl -LsSf https://astral.sh/uv/install.sh | sh
        export PATH="$HOME/.local/bin:$PATH"
    fi
    
    # Install flowsint-api dependencies
    log_info "تثبيت مكتبات API | Installing API dependencies..."
    cd "$PROJECT_ROOT/flowsint-api"
    uv sync --all-extras
    cd "$PROJECT_ROOT"
    
    # Install flowsint-core dependencies
    log_info "تثبيت مكتبات Core | Installing Core dependencies..."
    cd "$PROJECT_ROOT/flowsint-core"
    uv sync --all-extras
    cd "$PROJECT_ROOT"
    
    # Install flowsint-types dependencies
    log_info "تثبيت مكتبات Types | Installing Types dependencies..."
    cd "$PROJECT_ROOT/flowsint-types"
    uv sync --all-extras
    cd "$PROJECT_ROOT"
    
    # Install flowsint-enrichers dependencies
    log_info "تثبيت مكتبات Enrichers | Installing Enrichers dependencies..."
    cd "$PROJECT_ROOT/flowsint-enrichers"
    uv sync --all-extras
    cd "$PROJECT_ROOT"
    
    log_success "تم تثبيت مكتبات Python | Python dependencies installed"
}

# Install Docker images
install_docker_images() {
    log_info "جاري سحب صور Docker | Pulling Docker images..."
    
    docker pull postgres:15-alpine
    docker pull neo4j:latest
    docker pull redis:7-alpine
    docker pull node:20-alpine
    docker pull python:3.12-slim
    
    log_success "تم سحب صور Docker | Docker images pulled"
}

# Run migrations
run_migrations() {
    log_info "جاري تشغيل الترقيات | Running migrations..."
    
    cd "$PROJECT_ROOT/flowsint-api"
    
    log_info "تطبيق ترقيات Alembic | Applying Alembic migrations..."
    # This requires database to be running
    # alembic upgrade head
    log_warning "تخطي ترقيات Alembic (يتطلب أن تكون قاعدة البيانات قيد التشغيل) | Skipping Alembic migrations (requires database running)"
    
    cd "$PROJECT_ROOT"
    log_success "تم تشغيل الترقيات | Migrations completed"
}

# Verify installation
verify_installation() {
    log_info "جاري التحقق من التثبيت | Verifying installation..."
    
    local all_ok=true
    
    # Check Node.js
    if command -v node &> /dev/null; then
        log_success "Node.js $(node -v)"
    else
        log_error "Node.js not found"
        all_ok=false
    fi
    
    # Check Python
    if command -v python3 &> /dev/null; then
        log_success "Python $(python3 --version)"
    else
        log_error "Python3 not found"
        all_ok=false
    fi
    
    # Check Docker
    if command -v docker &> /dev/null; then
        log_success "Docker $(docker --version)"
    else
        log_error "Docker not found"
        all_ok=false
    fi
    
    # Check Docker Compose
    if command -v docker-compose &> /dev/null; then
        log_success "Docker Compose $(docker-compose --version)"
    else
        log_error "Docker Compose not found"
        all_ok=false
    fi
    
    # Check Yarn
    if command -v yarn &> /dev/null; then
        log_success "Yarn $(yarn --version)"
    else
        log_warning "Yarn not found (npm will be used)"
    fi
    
    # Check uv
    if command -v uv &> /dev/null; then
        log_success "uv $(uv --version)"
    else
        log_error "uv not found"
        all_ok=false
    fi
    
    if [ "$all_ok" = true ]; then
        log_success "جميع الأدوات مثبتة بنجاح | All tools installed successfully"
        return 0
    else
        log_error "بعض الأدوات مفقودة | Some tools are missing"
        return 1
    fi
}

# Main execution
main() {
    show_banner
    
    case $INSTALL_TYPE in
        full)
            log_info "تثبيت كامل | Full installation"
            install_system_deps
            install_node_deps
            install_python_deps
            install_docker_images
            verify_installation
            ;;
        backend)
            log_info "تثبيت الواجهة الخلفية فقط | Backend installation only"
            install_python_deps
            ;;
        frontend)
            log_info "تثبيت الواجهة الأمامية فقط | Frontend installation only"
            install_node_deps
            ;;
        docker)
            log_info "سحب صور Docker فقط | Docker images only"
            install_docker_images
            ;;
        *)
            log_error "نوع تثبيت غير معروف | Unknown install type: $INSTALL_TYPE"
            echo "الاستخدام | Usage: $0 {full|backend|frontend|docker}"
            exit 1
            ;;
    esac
    
    echo ""
    log_success "تم إكمال التثبيت | Installation completed!"
    echo ""
}

main "$@"
