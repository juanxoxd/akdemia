# OMR API Gateway

API Gateway principal para el sistema de reconocimiento óptico de marcas (OMR).

## 🏗️ Arquitectura

- **Framework**: NestJS
- **Base de datos**: PostgreSQL
- **Cache**: Redis
- **Queue**: RabbitMQ
- **Storage**: MinIO (S3)
- **Procesamiento**: OMR Processor Service

## 🚀 Despliegue Rápido

### Opción 1: Docker (Recomendado)

```bash
# Desde la carpeta back/
docker build -f Dockerfile.gateway -t api-gateway .

# Run
docker run -p 3000:3000 \
  -e DB_HOST=postgres \
  -e DB_PASSWORD=password \
  -e REDIS_HOST=redis \
  api-gateway
```

### Opción 2: Desarrollo Local

```bash
# Desde la carpeta back/
# Instalar dependencias
pnpm install

# Copiar env
cp .env.example .env

# Ejecutar dev
pnpm --filter @omr/api-gateway dev
```

## 📦 Deploy en Dokploy

### Configuración en Dokploy

| Campo | Valor |
|-------|-------|
| **Tipo** | Git Repository |
| **Build Path** | `back` |
| **Dockerfile Path** | `back/Dockerfile.gateway` |
| **Puerto** | `3000` |

### Variables de Entorno Requeridas

```env
# Application
NODE_ENV=production
PORT=3000

# PostgreSQL (nombre del servicio en Dokploy)
DB_HOST=omr-postgres-service
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-secure-password
DB_DATABASE=omr_db

# Redis
REDIS_HOST=omr-redis-service
REDIS_PORT=6379

# RabbitMQ
RABBITMQ_URL=amqp://guest:password@omr-rabbitmq-service:5672

# MinIO / S3
MINIO_ENDPOINT=omr-minio-service
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=your-secure-password
MINIO_BUCKET=omr-images
MINIO_USE_SSL=false

# OMR Processor
OMR_PROCESSOR_URL=http://omr-processor-service:8000

# CORS (opcional)
CORS_ORIGIN=*
```

## 📡 API Endpoints

### Health Check
```bash
GET /api/health
```

### Exámenes
```bash
GET    /api/exams              # Listar exámenes
POST   /api/exams              # Crear examen
GET    /api/exams/:id          # Obtener examen
PUT    /api/exams/:id          # Actualizar examen
DELETE /api/exams/:id          # Eliminar examen
```

### Estudiantes
```bash
GET    /api/students           # Listar estudiantes
POST   /api/students           # Crear estudiante
GET    /api/students/:id       # Obtener estudiante
PUT    /api/students/:id       # Actualizar estudiante
DELETE /api/students/:id       # Eliminar estudiante
```

### Procesamiento OMR
```bash
POST   /api/processing/upload  # Subir imagen para procesar
GET    /api/processing/:id     # Obtener resultado
```

### Documentación Completa
- **Swagger UI**: `http://localhost:3000/api/docs` (solo dev)

## 🔧 Desarrollo

### Estructura del Monorepo
```
back/
├── apps/
│   └── api-gateway/        # Esta aplicación
├── packages/
│   ├── shared-types/       # Tipos compartidos
│   └── database/           # Entities y migraciones
├── Dockerfile.gateway      # Dockerfile para deploy
└── pnpm-workspace.yaml     # Config del monorepo
```

### Scripts Disponibles

```bash
# Desarrollo
pnpm --filter @omr/api-gateway dev

# Build
pnpm --filter @omr/api-gateway build

# Tests
pnpm --filter @omr/api-gateway test

# Lint
pnpm --filter @omr/api-gateway lint
```

### Migraciones de Base de Datos

```bash
# Generar migración
pnpm --filter @omr/api-gateway migration:generate

# Ejecutar migraciones
pnpm --filter @omr/api-gateway migration:run

# Revertir migración
pnpm --filter @omr/api-gateway migration:revert
```

## 🔗 Dependencias Externas

Este servicio requiere:

- **PostgreSQL**: Base de datos principal (requerido)
- **Redis**: Cache (requerido)
- **RabbitMQ**: Cola de mensajes (requerido)
- **MinIO**: Almacenamiento de archivos (requerido)
- **OMR Processor**: Servicio de procesamiento OMR (requerido)

## 🛠️ Troubleshooting

### Error: "Cannot connect to database"
```bash
# Verificar conectividad
docker run --rm -it postgres:15 psql -h postgres -U postgres

# Verificar env vars
echo $DB_HOST
echo $DB_PASSWORD
```

### Error: "Module @omr/shared-types not found"
```bash
# Rebuild shared packages
cd back
pnpm --filter @omr/shared-types build
pnpm --filter @omr/api-gateway build
```

### Build de Docker falla
```bash
# Asegurarse de estar en back/
cd back

# Build con logs
docker build -f Dockerfile.gateway -t api-gateway . --progress=plain
```

## 📊 Performance

- **Response time**: <100ms promedio
- **Memoria**: ~256MB
- **CPU**: 1 core recomendado

## 🔐 Seguridad

- Helmet.js habilitado
- CORS configurado
- Validación de entrada con class-validator
- Usuario no-root en Docker
- Environment variables nunca en código

## 📝 Tech Stack

- **Runtime**: Node.js 20
- **Framework**: NestJS
- **ORM**: TypeORM
- **Validation**: class-validator
- **Documentation**: Swagger
- **Package Manager**: pnpm
