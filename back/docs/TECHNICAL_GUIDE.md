# OMR System - Guía Técnica Completa

## Tabla de Contenidos

1. [Arquitectura General](#arquitectura-general)
2. [Componentes del Sistema](#componentes-del-sistema)
3. [Flujo de Procesamiento](#flujo-de-procesamiento)
4. [Endpoints API](#endpoints-api)
5. [Comandos cURL](#comandos-curl)
6. [Flujo Paso a Paso](#flujo-paso-a-paso)
7. [Configuración de Desarrollo](#configuración-de-desarrollo)

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTE (Frontend)                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY (NestJS :3000)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Exams     │  │  Students   │  │ Processing  │  │   Health Check      │ │
│  │  Controller │  │ Controller  │  │ Controller  │  │    Controller       │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│         │                │                │                                  │
│         ▼                ▼                ▼                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                           SERVICES LAYER                                ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ ││
│  │  │ ExamsService│  │StudentsServ│  │ProcessingSvc│  │  RabbitMQService│ ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘ ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│         │                                     │                │             │
│         ▼                                     ▼                ▼             │
│  ┌─────────────┐                      ┌─────────────┐  ┌─────────────────┐  │
│  │  S3Service  │                      │ HTTP Client │  │  ResultsConsumer│  │
│  │  (MinIO)    │                      │ (FastAPI)   │  │  (omr.results)  │  │
│  └─────────────┘                      └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
        │                                      │                  ▲
        ▼                                      ▼                  │
┌───────────────┐                      ┌───────────────┐  ┌───────────────┐
│    MinIO      │                      │   FastAPI     │  │   RabbitMQ    │
│   (S3 :9000)  │◄─────────────────────│   (:8000)     │──│   (:5672)     │
└───────────────┘                      │               │  │               │
                                       │  ┌──────────┐ │  │ omr.processing│
                                       │  │  OMR     │ │  │ omr.results   │
                                       │  │Processor │ │  └───────────────┘
                                       │  └──────────┘ │          ▲
                                       │               │          │
                                       │  ┌──────────┐ │          │
                                       │  │Processing│─┼──────────┘
                                       │  │ Consumer │ │
                                       │  └──────────┘ │
                                       └───────────────┘
```

---

## Componentes del Sistema

### 1. API Gateway (NestJS - Puerto 3000)
- **Función**: Punto de entrada único para todas las peticiones
- **Responsabilidades**:
  - Validación de requests
  - Autenticación/Autorización (futuro)
  - Enrutamiento a servicios
  - Upload de imágenes a MinIO
  - Encolado de mensajes en RabbitMQ

### 2. OMR Processor (FastAPI - Puerto 8000)
- **Función**: Procesamiento de imágenes con OpenCV
- **Responsabilidades**:
  - Recibir imágenes vía HTTP (answer keys)
  - Consumir cola RabbitMQ (student answers)
  - Detección de marcas ópticas
  - Publicar resultados

### 3. MinIO (Puerto 9000/9001)
- **Función**: Almacenamiento de objetos compatible con S3
- **Buckets**:
  - `omr-images`: Imágenes de exámenes

### 4. RabbitMQ (Puerto 5672/15672)
- **Función**: Message broker para comunicación asíncrona
- **Colas**:
  - `omr.processing`: Trabajos pendientes de procesar
  - `omr.results`: Resultados de procesamiento

### 5. PostgreSQL (Puerto 5432)
- **Función**: Base de datos principal
- **Tablas**: exams, students, exam_attempts, answers, processing_logs

### 6. Redis (Puerto 6379)
- **Función**: Cache y sesiones
- **Uso**: Cache de resultados, rate limiting

---

## Flujo de Procesamiento

### Flujo A: Procesar Answer Key (SÍNCRONO)

```
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│  Cliente │─────▶│ NestJS   │─────▶│ MinIO    │      │          │
│          │ POST │ Gateway  │upload│ (S3)     │      │          │
└──────────┘      └──────────┘      └──────────┘      │          │
                        │                              │          │
                        │ HTTP POST (sync)             │          │
                        ▼                              │          │
                  ┌──────────┐                         │  FastAPI │
                  │ FastAPI  │◄────────────────────────│          │
                  │/answer-key│ download image         │          │
                  └──────────┘                         │          │
                        │                              │          │
                        │ OpenCV processing            │          │
                        ▼                              │          │
                  ┌──────────┐                         │          │
                  │ Response │                         │          │
                  │ detected │─────────────────────────┼─────────▶│
                  │ answers  │                         │          │
                  └──────────┘                         └──────────┘
                        │
                        ▼
                  ┌──────────┐
                  │ Cliente  │ ← Respuesta inmediata
                  │ recibe   │   con answers detectadas
                  │ resultado│
                  └──────────┘
```

### Flujo B: Procesar Student Answer (ASÍNCRONO)

```
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│  Cliente │─────▶│ NestJS   │─────▶│ MinIO    │      │ RabbitMQ │
│          │ POST │ Gateway  │upload│ (S3)     │      │          │
└──────────┘      └──────────┘      └──────────┘      │          │
     ▲                  │                              │          │
     │                  │ enqueue message              │          │
     │                  ▼                              │          │
     │            ┌──────────┐                         │          │
     │            │ RabbitMQ │ ──── omr.processing ───▶│          │
     │            │ Producer │                         │          │
     │            └──────────┘                         │          │
     │                  │                              └──────────┘
     │                  ▼                                    │
     │            ┌──────────┐                               │
     │◀───────────│ Response │ attemptId + status: PENDING  │
     │            │ 202      │                               │
     │            └──────────┘                               │
     │                                                       │
     │                                                       ▼
     │                                                ┌──────────┐
     │                                                │ FastAPI  │
     │                                                │ Consumer │
     │                                                └──────────┘
     │                                                       │
     │                                                       │ process
     │                                                       ▼
     │                                                ┌──────────┐
     │                                                │ RabbitMQ │
     │                                                │ omr.results
     │                                                └──────────┘
     │                                                       │
     │                                                       ▼
     │                                                ┌──────────┐
     │         GET /results/:attemptId                │ NestJS   │
     └────────────────────────────────────────────────│ Consumer │
                                                      └──────────┘
```

---

## Endpoints API

### Base URL
```
http://localhost:3000/api
```

### Health Check
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/health` | Estado de todos los servicios |

### Exams
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/exams` | Crear examen |
| GET | `/exams` | Listar exámenes |
| GET | `/exams/:id` | Obtener examen |
| PATCH | `/exams/:id` | Actualizar examen |
| DELETE | `/exams/:id` | Eliminar examen |

### Students
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/students` | Crear estudiante |
| POST | `/students/bulk` | Crear múltiples estudiantes |
| GET | `/students` | Listar estudiantes |
| GET | `/students/:id` | Obtener estudiante |
| PATCH | `/students/:id` | Actualizar estudiante |
| DELETE | `/students/:id` | Eliminar estudiante |

### Processing
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/exams/:examId/answer-key` | Subir answer key (sync) |
| POST | `/exams/:examId/answer-key/confirm` | Confirmar answer key |
| POST | `/exams/:examId/students/:studentId/submit` | Enviar respuesta estudiante (async) |
| GET | `/exams/:examId/students/:studentId/results` | Obtener resultados |

---

## Comandos cURL

### 1. Health Check

```bash
# Verificar estado del sistema
curl -X GET http://localhost:3000/api/health
```

**Respuesta esperada:**
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" },
    "minio": { "status": "up" }
  }
}
```

---

### 2. Crear un Examen

```bash
curl -X POST http://localhost:3000/api/exams \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Examen de Matemáticas - Parcial 1",
    "description": "Primer parcial de álgebra",
    "totalQuestions": 50,
    "optionsPerQuestion": 5,
    "passingScore": 60
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Examen de Matemáticas - Parcial 1",
    "description": "Primer parcial de álgebra",
    "totalQuestions": 50,
    "optionsPerQuestion": 5,
    "passingScore": 60,
    "status": "DRAFT",
    "createdAt": "2025-12-06T15:00:00.000Z"
  }
}
```

---

### 3. Listar Exámenes

```bash
# Listar todos
curl -X GET http://localhost:3000/api/exams

# Con paginación
curl -X GET "http://localhost:3000/api/exams?page=1&limit=10"

# Con filtros
curl -X GET "http://localhost:3000/api/exams?status=ACTIVE"
```

---

### 4. Crear Estudiantes

```bash
# Crear un estudiante
curl -X POST http://localhost:3000/api/students \
  -H "Content-Type: application/json" \
  -d '{
    "code": "2024001",
    "firstName": "Juan",
    "lastName": "Pérez",
    "email": "juan.perez@universidad.edu"
  }'

# Crear múltiples estudiantes (bulk)
curl -X POST http://localhost:3000/api/students/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "students": [
      { "code": "2024001", "firstName": "Juan", "lastName": "Pérez" },
      { "code": "2024002", "firstName": "María", "lastName": "García" },
      { "code": "2024003", "firstName": "Carlos", "lastName": "López" }
    ]
  }'
```

---

### 5. Subir Answer Key (Clave de Respuestas) - SÍNCRONO

```bash
# Subir imagen de answer key
curl -X POST http://localhost:3000/api/exams/550e8400-e29b-41d4-a716-446655440000/answer-key \
  -F "file=@/ruta/a/answer_key.jpg" \
  -F "totalQuestions=50" \
  -F "optionsPerQuestion=5"
```

**Respuesta esperada (procesamiento exitoso):**
```json
{
  "success": true,
  "data": {
    "examId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "PENDING_CONFIRMATION",
    "detectedAnswers": [
      { "questionNumber": 1, "selectedOptions": [0], "confidence": 0.98 },
      { "questionNumber": 2, "selectedOptions": [2], "confidence": 0.95 },
      { "questionNumber": 3, "selectedOptions": [1], "confidence": 0.97 }
    ],
    "totalDetected": 50,
    "averageConfidence": 0.96,
    "imageUrl": "https://minio:9000/omr-images/answer-keys/550e8400.jpg",
    "message": "Por favor revise las respuestas detectadas y confirme"
  }
}
```

---

### 6. Confirmar Answer Key

```bash
# Confirmar sin modificaciones
curl -X POST http://localhost:3000/api/exams/550e8400-e29b-41d4-a716-446655440000/answer-key/confirm \
  -H "Content-Type: application/json" \
  -d '{}'

# Confirmar con correcciones manuales
curl -X POST http://localhost:3000/api/exams/550e8400-e29b-41d4-a716-446655440000/answer-key/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "confirmedAnswers": [
      [0],
      [2],
      [1],
      [3],
      [0]
    ]
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "examId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "ACTIVE",
    "message": "Answer key confirmed successfully"
  }
}
```

---

### 7. Enviar Respuesta de Estudiante - ASÍNCRONO

```bash
curl -X POST http://localhost:3000/api/exams/550e8400-e29b-41d4-a716-446655440000/students/660e8400-e29b-41d4-a716-446655440001/submit \
  -F "file=@/ruta/a/student_answer.jpg" \
  -F "totalQuestions=50" \
  -F "optionsPerQuestion=5"
```

**Respuesta esperada (202 Accepted - Async):**
```json
{
  "success": true,
  "data": {
    "attemptId": "770e8400-e29b-41d4-a716-446655440002",
    "examId": "550e8400-e29b-41d4-a716-446655440000",
    "studentId": "660e8400-e29b-41d4-a716-446655440001",
    "status": "PROCESSING",
    "message": "Student answer queued for processing",
    "estimatedProcessingTime": "5-10 seconds",
    "checkResultsUrl": "/api/exams/550e8400/students/660e8400/results"
  }
}
```

---

### 8. Consultar Resultados

```bash
# Por attemptId
curl -X GET http://localhost:3000/api/exams/550e8400-e29b-41d4-a716-446655440000/students/660e8400-e29b-41d4-a716-446655440001/results

# Con attemptId específico
curl -X GET "http://localhost:3000/api/exams/550e8400/students/660e8400/results?attemptId=770e8400"
```

**Respuesta esperada (procesamiento completado):**
```json
{
  "success": true,
  "data": {
    "attemptId": "770e8400-e29b-41d4-a716-446655440002",
    "examId": "550e8400-e29b-41d4-a716-446655440000",
    "studentId": "660e8400-e29b-41d4-a716-446655440001",
    "status": "COMPLETED",
    "score": 42,
    "totalQuestions": 50,
    "percentage": 84.0,
    "passed": true,
    "results": {
      "correct": 42,
      "incorrect": 5,
      "blank": 3
    },
    "answers": [
      { "question": 1, "selected": 0, "correct": 0, "isCorrect": true },
      { "question": 2, "selected": 2, "correct": 2, "isCorrect": true },
      { "question": 3, "selected": 3, "correct": 1, "isCorrect": false }
    ],
    "imageUrl": "https://minio:9000/omr-images/...",
    "processedAt": "2025-12-06T15:05:00.000Z"
  }
}
```

**Respuesta esperada (aún procesando):**
```json
{
  "success": true,
  "data": {
    "attemptId": "770e8400-e29b-41d4-a716-446655440002",
    "status": "PROCESSING",
    "message": "Results are still being processed",
    "submittedAt": "2025-12-06T15:04:55.000Z"
  }
}
```

---

## Flujo Paso a Paso

### Escenario Completo: Calificar un Examen

#### Paso 1: Levantar Infraestructura

```bash
# Terminal 1: Iniciar Docker (PostgreSQL, Redis, RabbitMQ, MinIO)
cd d:/Juanxo/Python/OMR
pnpm docker:up

# Verificar que los contenedores estén corriendo
docker ps
```

Deberías ver:
```
CONTAINER ID   IMAGE          PORTS                    NAMES
abc123         postgres:15    5432/tcp                 omr-postgres
def456         redis:7        6379/tcp                 omr-redis
ghi789         rabbitmq:3     5672/tcp, 15672/tcp      omr-rabbitmq
jkl012         minio/minio    9000/tcp, 9001/tcp       omr-minio
```

#### Paso 2: Iniciar API Gateway (NestJS)

```bash
# Terminal 2
cd d:/Juanxo/Python/OMR
pnpm dev:gateway
```

Deberías ver:
```
[Nest] 12345  - Starting Nest application...
[Nest] 12345  - ✅ Conectado a RabbitMQ
[Nest] 12345  - 🚀 OMR API Gateway is running on port 3000
```

#### Paso 3: Iniciar OMR Processor (FastAPI)

```bash
# Terminal 3
cd d:/Juanxo/Python/OMR/apps/omr-processor

# Activar entorno virtual
source venv/Scripts/activate  # Git Bash
# o: .\venv\Scripts\Activate.ps1  # PowerShell

# Iniciar servidor
uvicorn app.main:app --reload --port 8000
```

Deberías ver:
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

#### Paso 4: Verificar Health

```bash
# Terminal 4 (nueva terminal para comandos)
curl http://localhost:3000/api/health
curl http://localhost:8000/health
```

#### Paso 5: Crear Examen

```bash
curl -X POST http://localhost:3000/api/exams \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Parcial Matemáticas",
    "totalQuestions": 20,
    "optionsPerQuestion": 5
  }'
```

Guardar el `id` del examen: `EXAM_ID=<id_retornado>`

#### Paso 6: Subir Answer Key

```bash
curl -X POST http://localhost:3000/api/exams/${EXAM_ID}/answer-key \
  -F "file=@./test_images/answer_key.jpg" \
  -F "totalQuestions=20" \
  -F "optionsPerQuestion=5"
```

#### Paso 7: Confirmar Answer Key

```bash
curl -X POST http://localhost:3000/api/exams/${EXAM_ID}/answer-key/confirm \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### Paso 8: Crear Estudiante

```bash
curl -X POST http://localhost:3000/api/students \
  -H "Content-Type: application/json" \
  -d '{
    "code": "2024001",
    "firstName": "Juan",
    "lastName": "Test"
  }'
```

Guardar el `id`: `STUDENT_ID=<id_retornado>`

#### Paso 9: Enviar Respuesta del Estudiante

```bash
curl -X POST http://localhost:3000/api/exams/${EXAM_ID}/students/${STUDENT_ID}/submit \
  -F "file=@./test_images/student_answer.jpg" \
  -F "totalQuestions=20" \
  -F "optionsPerQuestion=5"
```

Guardar el `attemptId`: `ATTEMPT_ID=<id_retornado>`

#### Paso 10: Consultar Resultados (después de unos segundos)

```bash
# Esperar 5-10 segundos y consultar
curl http://localhost:3000/api/exams/${EXAM_ID}/students/${STUDENT_ID}/results
```

---

## Configuración de Desarrollo

### Variables de Entorno (.env)

```env
# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=omr_db
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# MinIO (S3)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=omr-images
MINIO_USE_SSL=false

# OMR Processor
OMR_PROCESSOR_URL=http://localhost:8000
```

### Acceso a Consolas

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |
| RabbitMQ Management | http://localhost:15672 | guest / guest |
| Swagger API Docs | http://localhost:3000/api/docs | - |
| FastAPI Docs | http://localhost:8000/docs | - |

---

## Troubleshooting

### Error: "Cannot connect to RabbitMQ"
```bash
# Verificar que RabbitMQ esté corriendo
docker logs omr-rabbitmq
# Reiniciar si es necesario
docker restart omr-rabbitmq
```

### Error: "Cannot connect to MinIO"
```bash
# Verificar que MinIO esté corriendo
docker logs omr-minio
# Acceder a consola: http://localhost:9001
```

### Error: "Processing timeout"
- Verificar que FastAPI consumer esté corriendo
- Revisar logs de FastAPI: `docker logs` o terminal

### Limpiar y reiniciar todo
```bash
pnpm docker:down
docker volume prune -f
pnpm docker:up
```

---

## Próximos Pasos (TODO)

1. [ ] Implementar persistencia real en PostgreSQL
2. [ ] Implementar cache en Redis
3. [ ] Agregar autenticación JWT
4. [ ] Implementar WebSockets para notificaciones en tiempo real
5. [ ] Agregar tests e2e
6. [ ] Dockerizar aplicaciones completas
7. [ ] Configurar CI/CD
