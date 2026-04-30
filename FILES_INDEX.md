# 📦 FLOWSINT - ملفات التجهيز والتثبيت والنشر والتشغيل
# 📦 FLOWSINT - Setup, Installation, Deployment & Execution Files

## 📋 الملفات المنشأة | Created Files

تم إنشاء الملفات التالية لتسهيل عملية التطوير والإنتاج:

### 1. **setup.sh** (9.6 KB) ✅
**الغرض | Purpose**: إعداد بيئة التطوير والإنتاج
**Type**: Bash Script (Executable)

**الوظائف الرئيسية | Key Features**:
- ✅ التحقق من المتطلبات الأساسية (Docker, Python, Node, Git)
- ✅ إنشاء ملفات البيئة (.env.development, .env.production)
- ✅ إنشاء المجلدات المطلوبة (logs, data, backups, ssl)
- ✅ توليد شهادات SSL المضمنة
- ✅ إعداد الواجهة الخلفية والأمامية

**الاستخدام | Usage**:
```bash
chmod +x setup.sh
./setup.sh development              # إعداد للتطوير
./setup.sh production               # إعداد للإنتاج
```

**المخرجات | Output**:
- `.env.development` - ملف البيئة للتطوير
- `.env.production` - ملف البيئة للإنتاج
- `logs/`, `data/`, `backups/`, `storage/` - مجلدات
- `.ssl/cert.pem`, `.ssl/key.pem` - شهادات SSL

---

### 2. **install.sh** (8.2 KB) ✅
**الغرض | Purpose**: تثبيت جميع المكتبات والمتطلبات
**Type**: Bash Script (Executable)

**الوظائف الرئيسية | Key Features**:
- ✅ تثبيت متطلبات النظام (Ubuntu/Debian/macOS)
- ✅ تثبيت مكتبات Node.js (yarn)
- ✅ تثبيت مكتبات Python (عبر uv)
- ✅ سحب صور Docker
- ✅ التحقق من الثبيت

**الاستخدام | Usage**:
```bash
chmod +x install.sh

./install.sh full                   # تثبيت كامل
./install.sh backend                # تثبيت الواجهة الخلفية فقط
./install.sh frontend               # تثبيت الواجهة الأمامية فقط
./install.sh docker                 # سحب صور Docker فقط
```

---

### 3. **deploy.sh** (12 KB) ✅
**الغرض | Purpose**: نشر التطبيق في الإنتاج
**Type**: Bash Script (Executable)

**الوظائف الرئيسية | Key Features**:
- ✅ فحوصات ما قبل النشر
- ✅ بناء الواجهة الخلفية والأمامية
- ✅ النشر عبر Docker Compose
- ✅ النشر على Kubernetes
- ✅ تطبيق ترقيات قاعدة البيانات
- ✅ فحوصات صحة التطبيق
- ✅ استرجاع النشر السابق عند الحاجة
- ✅ توليد تقرير النشر

**الاستخدام | Usage**:
```bash
chmod +x deploy.sh

./deploy.sh docker production       # نشر عبر Docker Compose
./deploy.sh kubernetes production   # نشر على Kubernetes
./deploy.sh build-only production   # بناء فقط
```

**المخرجات | Output**:
- `deployment-report-YYYYMMDD_HHMMSS.md` - تقرير النشر

---

### 4. **start.sh** (8.5 KB) ✅
**الغرض | Purpose**: بدء التطبيق في بيئة التطوير أو الإنتاج
**Type**: Bash Script (Executable)

**الوظائف الرئيسية | Key Features**:
- ✅ بدء بيئة التطوير الكاملة
- ✅ بدء الواجهة الخلفية فقط
- ✅ بدء الواجهة الأمامية فقط
- ✅ بدء الخدمات الأساسية فقط
- ✅ بدء بيئة الإنتاج
- ✅ عرض حالة الخدمات
- ✅ إيقاف الخدمات

**الاستخدام | Usage**:
```bash
chmod +x start.sh

# التطوير
./start.sh development all           # جميع الخدمات
./start.sh development backend       # الواجهة الخلفية فقط
./start.sh development frontend      # الواجهة الأمامية فقط
./start.sh development infrastructure # الخدمات الأساسية

# الإنتاج
./start.sh production all            # جميع الخدمات

# الأوامر الأخرى
./start.sh status                    # عرض الحالة
./start.sh stop                      # إيقاف جميع الخدمات
./start.sh help                      # المساعدة
```

---

### 5. **COMMANDS.makefile** (9.1 KB) ✅
**الغرض | Purpose**: توفير أوامر Make سهلة الاستخدام
**Type**: Makefile

**الأوامر المتاحة | Available Commands**:

#### الإعداد والتثبيت | Setup & Installation
```bash
make setup                  # تشغيل سكريبت الإعداد
make install                # تثبيت كامل
make install-backend        # تثبيت الواجهة الخلفية
make install-frontend       # تثبيت الواجهة الأمامية
```

#### التطوير | Development
```bash
make dev                    # بدء بيئة التطوير الكاملة
make dev-backend            # بدء الواجهة الخلفية
make dev-frontend           # بدء الواجهة الأمامية
make dev-infra              # بدء الخدمات الأساسية
```

#### الإنتاج | Production
```bash
make prod                   # بدء بيئة الإنتاج
make deploy                 # النشر عبر Docker Compose
make deploy-k8s             # النشر على Kubernetes
```

#### قاعدة البيانات | Database
```bash
make db-migrate             # تطبيق ترقيات قاعدة البيانات
make db-backup              # عمل نسخة احتياطية
make db-restore             # استرجاع النسخة الاحتياطية
make db-shell               # فتح قوقعة قاعدة البيانات
```

#### السجلات والمراقبة | Logs & Monitoring
```bash
make logs                   # عرض جميع السجلات
make logs-api               # سجلات API
make logs-db                # سجلات قاعدة البيانات
make status                 # حالة الخدمات
make health                 # فحص صحة التطبيق
```

#### الاختبارات | Testing
```bash
make test                   # تشغيل جميع الاختبارات
make test-core              # اختبارات Core
make test-types             # اختبارات Types
make test-enrichers         # اختبارات Enrichers
make lint                   # تشغيل التدقيق
```

#### الصيانة | Maintenance
```bash
make clean                  # تنظيف الملفات المؤقتة
make docker-clean           # تنظيف موارد Docker
make update                 # تحديث المكتبات
```

#### معلومات | Information
```bash
make info                   # عرض معلومات النظام
make help                   # عرض جميع الأوامر
```

#### الإعدادات السريعة | Quick Start
```bash
make quick-start            # إعداد سريع للتطوير
make quick-prod             # إعداد سريع للإنتاج
```

---

### 6. **SETUP_DEPLOYMENT_GUIDE.md** (11 KB) ✅
**الغرض | Purpose**: دليل شامل للتجهيز والتثبيت والنشر والتشغيل
**Type**: Markdown Documentation

**المحتويات | Contents**:
- 📋 نظرة عامة على الملفات
- 🚀 سير العمل الكامل
- 📝تغيرات البيئة المهمة
- 🔗 الخدمات والمنافذ
- ✅ قائمة التحقق قبل النشر
- 🐛 استكشاف الأخطاء
- 📊 المراقبة والصيانة
- 🔐 التأمين
- 📚 الموارد الإضافية

---

### 7. **QUICK_REFERENCE.sh** (24 KB) ✅
**الغرض | Purpose**: مرجع سريع يحتوي على جميع الأوامر
**Type**: Bash Script Documentation

**المحتويات | Contents**:
- الإعداد الأولي | Initial Setup (3 خطوات)
- التطوير | Development (خدمات ومنافذ)
- Docker والحاويات | Docker & Containers
- قاعدة البيانات | Database (ترقيات، نسخ احتياطية)
- الاختبارات | Testing
- الإنتاج | Production (إعداد، بناء، نشر)
- متغيرات البيئة | Environment Variables
- استكشاف الأخطاء | Troubleshooting
- المراقبة والفحوصات | Monitoring & Health
- الصيانة | Maintenance
- الروابط المفيدة | Useful Links
- أمثلة سريعة | Quick Examples

**الاستخدام | Usage**:
```bash
chmod +x QUICK_REFERENCE.sh
./QUICK_REFERENCE.sh        # عرض جميع المراجع
```

---

## 🚀 البدء السريع | Quick Start

### للتطوير | For Development
```bash
# 1. جعل الملفات قابلة للتنفيذ
chmod +x setup.sh install.sh start.sh deploy.sh

# 2. إعداد البيئة
./setup.sh development

# 3. تثبيت المكتبات
./install.sh full

# 4. بدء التطبيق
./start.sh development all
```

### للإنتاج | For Production
```bash
# 1. جعل الملفات قابلة للتنفيذ
chmod +x setup.sh install.sh deploy.sh

# 2. إعداد البيئة
./setup.sh production

# 3. تحرير ملف البيئة
nano .env.production

# 4. تثبيت المكتبات
./install.sh full

# 5. النشر
./deploy.sh docker production
```

---

## ⌚ استخدام Make Commands

إذا كنت تفضل استخدام `make`:

```bash
# بدء سريع
make quick-start            # إعداد سريع للتطوير
make quick-prod             # إعداد سريع للإنتاج

# التطوير
make dev                    # بدء بيئة التطوير
make db-migrate             # تطبيق الترقيات
make logs                   # عرض السجلات

# الاختبارات
make test                   # تشغيل جميع الاختبارات
make test-core              # اختبارات معينة

# النشر
make deploy                 # نشر للإنتاج
```

---

## 📝 ملفات البيئة | Environment Files

بعد تشغيل `setup.sh`، سيتم إنشاء ملفات البيئة:

### .env.development
يحتوي على متغيرات التطوير الافتراضية (قد تحتاج لتعديل بعضها)

### .env.production
يحتوي على قوالب متغيرات الإنتاج (يجب تغيير جميع القيم قبل النشر)

---

## 🔒 متغيرات أمان مهمة | Important Security Variables

**قبل النشر في الإنتاج، تأكد من تغيير**:

```env
JWT_SECRET_KEY=           # توليد مفتاح جديد (32+ حرف)
AUTH_SECRET=              # توليد سر جديد
MASTER_VAULT_KEY=         # توليد مفتاح جديد (32 حرف)
POSTGRES_PASSWORD=        # كلمة مرور قوية
NEO4J_PASSWORD=           # كلمة مرور قوية
```

**توليد مفاتيح آمنة**:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## 🐳 الخدمات والمنافذ | Services & Ports

| الخدمة | Service | المنفذ | URL/Port |
|--------|---------|-------|----------|
| الواجهة الخلفية | API | 5001 | http://localhost:5001 |
| توثيق API | API Docs | 5001 | http://localhost:5001/docs |
| الواجهة الأمامية | Frontend | 5173 | http://localhost:5173 |
| PostgreSQL | Database | 5433 | localhost:5433 |
| Neo4j | Graph DB | 7687 | http://localhost:7474 |
| Redis | Cache | 6379 | localhost:6379 |

---

## ✅ قائمة التحقق | Checklist

قبل الانتقال من التطوير للإنتاج:

- [ ] جميع متغيرات البيئة مُعدّة صحيحة
- [ ] تم تشغيل جميع الاختبارات بنجاح
- [ ] تم اختبار قاعدة البيانات والترقيات
- [ ] تم إنشاء النسخ الاحتياطية
- [ ] تم اختبار استرجاع البيانات
- [ ] تم إعداد HTTPS/SSL
- [ ] تم إعداد المراقبة والتنبيهات
- [ ] تم توثيق الإجراءات الطارئة

---

## 💡 نصائح مفيدة | Helpful Tips

### استخدام الأسماء المختصرة | Use Aliases
```bash
# أضف هذا إلى ~/.bashrc أو ~/.zshrc
alias flowsint-setup="./setup.sh"
alias flowsint-start="./start.sh development all"
alias flowsint-stop="./start.sh stop"
alias flowsint-logs="docker-compose logs -f"
```

### عرض المساعدة | Get Help
```bash
./setup.sh help             # مساعدة الإعداد
./install.sh help           # مساعدة التثبيت
./deploy.sh help            # مساعدة النشر
./start.sh help             # مساعدة البدء
./QUICK_REFERENCE.sh        # المرجع السريع
make help                   # جميع أوامر Make
```

---

## 📞 الدعم والمساعدة | Support

للمزيد من المساعدة:
- 📖 اقرأ `SETUP_DEPLOYMENT_GUIDE.md`
- 📝 اعرض `QUICK_REFERENCE.sh`
- 📚 تفقد الوثائق الرسمية للمشروع

---

## 📊 معلومات الملفات | Files Summary

| الملف | الحجم | النوع | الوصف |
|------|-------|-------|--------|
| setup.sh | 9.6 KB | Bash | إعداد البيئة |
| install.sh | 8.2 KB | Bash | تثبيت المكتبات |
| deploy.sh | 12 KB | Bash | النشر في الإنتاج |
| start.sh | 8.5 KB | Bash | بدء التطبيق |
| COMMANDS.makefile | 9.1 KB | Makefile | أوامر Make |
| SETUP_DEPLOYMENT_GUIDE.md | 11 KB | Markdown | دليل شامل |
| QUICK_REFERENCE.sh | 24 KB | Bash Docs | مرجع سريع |

**الإجمالي | Total**: ~80 KB من الملفات الشاملة

---

## 🎉 تم الانتهاء | Completed

تم إنشاء مجموعة شاملة من السكريبتات والملفات لتسهيل:
- ✅ التجهيز والإعداد
- ✅ التثبيت والمكتبات
- ✅ النشر في الإنتاج
- ✅ التشغيل والصيانة
- ✅ استكشاف الأخطاء

**ابدأ الآن | Start Now**:
```bash
chmod +x *.sh
./setup.sh development
./install.sh full
./start.sh development all
```

---

**التاريخ | Date**: 2024
**الإصدار | Version**: 1.0.0
**الحالة | Status**: ✅ جاهز للاستخدام | Ready to Use
