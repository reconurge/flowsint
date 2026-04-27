#!/bin/bash

################################################################################
# FLOWSINT - QUICK COMMAND REFERENCE
# الأوامر السريعة والمراجع | Quick Commands & References
################################################################################

cat << 'EOF'

████████████████████████████████████████████████████████████████████████████████
                           🚀 FLOWSINT QUICK REFERENCE
                        الأوامر السريعة والمراجع
████████████████████████████████████████████████████████████████████████████████

═══════════════════════════════════════════════════════════════════════════════
📋 SECTION 1: INITIAL SETUP | الإعداد الأولي
═══════════════════════════════════════════════════════════════════════════════

للمرة الأولى | First Time Setup:
─────────────────────────────────────────────────────────────────────────────

1️⃣  Make scripts executable:
    chmod +x setup.sh install.sh deploy.sh start.sh

2️⃣  Run setup for your environment:
    ./setup.sh development              # للتطوير | for development
    ./setup.sh production               # للإنتاج | for production

3️⃣  Install dependencies:
    ./install.sh full                   # تثبيت كامل | full installation
    ./install.sh backend                # الواجهة الخلفية فقط | backend only
    ./install.sh frontend               # الواجهة الأمامية فقط | frontend only

═══════════════════════════════════════════════════════════════════════════════
🎯 SECTION 2: DEVELOPMENT | التطوير
═══════════════════════════════════════════════════════════════════════════════

بدء بيئة التطوير | Start Development:
─────────────────────────────────────────────────────────────────────────────

# بدء جميع الخدمات | Start all services
./start.sh development all

# بدء الواجهة الخلفية فقط | Start backend only
./start.sh development backend

# بدء الواجهة الأمامية فقط | Start frontend only
./start.sh development frontend

# بدء الخدمات الأساسية فقط | Start infrastructure only (DB, Cache, etc)
./start.sh development infrastructure

الخدمات والمنافذ | Services & Ports:
─────────────────────────────────────────────────────────────────────────────

API Backend        → http://localhost:5001
API Documentation  → http://localhost:5001/docs      (Swagger)
Frontend App       → http://localhost:5173
PostgreSQL         → localhost:5433
Neo4j Browser      → http://localhost:7474
Redis              → localhost:6379

═══════════════════════════════════════════════════════════════════════════════
🐳 SECTION 3: DOCKER & CONTAINERS | Docker والحاويات
═══════════════════════════════════════════════════════════════════════════════

عرض حالة الخدمات | View Service Status:
─────────────────────────────────────────────────────────────────────────────

docker-compose ps                       # قائمة الحاويات | list containers
./start.sh status                       # حالة التطبيق | app status check

عرض السجلات | View Logs:
─────────────────────────────────────────────────────────────────────────────

docker-compose logs -f                  # جميع السجلات | all logs
docker-compose logs -f api              # سجلات API
docker-compose logs -f postgres         # سجلات قاعدة البيانات
docker-compose logs --tail=100 api      # آخر 100 سطر | last 100 lines

إيقاف التطبيق | Stop Application:
─────────────────────────────────────────────────────────────────────────────

./start.sh stop                         # إيقاف جميع الخدمات | stop all
docker-compose down                     # إلغاء الحاويات | remove containers
docker-compose down -v                  # مع حذف البيانات | with volumes

═══════════════════════════════════════════════════════════════════════════════
💾 SECTION 4: DATABASE | قاعدة البيانات
═══════════════════════════════════════════════════════════════════════════════

تطبيق الترقيات | Run Migrations:
─────────────────────────────────────────────────────────────────────────────

cd flowsint-api
alembic upgrade head                    # تطبيق جميع الترقيات | apply all
alembic current                         # الإصدار الحالي | current version
alembic revision --autogenerate         # إنشاء ترقية جديدة | new migration

النسخ الاحتياطية | Database Backup:
─────────────────────────────────────────────────────────────────────────────

# عمل نسخة احتياطية | Create backup
docker-compose exec postgres pg_dump -U flowsint_dev flowsint_dev | \
    gzip > backup-$(date +%Y%m%d_%H%M%S).sql.gz

# استرجاع من نسخة احتياطية | Restore backup
gunzip -c backup.sql.gz | docker-compose exec -T postgres \
    psql -U flowsint_dev flowsint_dev

# الاتصال بقاعدة البيانات | Connect to database
docker-compose exec postgres psql -U flowsint_dev flowsint_dev

═══════════════════════════════════════════════════════════════════════════════
🧪 SECTION 5: TESTING | الاختبارات
═══════════════════════════════════════════════════════════════════════════════

تشغيل الاختبارات | Run Tests:
─────────────────────────────────────────────────────────────────────────────

# جميع الاختبارات | all tests
cd flowsint-core && pytest -v

# اختبار معين | specific test
cd flowsint-core && pytest tests/test_chat.py -v

# مع تغطية الكود | with coverage
cd flowsint-core && pytest --cov=app tests/

═══════════════════════════════════════════════════════════════════════════════
🚀 SECTION 6: PRODUCTION | الإنتاج
═══════════════════════════════════════════════════════════════════════════════

إعداد الإنتاج | Production Setup:
─────────────────────────────────────────────────────────────────────────────

1️⃣  إعداد البيئة | Setup environment
    ./setup.sh production

2️⃣  تحرير ملف البيئة | Edit production environment file
    nano .env.production
    
    ⚠️  تغيير المتطلبات الآتية:
    - JWT_SECRET_KEY (استخدم عشوائي آمن | use secure random)
    - AUTH_SECRET
    - MASTER_VAULT_KEY
    - Database passwords
    - Neo4j password

3️⃣  البناء والنشر | Build and deploy
    ./deploy.sh docker production

بناء الصور | Build Images:
─────────────────────────────────────────────────────────────────────────────

# بناء جميع الصور | Build all
./deploy.sh build-only production

# بناء API فقط | Build API only
cd flowsint-api && docker build -t flowsint-api:latest .

# بناء Frontend فقط | Build Frontend only
cd flowsint-app && docker build -t flowsint-app:latest .

النشر | Deployment:
─────────────────────────────────────────────────────────────────────────────

# النشر على Docker Compose | Deploy with Docker Compose
./deploy.sh docker production

# النشر على Kubernetes | Deploy to Kubernetes
./deploy.sh kubernetes production

# البناء فقط | Build only
./deploy.sh build-only production

═══════════════════════════════════════════════════════════════════════════════
⚙️ SECTION 7: ENVIRONMENT VARIABLES | متغيرات البيئة
═══════════════════════════════════════════════════════════════════════════════

توليد مفاتيح أمان جديدة | Generate Secure Keys:
─────────────────────────────────────────────────────────────────────────────

# توليد secret key | Generate secret key (32+ characters)
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# توليد UUID | Generate UUID
python3 -c "import uuid; print(uuid.uuid4())"

تحديث البيئة | Update Environment:
─────────────────────────────────────────────────────────────────────────────

# عرض المتغيرات الحالية | Show current variables
source .env.development && env | grep -E "^(JWT|MASTER|DATABASE|NEO4J|REDIS)"

# تعديل ملف البيئة | Edit environment file
nano .env.development              # للتطوير
nano .env.production               # للإنتاج

═══════════════════════════════════════════════════════════════════════════════
🔧 SECTION 8: TROUBLESHOOTING | استكشاف الأخطاء
═══════════════════════════════════════════════════════════════════════════════

خطأ: Port already in use | المنفذ قيد الاستخدام:
─────────────────────────────────────────────────────────────────────────────

# البحث عن العملية | Find process
lsof -i :5001
lsof -i :5173

# إيقافها | Kill process
kill -9 <PID>

# أو إيقاف جميع الخدمات | Or stop all services
./start.sh stop

خطأ: Docker not running | Docker غير قيد التشغيل:
─────────────────────────────────────────────────────────────────────────────

# تشغيل Docker | Start Docker
sudo systemctl start docker

# أو (macOS)
open -a Docker

خطأ: Connection refused | الاتصال مرفوض:
─────────────────────────────────────────────────────────────────────────────

# تحقق من الخدمات | Check services
./start.sh status

# تفقد السجلات | Check logs
docker-compose logs api

# أعد التشغيل | Restart
./start.sh restart

خطأ: Database not ready | قاعدة البيانات غير جاهزة:
─────────────────────────────────────────────────────────────────────────────

# انتظر قليلاً وأعد المحاولة | Wait and retry
sleep 10
./start.sh restart

# أو تحقق من السجلات | Check logs
docker-compose logs postgres

═══════════════════════════════════════════════════════════════════════════════
📊 SECTION 9: MONITORING & HEALTH CHECKS | المراقبة والفحوصات
═══════════════════════════════════════════════════════════════════════════════

فحص صحة التطبيق | Health Checks:
─────────────────────────────────────────────────────────────────────────────

# فحص API | Check API
curl http://localhost:5001/api/health

# فحص قاعدة البيانات | Check database
curl http://localhost:5001/api/health/db

# فحص Redis | Check Redis
redis-cli -p 6379 ping

# فحص Neo4j | Check Neo4j
curl http://localhost:7474/db/data

الأداء | Performance:
─────────────────────────────────────────────────────────────────────────────

# حجم الحاويات | Container sizes
docker ps -s

# استخدام الموارد | Resource usage
docker stats

# متطلبات النظام | System requirements
free -h                            # الذاكرة | Memory
df -h                              # المساحة | Disk
top -b -n 1                        # CPU usage

═══════════════════════════════════════════════════════════════════════════════
🛠️ SECTION 10: MAINTENANCE | الصيانة
═══════════════════════════════════════════════════════════════════════════════

تنظيف الموارد | Clean Resources:
─────────────────────────────────────────────────────────────────────────────

# تنظيف الملفات المؤقتة | Clean temporary files
find . -type d -name __pycache__ -exec rm -rf {} +
find . -type d -name .pytest_cache -exec rm -rf {} +

# تنظيف Docker | Clean Docker
docker system prune -f --volumes

# تنظيف الحاويات غير المستخدمة | Remove unused containers
docker container prune -f

تحديث المكتبات | Update Dependencies:
─────────────────────────────────────────────────────────────────────────────

# تحديث Node dependencies | Update Node packages
cd flowsint-app && yarn upgrade

# تحديث Python dependencies | Update Python packages
cd flowsint-api && uv sync --upgrade

═══════════════════════════════════════════════════════════════════════════════
📚 SECTION 11: USEFUL LINKS & RESOURCES | الروابط المفيدة
═══════════════════════════════════════════════════════════════════════════════

الوثائق الرسمية | Official Documentation:
─────────────────────────────────────────────────────────────────────────────

• FastAPI:          https://fastapi.tiangolo.com
• React:            https://react.dev
• Docker:           https://docs.docker.com
• PostgreSQL:       https://www.postgresql.org/docs
• Neo4j:            https://neo4j.com/docs
• Kubernetes:       https://kubernetes.io/docs

أدوات مساعدة | Development Tools:
─────────────────────────────────────────────────────────────────────────────

• API Testing:      Postman, Insomnia, Thunder Client
• Database:         DBeaver, pgAdmin, Neo4j Desktop
• Monitoring:       Prometheus, Grafana, ELK Stack
• Logging:          Docker logs, tail, grep

═══════════════════════════════════════════════════════════════════════════════
⚡ SECTION 12: QUICK EXAMPLES | أمثلة سريعة
═══════════════════════════════════════════════════════════════════════════════

مثال 1: بدء سريع للتطوير | Quick Dev Start:
─────────────────────────────────────────────────────────────────────────────

chmod +x setup.sh install.sh start.sh
./setup.sh development
./install.sh full
./start.sh development all

# ثم الذهاب إلى | Then go to:
# http://localhost:5173 (Frontend)
# http://localhost:5001/docs (API)

مثال 2: اختبار في بيئة منعزلة | Isolated Testing:
─────────────────────────────────────────────────────────────────────────────

./start.sh development infrastructure
cd flowsint-core
pytest -v

مثال 3: نشر للإنتاج | Production Deployment:
─────────────────────────────────────────────────────────────────────────────

./setup.sh production
nano .env.production              # تحرير البيئة | Edit environment
./install.sh full
./deploy.sh docker production

مثال 4: استرجاع البيانات | Data Restore:
─────────────────────────────────────────────────────────────────────────────

gunzip -c backup-20240101_120000.sql.gz | \
docker-compose exec -T postgres psql -U flowsint_dev flowsint_dev

═══════════════════════════════════════════════════════════════════════════════

💡 TIP: للحصول على مساعدة إضافية، استخدم:
    ./setup.sh help
    ./install.sh help
    ./deploy.sh help
    ./start.sh help

⚡ TIP: لتسهيل الأوامر، استخدم alias في shell:
    alias flowsint-setup="./setup.sh"
    alias flowsint-start="./start.sh development all"
    alias flowsint-stop="./start.sh stop"

════════════════════════════════════════════════════════════════════════════════
                        Created: 2024
                        Updated: $(date +%Y-%m-%d)
                        Version: 1.0.0
════════════════════════════════════════════════════════════════════════════════

EOF
