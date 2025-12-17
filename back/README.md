# 📝 OMR System - Sistema de Reconocimiento Óptico de Marcas

Sistema completo para el procesamiento de hojas de respuesta mediante reconocimiento óptico de marcas (OMR).

## 🏗️ Arquitectura

```
                    ┌─────────────────────────────────────────────┐
                    │              Cliente (Postman/Web)          │
                    └──────────────────┬──────────────────────────┘
                                       │
                                       ▼
                    ┌─────────────────────────────────────────────┐
                    │           API Gateway (NestJS)               │
                    │               Port: 3000                     │
                    │  • Swagger Docs: /api/docs                  │
                    │  • Health: /api/health                       │
                    └──────────────────┬──────────────────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
    ┌─────────▼─────────┐    ┌─────────▼─────────┐    ┌─────────▼─────────┐
    │   HTTP Síncrono   │    │    S3 (MinIO)     │    │    RabbitMQ       │
    │                   │    │    Port: 9000     │    │    Port: 5672     │
    │   Answer Key:     │    │                   │    │                   │
    │   POST -> FastAPI │    │   Almacenamiento  │    │   Cola Async:     │
    │   -> Respuesta    │    │   de Imágenes     │    │   Student Answers │
    └─────────┬─────────┘    └───────────────────┘    └─────────┬─────────┘
              │                                                 │
              └────────────────────┬────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │    OMR Processor (FastAPI)   │
                    │         Port: 8000           │
                    │  • OpenCV + NumPy + Pillow   │
                    │  • Detección de Marcas       │
                    │  • Consumer RabbitMQ         │
                    └──────────────┬──────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
┌───────▼───────┐          ┌───────▼───────┐          ┌───────▼───────┐
│  PostgreSQL   │          │    Redis      │          │    MinIO      │
│   Port: 5432  │          │   Port: 6379  │          │  Console:9001 │
└───────────────┘          └───────────────┘          └───────────────┘
```

## 🔄 Flujos de Procesamiento

### Flujo 1: Answer Key (HTTP Síncrono)
```
Cliente -> POST /api/exams/:examId/answer-key
        -> NestJS valida y sube imagen a S3
        -> NestJS llama a FastAPI (HTTP síncrono)
        -> FastAPI procesa imagen con OpenCV
        -> FastAPI retorna matriz de respuestas
        -> NestJS valida confidence >95%
        -> Cliente recibe preview para confirmar
```

### Flujo 2: Respuestas de Estudiantes (Async con RabbitMQ)
```
Cliente -> POST /api/exams/:examId/students/:studentId/submit
        -> NestJS sube imagen a S3
        -> NestJS encola mensaje en RabbitMQ (no bloquea)
        -> Cliente recibe attemptId inmediatamente
        
        [Async en background]
        -> FastAPI consume mensaje de RabbitMQ
        -> FastAPI descarga imagen de S3
        -> FastAPI procesa y compara con answerKey
        -> FastAPI publica resultado en cola omr.results
        -> NestJS consume resultado y guarda en DB
        
Cliente -> GET /api/exams/:examId/students/:studentId/results
        -> Obtiene score, respuestas, confidence
```

## 📁 Estructura del Proyecto

```
OMR/
├── apps/
│   ├── api-gateway/          # NestJS - Punto de entrada API
│   ├── exam-service/         # NestJS - Gestión de exámenes (TODO)
│   └── omr-processor/        # Python/FastAPI - Procesamiento OMR
├── packages/
│   ├── shared-types/         # Tipos TypeScript compartidos
│   └── database/             # Entidades y configuración TypeORM
├── docker/
│   ├── docker-compose.yml    # Orquestación de servicios
│   └── init-db/              # Scripts de inicialización DB
├── .env.example              # Variables de entorno de ejemplo
├── package.json              # Configuración del monorepo
├── pnpm-workspace.yaml       # Workspaces de pnpm
└── turbo.json                # Configuración de Turborepo
```

## 🚀 Inicio Rápido

### Prerrequisitos

- **Node.js** >= 18.x
- **pnpm** >= 8.x
- **Python** >= 3.11
- **Docker** y **Docker Compose**

### 1. Clonar e instalar dependencias

```bash
# Clonar repositorio
git clone <repository-url>
cd OMR

# Instalar dependencias de Node.js
pnpm install

# Instalar dependencias de Python (omr-processor)
cd apps/omr-processor
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ../..
```

### 2. Configurar variables de entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar .env con tus valores
```

### 3. Iniciar servicios de infraestructura

```bash
# Iniciar PostgreSQL, Redis, RabbitMQ y MinIO
pnpm docker:up

# Ver logs
pnpm docker:logs
```

### 4. Ejecutar servicios en desarrollo

```bash
# Terminal 1: API Gateway
pnpm dev:gateway

# Terminal 2: OMR Processor
cd apps/omr-processor
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### 5. Acceder a los servicios

| Servicio | URL |
|----------|-----|
| API Gateway | http://localhost:3000 |
| Swagger Docs | http://localhost:3000/api/docs |
| OMR Processor | http://localhost:8000 |
| OMR Docs | http://localhost:8000/docs |
| MinIO Console | http://localhost:9001 |
| RabbitMQ Management | http://localhost:15672 |

## 📚 API Endpoints

### Exámenes

```http
POST   /api/exams/start              # Crear examen
GET    /api/exams                    # Listar exámenes
GET    /api/exams/:id                # Obtener examen
PUT    /api/exams/:id                # Actualizar examen
DELETE /api/exams/:id                # Eliminar examen
GET    /api/exams/:id/statistics     # Estadísticas del examen
```

### Estudiantes

```http
POST   /api/exams/:examId/students           # Registrar estudiante
POST   /api/exams/:examId/students/bulk      # Registro masivo
GET    /api/exams/:examId/students           # Listar estudiantes
GET    /api/exams/:examId/students/:id       # Obtener estudiante
GET    /api/exams/:examId/students/:id/result # Resultado del estudiante
```

### Procesamiento OMR

```http
POST   /api/exams/:examId/answer-key         # Subir hoja de respuestas
POST   /api/exams/:examId/answer-key/confirm # Confirmar respuestas
POST   /api/exams/:examId/students/:id/submit # Subir respuesta estudiante
```

## 🔧 Scripts Disponibles

```bash
# Desarrollo
pnpm dev              # Ejecutar todos los servicios en desarrollo
pnpm dev:gateway      # Solo API Gateway
pnpm dev:exam         # Solo Exam Service

# Build
pnpm build            # Compilar todos los paquetes

# Tests
pnpm test             # Ejecutar tests
pnpm test:e2e         # Tests end-to-end

# Docker
pnpm docker:up        # Iniciar infraestructura
pnpm docker:down      # Detener infraestructura
pnpm docker:logs      # Ver logs

# Base de datos
pnpm db:migrate       # Ejecutar migraciones
pnpm db:generate      # Generar migraciones
```

## 🔬 Procesamiento OMR

### Flujo de Procesamiento

1. **Preprocesamiento**
   - Conversión a escala de grises
   - Binarización adaptativa
   - Reducción de ruido

2. **Detección de ROI**
   - Identificación de marcas de tiempo
   - Corrección de perspectiva
   - Alineación de la imagen

3. **Detección de Marcas**
   - Análisis de densidad de píxeles
   - Umbral dinámico
   - Cálculo de confianza

4. **Validación**
   - Detección de marcas múltiples
   - Identificación de respuestas ambiguas
   - Verificación de calidad

### Configuración de Umbrales

```env
MARK_DETECTION_THRESHOLD=0.65   # Umbral de detección de marca
CONFIDENCE_THRESHOLD=0.85       # Umbral de confianza
MIN_QUALITY_SCORE=0.7           # Calidad mínima de imagen
```

## 🐳 Despliegue con Docker

### Desarrollo

```bash
# Iniciar solo infraestructura
docker-compose -f docker/docker-compose.yml up -d

# Iniciar todo (incluye aplicaciones)
docker-compose -f docker/docker-compose.yml --profile full up -d
```

### Producción

```bash
# Build de imágenes
docker-compose -f docker/docker-compose.yml build

# Desplegar
docker-compose -f docker/docker-compose.yml --profile full up -d
```

## 📊 Monitoreo

### Health Checks

```bash
# API Gateway
curl http://localhost:3000/api/health

# OMR Processor
curl http://localhost:8000/health

# Todos los servicios
curl http://localhost/nginx-health
```

## 🤝 Contribución

1. Fork el repositorio
2. Crear una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles.
