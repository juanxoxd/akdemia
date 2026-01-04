# OMR Akdemia - Quick Start

Sistema completo de reconocimiento óptico de marcas (OMR) con frontend, backend y procesamiento de imágenes.

## 📦 Estructura del Proyecto

```
omr-akdemia/
├── front/                      # Frontend Expo/React Native
│   ├── Dockerfile
│   └── README.md
│
├── back/                       # Backend NestJS (API Gateway)
│   ├── Dockerfile.gateway
│   └── README.md
│
├── omr-processor-service/      # Servicio Python (OMR Processing)
│   ├── Dockerfile
│   └── README.md
│
└── DEPLOY.md                   # ← Guía completa de despliegue
```

## 🚀 Deploy Rápido en Dokploy

### Servicios a Crear (7 total)

#### 1-4. Infraestructura (Docker Images)

```yaml
1. PostgreSQL:    postgres:15-alpine         (Puerto: 5432)
2. Redis:         redis:7-alpine             (Puerto: 6379)
3. RabbitMQ:      rabbitmq:3-management-alpine (Puerto: 5672, 15672)
4. MinIO:         minio/minio:latest         (Puerto: 9000, 9001)
```

#### 5. OMR Processor (Git)

| Campo | Valor |
|-------|-------|
| Build Path | `omr-processor-service` |
| Dockerfile | `omr-processor-service/Dockerfile` |
| Puerto | `8000` |

#### 6. API Gateway (Git)

| Campo | Valor |
|-------|-------|
| Build Path | `back` |
| Dockerfile | `back/Dockerfile.gateway` |
| Puerto | `3000` |

#### 7. Frontend (Git)

| Campo | Valor |
|-------|-------|
| Build Path | `front` |
| Dockerfile | `front/Dockerfile` |
| Puerto | `8081` |

---

## ⚙️ Variables de Entorno

### OMR Processor
```env
MINIO_ENDPOINT=omr-minio
MINIO_SECRET_KEY=<password>
RABBITMQ_URL=amqp://guest:<password>@omr-rabbitmq:5672/
```

### API Gateway
```env
DB_HOST=omr-postgres
DB_PASSWORD=<password>
REDIS_HOST=omr-redis
OMR_PROCESSOR_URL=http://omr-processor:8000
CORS_ORIGIN=https://your-domain.com
```

### Frontend
```env
EXPO_PUBLIC_API_BASE_URL=https://api.your-domain.com/api
```

> **Ver archivos `.env.example` en cada carpeta para la lista completa**

---

## ✅ Verificación Rápida

```bash
# Health checks
curl https://api.your-domain.com/api/health  # API Gateway
curl https://omr.your-domain.com/health      # OMR Processor
curl https://app.your-domain.com/            # Frontend

# MinIO: crear bucket 'omr-images'
# Acceder a https://your-domain:9001
```

---

## 🐳 Build Local (Testing)

```bash
# OMR Processor
cd omr-processor-service
docker build -t omr-processor .

# API Gateway
cd back
docker build -f Dockerfile.gateway -t api-gateway .

# Frontend
cd front
docker build -t omr-frontend .
```

---

## 📚 Documentación Completa

- **Guía de Despliegue**: [`DEPLOY.md`](./DEPLOY.md)
- **Backend**: [`back/README.md`](./back/README.md)
- **OMR Processor**: [`omr-processor-service/README.md`](./omr-processor-service/README.md)
- **Frontend**: [`front/README.md`](./front/README.md)

---

## 🔗 Enlaces Útiles

| Servicio | URL Local | Producción |
|----------|-----------|------------|
| Frontend | http://localhost:8081 | https://app.your-domain.com |
| API Gateway | http://localhost:3000 | https://api.your-domain.com |
| API Docs | http://localhost:3000/api/docs | (Solo dev) |
| OMR Processor | http://localhost:8000 | https://omr.your-domain.com |
| OMR Docs | http://localhost:8000/docs | (Solo dev) |
| MinIO Console | http://localhost:9001 | https://minio.your-domain.com |
| RabbitMQ Admin | http://localhost:15672 | https://rabbit.your-domain.com |

---

## 🛠️ Stack Tecnológico

| Componente | Tecnología |
|------------|------------|
| Frontend | React Native + Expo |
| API Gateway | NestJS + TypeScript |
| OMR Processing | Python + FastAPI + OpenCV |
| Base de Datos | PostgreSQL 15 |
| Cache | Redis 7 |
| Queue | RabbitMQ 3 |
| Storage | MinIO (S3-compatible) |
| Containerización | Docker |
| Deploy | Dokploy |

---

## ⚡ Comandos Rápidos

```bash
# Ver logs de un servicio en Docker
docker logs -f <container-name>

# Conectar a PostgreSQL
docker exec -it <postgres-container> psql -U postgres -d omr_db

# Ver estado de todos los contenedores
docker ps

# Limpiar builds
docker system prune -af

# Rebuild forzado
docker build --no-cache -t <image-name> .
```

---

## 🐛 Problemas Comunes

| Error | Solución |
|-------|----------|
| Cannot connect to database | Verificar `DB_HOST` y `DB_PASSWORD` |
| MinIO bucket not found | Crear bucket `omr-images` en console |
| CORS error | Configurar `CORS_ORIGIN` en API Gateway |
| Build fails | Verificar `Build Path` y `Dockerfile Path` |
| Services can't communicate | Verificar que estén en la misma red |

**Ver [`DEPLOY.md`](./DEPLOY.md#troubleshooting) para troubleshooting detallado**

---

## 📊 Requisitos Mínimos

- **CPU**: 4 cores
- **RAM**: 4GB
- **Disco**: 50GB
- **Docker**: 20.10+
- **Dokploy**: Latest

---

## 🔐 Seguridad

- ✅ Cambiar todas las contraseñas por defecto
- ✅ Usar HTTPS en producción
- ✅ Configurar CORS correctamente
- ✅ No exponer puertos de infraestructura
- ✅ Backups programados

---

**Listo para empezar!** 🎉

Ver [`DEPLOY.md`](./DEPLOY.md) para instrucciones paso a paso completas.
