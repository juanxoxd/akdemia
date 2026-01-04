# 🚀 Guía de Despliegue OMR Akdemia en Dokploy

Guía completa para desplegar el sistema OMR Akdemia en Dokploy con servicios separados.

## 📋 Tabla de Contenidos

1. [Arquitectura General](#arquitectura-general)
2. [Servicios de Infraestructura](#servicios-de-infraestructura)
3. [Servicios de Aplicación](#servicios-de-aplicación)
4. [Variables de Entorno](#variables-de-entorno)
5. [Verificación](#verificación)
6. [Comandos Útiles](#comandos-útiles)
7. [Troubleshooting](#troubleshooting)

---

## 🏗️ Arquitectura General

```
┌─────────────────────────────────────────────────────────┐
│                       DOKPLOY                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Frontend (Expo Web) ──► API Gateway (NestJS)          │
│       Port: 8081            Port: 3000                  │
│                                │                        │
│                                ▼                        │
│                         OMR Processor (Python)          │
│                            Port: 8000                   │
│                                │                        │
│          ┌─────────────────────┼─────────────────┐      │
│          ▼                     ▼                 ▼      │
│     PostgreSQL            RabbitMQ            MinIO     │
│      Port: 5432          Ports: 5672         Port: 9000│
│                                                         │
│                         Redis                           │
│                       Port: 6379                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Servicios:

| # | Servicio | Tipo | Puerto | Descripción |
|---|----------|------|--------|-------------|
| 1 | PostgreSQL | Infraestructura | 5432 | Base de datos |
| 2 | Redis | Infraestructura | 6379 | Cache |
| 3 | RabbitMQ | Infraestructura | 5672 | Message Queue |
| 4 | MinIO | Infraestructura | 9000 | Object Storage |
| 5 | **OMR Processor** | Aplicación | 8000 | Procesamiento OMR |
| 6 | **API Gateway** | Aplicación | 3000 | API Backend |
| 7 | **Frontend** | Aplicación | 8081 | Web App |

---

## 🗄️ Servicios de Infraestructura

### 1. PostgreSQL

**Tipo**: Docker Image  
**Imagen**: `postgres:15-alpine`

**Variables de entorno:**
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure_password_here
POSTGRES_DB=omr_db
```

**Volume**: `/var/lib/postgresql/data`  
**Puerto**: 5432 (solo red interna)

---

### 2. Redis

**Tipo**: Docker Image  
**Imagen**: `redis:7-alpine`

**Command**: `redis-server --appendonly yes`

**Volume**: `/data`  
**Puerto**: 6379 (solo red interna)

---

### 3. RabbitMQ

**Tipo**: Docker Image  
**Imagen**: `rabbitmq:3-management-alpine`

**Variables de entorno:**
```env
RABBITMQ_DEFAULT_USER=guest
RABBITMQ_DEFAULT_PASS=secure_password_here
```

**Volume**: `/var/lib/rabbitmq`  
**Puertos**:
- 5672 (AMQP - red interna)
- 15672 (Management UI - opcional, público)

---

### 4. MinIO

**Tipo**: Docker Image  
**Imagen**: `minio/minio:latest`

**Command**: `server /data --console-address ":9001"`

**Variables de entorno:**
```env
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=secure_password_here
```

**Volume**: `/data`  
**Puertos**:
- 9000 (API - red interna)
- 9001 (Console - opcional, público)

#### Inicializar Bucket

Después de crear MinIO:

1. Acceder a consola: `https://your-domain:9001`
2. Login con credenciales
3. Crear bucket: `omr-images`
4. Configurar acceso público (download only)

---

## 🚀 Servicios de Aplicación

### 5. OMR Processor (Python)

**Tipo**: Git Repository

| Campo | Valor |
|-------|-------|
| Build Path | `omr-processor-service` |
| Dockerfile Path | `omr-processor-service/Dockerfile` |
| Puerto | 8000 |

**Variables de entorno:**
```env
# Application
ENVIRONMENT=production
HOST=0.0.0.0
PORT=8000

# MinIO (usar nombre del servicio en Dokploy)
MINIO_ENDPOINT=omr-minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=<mismo-password-de-minio>
MINIO_BUCKET=omr-images
MINIO_USE_SSL=false

# RabbitMQ
RABBITMQ_URL=amqp://guest:<password>@omr-rabbitmq:5672/
ENABLE_CONSUMER=true

# Logging
LOG_LEVEL=INFO
```

**Health check**: `GET /health`

---

### 6. API Gateway (NestJS)

**Tipo**: Git Repository

| Campo | Valor |
|-------|-------|
| Build Path | `back` |
| Dockerfile Path | `back/Dockerfile.gateway` |
| Puerto | 3000 |

**Variables de entorno:**
```env
# Application
NODE_ENV=production
PORT=3000

# PostgreSQL
DB_HOST=omr-postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=<password-postgres>
DB_DATABASE=omr_db

# Redis
REDIS_HOST=omr-redis
REDIS_PORT=6379

# RabbitMQ
RABBITMQ_URL=amqp://guest:<password>@omr-rabbitmq:5672

# MinIO
MINIO_ENDPOINT=omr-minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=<password-minio>
MINIO_BUCKET=omr-images
MINIO_USE_SSL=false

# OMR Processor
OMR_PROCESSOR_URL=http://omr-processor:8000

# CORS (ajustar según frontend)
CORS_ORIGIN=https://your-frontend-domain.com
```

**Health check**: `GET /api/health`  
**Docs**: `GET /api/docs` (solo en dev)

---

### 7. Frontend (Expo Web)

**Tipo**: Git Repository

| Campo | Valor |
|-------|-------|
| Build Path | `front` |
| Dockerfile Path | `front/Dockerfile` |
| Puerto | 8081 |

**Variables de entorno:**
```env
EXPO_PUBLIC_API_BASE_URL=https://api.your-domain.com/api
EXPO_PUBLIC_ENABLE_LOGS=false
EXPO_PUBLIC_MOCK_CAMERA=false
EXPO_PUBLIC_MOCK_API=false
EXPO_PUBLIC_POLLING_INTERVAL=2000
EXPO_PUBLIC_MAX_POLLING_ATTEMPTS=30
```

---

## 🔗 Conectividad entre Servicios

En Dokploy, los servicios en la misma red se comunican por nombre:

| Desde | Hacia | Variable | Valor Ejemplo |
|-------|-------|----------|---------------|
| API Gateway | PostgreSQL | `DB_HOST` | `omr-postgres` |
| API Gateway | Redis | `REDIS_HOST` | `omr-redis` |
| API Gateway | RabbitMQ | `RABBITMQ_URL` | `amqp://...@omr-rabbitmq:5672` |
| API Gateway | MinIO | `MINIO_ENDPOINT` | `omr-minio` |
| API Gateway | OMR Processor | `OMR_PROCESSOR_URL` | `http://omr-processor:8000` |
| OMR Processor | MinIO | `MINIO_ENDPOINT` | `omr-minio` |
| OMR Processor | RabbitMQ | `RABBITMQ_URL` | `amqp://...@omr-rabbitmq:5672/` |
| Frontend | API Gateway | `EXPO_PUBLIC_API_BASE_URL` | `https://api.your-domain.com/api` |

> **Nota**: Los nombres de servicio son los que configuras en Dokploy. Reemplaza `omr-postgres`, `omr-redis`, etc. con tus nombres reales.

---

## ✅ Verificación

### 1. Health Checks

```bash
# PostgreSQL
docker exec -it <container-id> pg_isready -U postgres

# Redis
docker exec -it <container-id> redis-cli ping

# RabbitMQ
curl http://localhost:15672/api/healthchecks/node

# MinIO
curl http://localhost:9000/minio/health/live

# OMR Processor
curl https://your-domain:8000/health

# API Gateway
curl https://your-domain:3000/api/health

# Frontend
curl https://your-domain:8081/
```

### 2. Logs

En Dokploy, revisar logs de cada servicio:

- ✅ Conexiones establecidas
- ✅ Sin errores de autenticación
- ✅ Health checks pasando
- ✅ Puerto escuchando correctamente

### 3. Prueba End-to-End

1. Acceder al frontend: `https://your-domain.com`
2. Tomar/subir foto de hoja OMR
3. Verificar procesamiento exitoso
4. Revisar resultados guardados

---

## 🛠️ Comandos Útiles

### Build Local (Testing)

```bash
# OMR Processor
cd omr-processor-service
docker build -t omr-processor .
docker run -p 8000:8000 --env-file .env omr-processor

# API Gateway
cd back
docker build -f Dockerfile.gateway -t api-gateway .
docker run -p 3000:3000 --env-file .env api-gateway

# Frontend
cd front
docker build -t omr-frontend .
docker run -p 8081:8081 --env-file .env omr-frontend
```

### Docker Compose Local (Completo)

Ver `docker-compose.production.yml` en la carpeta `back/`

```bash
cd back
docker-compose -f docker-compose.production.yml up -d
```

### Miggraciones de DB

```bash
# Conectar a PostgreSQL
docker exec -it <postgres-container> psql -U postgres -d omr_db

# Ver tablas
\dt

# Ejecutar migraciones (desde API Gateway)
docker exec -it <api-gateway-container> node dist/migration.js
```

---

## 🐛 Troubleshooting

### Error: "Cannot connect to database"

**Causa**: DB no accesible o credenciales incorrectas

**Solución**:
```bash
# Verificar que PostgreSQL esté corriendo
docker ps | grep postgres

# Verificar conectividad desde API Gateway
docker exec -it <api-container> ping omr-postgres

# Verificar credenciales
echo $DB_HOST
echo $DB_PASSWORD
```

---

### Error: "MinIO bucket does not exist"

**Causa**: Bucket no creado

**Solución**:
1. Acceder a MinIO console
2. Crear bucket `omr-images`
3. O usar CLI:
```bash
docker run --rm -it --network=dokploy minio/mc \
  alias set omr http://omr-minio:9000 minioadmin password
docker run --rm -it --network=dokploy minio/mc \
  mb omr/omr-images --ignore-existing
```

---

### Error: "ECONNREFUSED" entre servicios

**Causa**: Servicios no están en la misma red

**Solución**:
- Verificar que todos los servicios estén en la misma red de Dokploy
- Usar nombres de servicio, no `localhost`
- Verificar firewall rules

---

### Error: Build falla en API Gateway

**Causa**: Contexto de build incorrecto

**Solución**:
- Verificar que `Build Path` sea `back` (no `back/apps/api-gateway`)
- Verificar que `Dockerfile Path` sea `back/Dockerfile.gateway`
- Limpiar cache: `docker builder prune`

---

### Frontend no se conecta a API

**Causa**: URL del API incorrecta o CORS

**Solución**:
- Verificar `EXPO_PUBLIC_API_BASE_URL` en frontend
- Verificar `CORS_ORIGIN` en API Gateway
- Usar HTTPS si el frontend está en HTTPS

---

## 📊 Recursos Recomendados

| Servicio | CPU | Memoria | Disco |
|----------|-----|---------|-------|
| PostgreSQL | 1 core | 512MB | 10GB |
| Redis | 0.5 core | 256MB | 1GB |
| RabbitMQ | 0.5 core | 256MB | 2GB |
| MinIO | 1 core | 512MB | 20GB |
| OMR Processor | 1 core | 512MB | 1GB |
| API Gateway | 1 core | 256MB | 1GB |
| Frontend | 0.5 core | 128MB | 100MB |

**Total**: ~3.5 cores, ~2.5GB RAM, ~35GB disco

---

## 🔐 Checklist de Seguridad

- [ ] Cambiar todas las contraseñas por defecto
- [ ] Usar HTTPS para servicios públicos
- [ ] Configurar CORS correctamente
- [ ] No exponer puertos de infraestructura públicamente
- [ ] Configurar backups para PostgreSQL y MinIO
- [ ] Habilitar logs y monitoreo
- [ ] Usar secrets manager para credentials (si disponible)
- [ ] Configurar rate limiting en API Gateway
- [ ] Validar tamaño máximo de uploads

---

## 📞 Soporte

Para issues o dudas:
- Revisar logs en Dokploy
- Verificar health checks
- Consultar esta documentación
- Revisar README de cada servicio

---

**Última actualización**: 2026-01-03
