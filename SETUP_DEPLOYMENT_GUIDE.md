# FLOWSINT - دليل التجهيز والتثبيت والنشر والتشغيل
# FLOWSINT - Setup, Installation, Deployment & Execution Guide

## 🎯 نظرة عامة | Overview

هذا المشروع يوفر مجموعة شاملة من السكريبتات لتجهيز وتثبيت ونشر وتشغيل تطبيق FLOWSINT.

This project provides comprehensive scripts for setup, installation, deployment, and execution of FLOWSINT.

---

## 📋 الملفات المتوفرة | Available Files

### 1. **setup.sh** - ملف التجهيز | Setup Script
**الغرض**: إعداد بيئة التطوير والإنتاج
**Purpose**: Prepare development and production environments

**ما يفسره**:
- ✅ التحقق من المتطلبات الأساسية (Docker, Node, Python, Git)
- ✅ إنشاء ملفات البيئة (.env.development, .env.production)
- ✅ إنشاء المجلدات المطلوبة
- ✅ توليد شهادات SSL مضمنة
- ✅ إعداد الواجهة الخلفية والأمامية

**What it does**:
- ✓ Verify prerequisites (Docker, Node, Python, Git)
- ✓ Create environment files (.env.development, .env.production)
- ✓ Create required directories
- ✓ Generate self-signed SSL certificates
- ✓ Setup backend and frontend

**الاستخدام | Usage**:
```bash
# للتطوير | For development
./setup.sh development

# للإنتاج | For production
./setup.sh production
```

---

### 2. **install.sh** - ملف التثبيت | Install Script
**الغرض**: تثبيت جميع المكتبات والمتطلبات
**Purpose**: Install all dependencies and requirements

**ما يفسره**:
- ✅ تثبيت متطلبات النظام (Ubuntu/Debian/macOS)
- ✅ تثبيت مكتبات Node.js
- ✅ تثبيت مكتبات Python (عبر uv)
- ✅ سحب صور Docker
- ✅ تطبيق ترقيات قاعدة البيانات

**What it does**:
- ✓ Install system requirements (Ubuntu/Debian/macOS)
- ✓ Install Node.js libraries
- ✓ Install Python libraries (via uv)
- ✓ Pull Docker images
- ✓ Apply database migrations

**الاستخدام | Usage**:
```bash
# تثبيت كامل | Full installation
./install.sh full

# تثبيت الواجهة الخلفية فقط | Backend only
./install.sh backend

# تثبيت الواجهة الأمامية فقط | Frontend only
./install.sh frontend

# سحب صور Docker فقط | Docker images only
./install.sh docker
```

---

### 3. **deploy.sh** - ملف النشر | Deploy Script
**الغرض**: نشر التطبيق في الإنتاج
**Purpose**: Deploy application to production

**ما يفسره**:
- ✅ فحوصات ما قبل النشر
- ✅ بناء الواجهة الخلفية والأمامية
- ✅ النشر عبر Docker Compose أو Kubernetes
- ✅ تطبيق ترقيات قاعدة البيانات
- ✅ فحوصات صحة التطبيق
- ✅ استرجاع النشر السابق عند الحاجة
- ✅ توليد تقرير النشر

**What it does**:
- ✓ Pre-deployment checks
- ✓ Build backend and frontend
- ✓ Deploy via Docker Compose or Kubernetes
- ✓ Apply database migrations
- ✓ Health checks
- ✓ Rollback if needed
- ✓ Generate deployment report

**الاستخدام | Usage**:
```bash
# النشر عبر Docker Compose | Deploy via Docker Compose
./deploy.sh docker production

# النشر على Kubernetes | Deploy to Kubernetes
./deploy.sh kubernetes production

# البناء فقط بدون النشر | Build only without deployment
./deploy.sh build-only production
```

---

### 4. **start.sh** - ملف التشغيل | Start Script
**الغرض**: بدء التطبيق في بيئة التطوير أو الإنتاج
**Purpose**: Start application in development or production

**ما يفسره**:
- ✅ التحقق من ملفات البيئة
- ✅ بدء جميع الخدمات
- ✅ بدء خدمات معينة فقط
- ✅ عرض حالة الخدمات
- ✅ إيقاف الخدمات

**What it does**:
- ✓ Verify environment files
- ✓ Start all services
- ✓ Start specific services only
- ✓ Display service status
- ✓ Stop services

**الاستخدام | Usage**:
```bash
# بدء بيئة التطوير كاملة | Start full development environment
./start.sh development all

# بدء الواجهة الخلفية فقط | Start backend only
./start.sh development backend

# بدء الواجهة الأمامية فقط | Start frontend only
./start.sh development frontend

# بدء الخدمات الأساسية فقط | Start infrastructure only
./start.sh development infrastructure

# بدء بيئة الإنتاج | Start production environment
./start.sh production all

# عرض حالة الخدمات | Show service status
./start.sh status

# إيقاف جميع الخدمات | Stop all services
./start.sh stop

# عرض المساعدة | Show help
./start.sh help
```

---

## 🚀 سير العمل الكامل | Complete Workflow

### الخطوة 1: التجهيز | Step 1: Setup
```bash
chmod +x setup.sh install.sh deploy.sh start.sh
./setup.sh development
```

### الخطوة 2: التثبيت | Step 2: Installation
```bash
./install.sh full
```

### الخطوة 3: التشغيل | Step 3: Execution
```bash
./start.sh development all
```

### الخطوة 4: النشر (الإنتاج) | Step 4: Deployment (Production)
```bash
./setup.sh production
./install.sh full
./deploy.sh docker production
```

---

## 📝 متغيرات البيئة المهمة | Important Environment Variables

### متطلبة للتطوير | Required for Development
```env
JWT_SECRET_KEY=your-secret-key-here
AUTH_SECRET=your-auth-secret-here
MASTER_VAULT_KEY=your-master-vault-key-here
DATABASE_URL=postgresql://user:password@localhost:5433/dbname
NEO4J_URI=bolt://localhost:7687
REDIS_URI=redis://localhost:6379/0
```

### متطلبة للإنتاج | Required for Production
```env
# يجب تغيير جميع القيم | All values must be changed
JWT_SECRET_KEY=your-production-secret-key-min-32-chars
AUTH_SECRET=your-production-auth-secret
MASTER_VAULT_KEY=your-production-vault-key
DATABASE_URL=postgresql://prod_user:strong_password@postgres:5432/flowsint
NEO4J_PASSWORD=strong_neo4j_password
MASTER_VAULT_KEY=strong-vault-key-min-32-chars
```

---

## 🔗 الخدمات والمنافذ | Services & Ports

| الخدمة | Service | المنفذ | Port | الرابط | URL |
|--------|---------|-------|------|--------|-----|
| الواجهة الخلفية | API | 5001 | 5001 | http://localhost:5001 |
| توثيق API | API Docs | 5001 | 5001 | http://localhost:5001/docs |
| الواجهة الأمامية | Frontend | 5173 | 5173 | http://localhost:5173 |
| PostgreSQL | Database | 5433 | 5433 | - |
| Neo4j | Graph DB | 7687 | 7687 | http://localhost:7474 |
| Redis | Cache | 6379 | 6379 | - |

---

## ✅ قائمة التحقق قبل النشر | Pre-Deployment Checklist

- [ ] تم تحديث جميع متغيرات البيئة | All environment variables updated
- [ ] قم بتوليد مفاتيح سرية جديدة | New secret keys generated
- [ ] تم اختبار الواجهة الخلفية | Backend tested
- [ ] تم اختبار الواجهة الأمامية | Frontend tested
- [ ] تم اختبار قاعدة البيانات | Database tested
- [ ] تم إعداد HTTPS/SSL | HTTPS/SSL configured
- [ ] تم إعداد نسخ احتياطية | Backups configured
- [ ] تم اختبار استرجاع البيانات | Restore tested
- [ ] تم إعداد المراقبة والتنبيهات | Monitoring & alerts setup
- [ ] تم توثيق الإجراءات الطارئة | Emergency procedures documented

---

## 🐛 استكشاف الأخطاء | Troubleshooting

### خطأ: Docker not running | Docker غير قيد التشغيل
```bash
# بدء Docker | Start Docker
sudo systemctl start docker

# أو للتحقق من الحالة | Or check status
docker --version
```

### خطأ: Port already in use | المنفذ مستخدم بالفعل
```bash
# البحث عن العملية | Find process using port
lsof -i :5001

# إيقاف الخدمة | Stop the service
./start.sh stop
```

### خطأ: Database connection failed | فشل الاتصال بقاعدة البيانات
```bash
# تحقق من متغيرات البيئة | Check environment variables
source .env.development
echo $DATABASE_URL

# تحقق من حالة PostgreSQL | Check PostgreSQL status
docker-compose ps postgres
```

### خطأ: Memory issues | مشاكل الذاكرة
```bash
# زيادة موارد Docker | Increase Docker resources
# (من خلال Docker Desktop أو Docker daemon settings)
```

---

## 📊 المراقبة والصيانة | Monitoring & Maintenance

### عرض السجلات | View Logs
```bash
# سجلات جميع الخدمات | All services logs
docker-compose logs -f

# سجلات خدمة معينة | Specific service logs
docker-compose logs -f api

# سجلات محدودة | Limited logs
docker-compose logs --tail=100 api
```

### التدرج النسبي للخدمات | Services Health Check
```bash
./start.sh status
```

### عمل نسخة احتياطية | Create Backup
```bash
# PostgreSQL backup
docker-compose exec postgres pg_dump -U flowsint_dev flowsint_dev > backup.sql

# All data backup
docker-compose exec postgres pg_dump -U flowsint_dev flowsint_dev | gzip > backup-$(date +%Y%m%d).sql.gz
```

### استرجاع النسخة الاحتياطية | Restore Backup
```bash
docker-compose exec -T postgres psql -U flowsint_dev flowsint_dev < backup.sql
```

---

## 🔐 التأمين | Security

### تغيير كلمات المرور | Change Passwords
```bash
# في ملف .env.production
# in .env.production
POSTGRES_PASSWORD=<new_strong_password>
NEO4J_PASSWORD=<new_strong_password>
```

### توليد مفاتيح سرية جديدة | Generate New Secret Keys
```bash
# توليد secret key عشوائي | Generate random secret key
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### تفعيل HTTPS | Enable HTTPS
```bash
# استخدام Let's Encrypt | Use Let's Encrypt certificates
# See documentation for nginx SSL configuration
```

---

## 📚 الموارد الإضافية | Additional Resources

- [Docker Documentation](https://docs.docker.com)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [React Documentation](https://react.dev)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)
- [Neo4j Documentation](https://neo4j.com/docs)

---

## 🆘 الدعم | Support

للإبلاغ عن مشاكل أو اقتراح تحسينات:
For reporting issues or suggesting improvements:

- 📝 الملف: [ISSUE_TEMPLATE.md]
- 📧 البريد الإلكتروني: support@flowsint.io
- 💬 المنتدى: [discussions]

---

## 📄 الترخيص | License

هذا المشروع مرخص تحت [LICENSE](LICENSE)

This project is licensed under [LICENSE](LICENSE)

---

**تم آخر تحديث | Last Updated**: 2024
**الإصدار | Version**: 1.0.0
