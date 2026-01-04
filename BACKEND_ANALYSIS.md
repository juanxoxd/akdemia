# 📊 Análisis del Backend de Akdemia - Sistema OMR

**Fecha de análisis:** 4 de Enero, 2026  
**Versión:** 1.0.0

---

## 📋 Resumen Ejecutivo

**Akdemia** es un sistema de **Reconocimiento Óptico de Marcas (OMR)** diseñado para procesar hojas de respuestas de exámenes. El backend está compuesto por dos servicios principales que trabajan en conjunto:

1. **API Gateway** (NestJS/TypeScript) - Puerto 3000
2. **OMR Processor Service** (FastAPI/Python) - Puerto 8000

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Expo/React Native)                │
│                              Puerto: 8081                           │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │ HTTP/REST
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        API GATEWAY (NestJS)                         │
│                           Puerto: 3000                              │
│  ┌───────────────┐  ┌──────────────┐  ┌───────────────────────┐    │
│  │ ExamsModule   │  │StudentsModule│  │  ProcessingModule     │    │
│  └───────────────┘  └──────────────┘  └───────────────────────┘    │
│  ┌───────────────┐  ┌──────────────┐  ┌───────────────────────┐    │
│  │  S3Service    │  │RabbitMQService│ │   HealthModule        │    │
│  │   (MinIO)     │  │              │  │                       │    │
│  └───────┬───────┘  └──────┬───────┘  └───────────────────────┘    │
└──────────┼─────────────────┼────────────────────────────────────────┘
           │                 │
           ▼                 ▼
┌──────────────────┐ ┌───────────────┐ ┌──────────────────────────────┐
│     MinIO S3     │ │   RabbitMQ    │ │      PostgreSQL              │
│   Puerto: 9000   │ │ Puerto: 5672  │ │     Puerto: 5432             │
└──────────────────┘ └───────┬───────┘ └──────────────────────────────┘
                             │
                             ▼
           ┌─────────────────────────────────────────┐
           │      OMR PROCESSOR SERVICE (FastAPI)    │
           │              Puerto: 8000               │
           │  ┌──────────────────────────────────┐   │
           │  │        OMRProcessor              │   │
           │  │  (OpenCV + NumPy processing)     │   │
           │  └──────────────────────────────────┘   │
           │  ┌──────────────────────────────────┐   │
           │  │     ProcessingConsumer           │   │
           │  │  (RabbitMQ async consumer)       │   │
           │  └──────────────────────────────────┘   │
           └─────────────────────────────────────────┘
```

---

## 🛠️ Stack Tecnológico Completo

### API Gateway (NestJS)

| Tecnología                | Versión | Uso                  |
| ------------------------- | ------- | -------------------- |
| **Node.js**               | 20+     | Runtime              |
| **NestJS**                | Latest  | Framework            |
| **TypeScript**            | -       | Lenguaje             |
| **TypeORM**               | -       | ORM para PostgreSQL  |
| **@nestjs/microservices** | -       | RabbitMQ integration |
| **@aws-sdk/client-s3**    | -       | MinIO/S3 client      |
| **class-validator**       | -       | DTO validation       |
| **Swagger/OpenAPI**       | -       | Documentación API    |
| **pnpm**                  | -       | Package manager      |
| **Turborepo**             | -       | Monorepo management  |

### OMR Processor Service (Python)

| Tecnología       | Versión | Uso                       |
| ---------------- | ------- | ------------------------- |
| **Python**       | 3.11+   | Runtime                   |
| **FastAPI**      | -       | Framework                 |
| **OpenCV (cv2)** | -       | Procesamiento de imágenes |
| **NumPy**        | -       | Cálculos matriciales      |
| **Pillow (PIL)** | -       | Manipulación de imágenes  |
| **aio-pika**     | -       | RabbitMQ async client     |
| **Pydantic**     | v2      | Validación de datos       |
| **Structlog**    | -       | Logging estructurado      |
| **uvicorn**      | -       | ASGI server               |

### Infraestructura

| Servicio       | Puerto     | Propósito                                |
| -------------- | ---------- | ---------------------------------------- |
| **PostgreSQL** | 5432       | Base de datos principal                  |
| **Redis**      | 6379       | Cache (configurado, no implementado aún) |
| **RabbitMQ**   | 5672/15672 | Message queue                            |
| **MinIO**      | 9000/9001  | Object storage (S3-compatible)           |

---

## 📁 Estructura del Proyecto

```
akdemia/
├── back/                           # Backend NestJS (Monorepo)
│   ├── apps/
│   │   ├── api-gateway/            # API Gateway principal
│   │   │   └── src/
│   │   │       ├── common/         # DTOs compartidos, decoradores, filtros
│   │   │       ├── config/         # Configuración y validación de env
│   │   │       ├── exams/          # Módulo de exámenes (CRUD)
│   │   │       ├── health/         # Health checks
│   │   │       ├── infrastructure/
│   │   │       │   ├── queue/      # RabbitMQ service & consumer
│   │   │       │   └── storage/    # S3/MinIO service
│   │   │       ├── processing/     # Módulo de procesamiento OMR
│   │   │       └── students/       # Módulo de estudiantes (CRUD)
│   │   └── omr-processor/          # (Vacío - usa omr-processor-service)
│   ├── packages/
│   │   ├── database/               # Entidades TypeORM y repositorios
│   │   │   └── src/entities/
│   │   │       ├── exam.entity.ts
│   │   │       ├── exam-attempt.entity.ts
│   │   │       ├── student.entity.ts
│   │   │       ├── answer.entity.ts
│   │   │       └── processing-log.entity.ts
│   │   └── shared-types/           # Tipos, constantes, DTOs compartidos
│   │       └── src/
│   │           ├── constants/
│   │           ├── dto/
│   │           ├── enums/
│   │           └── interfaces/
│   ├── docker-compose.production.yml
│   └── pnpm-workspace.yaml
│
├── omr-processor-service/          # Servicio OMR en Python
│   └── app/
│       ├── api/
│       │   └── endpoints/
│       │       ├── health.py
│       │       └── processing.py   # Endpoints de procesamiento
│       ├── consumers/
│       │   └── processing_consumer.py  # Consumer de RabbitMQ
│       ├── core/
│       │   ├── config.py           # Configuración Pydantic
│       │   ├── constants.py        # Constantes y enums
│       │   └── logging.py
│       ├── schemas/
│       │   └── processing.py       # Pydantic models
│       ├── services/
│       │   ├── omr_processor.py    # 🔥 Lógica principal OMR
│       │   ├── image_utils.py      # Utilidades de imagen
│       │   └── image_validator.py  # Validación de calidad
│       └── main.py                 # Entry point FastAPI
│
└── front/                          # Frontend Expo/React Native
```

---

## 📡 API Endpoints

### 🌐 URLs de Producción

| Servicio                     | URL Base                                 |
| ---------------------------- | ---------------------------------------- |
| **API Gateway (Producción)** | `https://api-akdmia.scairpgroup.com/api` |
| **API Gateway (Local)**      | `http://localhost:3000/api`              |
| **OMR Processor (Local)**    | `http://localhost:8000`                  |

### API Gateway - Endpoints Disponibles

#### Health Check

```http
GET https://api-akdmia.scairpgroup.com/api/health
```

#### Exámenes

```http
GET    https://api-akdmia.scairpgroup.com/api/exams              # Listar exámenes
POST   https://api-akdmia.scairpgroup.com/api/exams              # Crear examen
GET    https://api-akdmia.scairpgroup.com/api/exams/:id          # Obtener examen
PUT    https://api-akdmia.scairpgroup.com/api/exams/:id          # Actualizar examen
DELETE https://api-akdmia.scairpgroup.com/api/exams/:id          # Eliminar examen
```

#### Estudiantes

```http
GET    https://api-akdmia.scairpgroup.com/api/students           # Listar estudiantes
POST   https://api-akdmia.scairpgroup.com/api/students           # Crear estudiante
POST   https://api-akdmia.scairpgroup.com/api/students/bulk      # Crear múltiples estudiantes
GET    https://api-akdmia.scairpgroup.com/api/students/:id       # Obtener estudiante
PUT    https://api-akdmia.scairpgroup.com/api/students/:id       # Actualizar estudiante
DELETE https://api-akdmia.scairpgroup.com/api/students/:id       # Eliminar estudiante
```

#### Procesamiento OMR

```http
POST   https://api-akdmia.scairpgroup.com/api/exams/:examId/answer-key           # Subir y procesar Answer Key (SÍNCRONO)
POST   https://api-akdmia.scairpgroup.com/api/exams/:examId/answer-key/confirm   # Confirmar Answer Key
POST   https://api-akdmia.scairpgroup.com/api/exams/:examId/students/:studentId/submit  # Enviar respuesta estudiante (ASYNC)
```

### OMR Processor Service (FastAPI) - Puerto 8000

> ⚠️ **Nota:** El OMR Processor es un servicio interno, no expuesto públicamente. El API Gateway se comunica con él internamente.

```http
GET    /health                      # Health check
POST   /api/processing/answer-key   # Procesar imagen de answer key
POST   /api/processing/student-answer   # Procesar respuesta de estudiante
POST   /api/processing/validate-image   # Validar calidad de imagen
POST   /api/processing/debug-detection  # Debug: guardar imágenes de proceso
```

---

## 🔄 Flujos de Procesamiento

### Flujo 1: Procesar Answer Key (SÍNCRONO)

```
┌─────────┐      ┌─────────────────┐      ┌─────────────┐      ┌──────────────┐
│ Cliente │──1──▶│  API Gateway    │──2──▶│   MinIO     │      │  FastAPI OMR │
│         │      │  (NestJS)       │      │ (Storage)   │      │  Processor   │
│         │      │                 │──3──────────────────────▶│              │
│         │◀──5──│                 │◀─4──────────────────────│              │
└─────────┘      └─────────────────┘      └─────────────┘      └──────────────┘

1. POST /api/exams/:examId/answer-key (multipart/form-data)
2. Subir imagen a MinIO (bucket: omr-images, prefix: answer-keys/)
3. HTTP POST a FastAPI /api/processing/answer-key
4. Resultado inmediato con respuestas detectadas
5. Respuesta al cliente con detectedAnswers[]
```

**Respuesta de Answer Key:**

```json
{
  "success": true,
  "examId": "uuid",
  "imageUrl": "http://minio:9000/bucket/key",
  "status": "completed",
  "detectedAnswers": [
    {"question_number": 1, "selected_option": 0, "selected_option_label": "A", "confidence_score": 0.95, "status": "detected"},
    {"question_number": 2, "selected_option": 2, "selected_option_label": "C", "confidence_score": 0.92, "status": "detected"}
  ],
  "confidenceScore": 0.94,
  "qualityScore": 0.85,
  "needsReview": false,
  "answerMatrix": [0, 2, 1, 3, ...]
}
```

### Flujo 2: Procesar Respuesta de Estudiante (ASÍNCRONO)

```
┌─────────┐      ┌─────────────────┐      ┌─────────────┐      ┌──────────────┐
│ Cliente │──1──▶│  API Gateway    │──2──▶│   MinIO     │      │              │
│         │      │  (NestJS)       │      │ (Storage)   │      │              │
│         │      │                 │──3─────────────────────▶│  RabbitMQ    │
│         │◀──4──│                 │      │             │      │              │
└─────────┘      └─────────────────┘      │             │      └──────┬───────┘
                                          │             │             │
                                          ▼             │             │
                                    ┌─────────────┐     │             │
                                    │  FastAPI    │◀────┴─────────────┘
                                    │ Consumer    │
                                    │(procesa)    │──▶ omr.results (cola)
                                    └─────────────┘

1. POST /api/exams/:examId/students/:studentId/submit
2. Subir imagen a MinIO (prefix: student-answers/)
3. Encolar mensaje en RabbitMQ (cola: omr.processing)
4. Respuesta inmediata con attemptId (status: pending)
5. Consumer procesa la imagen en background
6. Resultado publicado en cola omr.results
```

---

## 🔬 Algoritmo OMR - Detección de Burbujas

### Proceso Completo

```python
# Ubicación: omr-processor-service/app/services/omr_processor.py

class OMRProcessor:
    """Optimizado para fotos de cámara de teléfono."""

    def process_image(self, image_data: bytes, total_questions: int, options_per_question: int):
        # 1. Decodificar imagen
        original = cv2.imdecode(np_array, cv2.IMREAD_COLOR)

        # 2. Detectar región de respuestas (múltiples estrategias)
        answer_region = self._find_answer_region_smart(original)

        # 3. Preprocesamiento
        gray = cv2.cvtColor(answer_region, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        _, binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        # 4. Análisis de grid con detección por contraste relativo
        answers = self._analyze_grid(binary, gray, total_questions, options_per_question)

        return OMRResult(answers=answers, confidence_score=overall_confidence)
```

### Estrategias de Detección de Región

1. **Detección de Rectángulo Principal** (`_detect_main_rectangle`)

   - Usa `cv2.adaptiveThreshold` + `cv2.findContours`
   - Busca el contorno más grande con 4 esquinas
   - Aplica transformación de perspectiva

2. **Detección por Bordes** (`_detect_rectangle_by_edges`)

   - Usa Canny edge detection
   - Dilatación para conectar segmentos
   - Fallback si falla método 1

3. **Coordenadas Fijas** (Fallback)
   - Para imágenes calibradas específicamente

### Configuración del Grid (GIB D'Nivel)

```python
# Constantes de configuración
DEFAULT_COLUMNS: int = 3
DEFAULT_ROWS_PER_COLUMN: int = 30  # 90 preguntas / 3 = 30

GIB_DNIVEL_CONFIG = {
    "columns": 3,
    "rows_per_column": 30,
    "total_questions": 90,
    "options_per_question": 5,  # A, B, C, D, E
    "answer_area_top_percent": 0.35,
    "answer_area_bottom_percent": 0.98,
    "answer_area_left_percent": 0.50,
    "answer_area_right_percent": 0.98,
}
```

### Algoritmo de Detección por Contraste Relativo

```python
def _determine_answer_by_contrast(self, question_num: int, intensities: List[float]):
    """
    Determina la respuesta usando CONTRASTE RELATIVO.
    El bubble más oscuro se selecciona si es significativamente más oscuro que otros.
    """
    # Ordenar por intensidad (menor = más oscuro)
    sorted_opts = sorted(enumerate(intensities), key=lambda x: x[1])
    darkest_idx, darkest_val = sorted_opts[0]
    second_darkest_val = sorted_opts[1][1]

    # Métricas de contraste
    row_range = lightest_val - darkest_val  # Rango de intensidades
    contrast_to_second = second_darkest_val - darkest_val  # Contraste con segundo

    # Umbrales de decisión
    MIN_ROW_RANGE = 20   # Mín rango para considerar que hay marca
    MIN_CONTRAST = 10    # Mín contraste con segundo más oscuro

    if row_range < MIN_ROW_RANGE:
        return AnswerStatus.BLANK  # Todos similares = sin marcar

    if contrast_to_second < MIN_CONTRAST:
        return AnswerStatus.MULTIPLE  # Ambiguo/múltiple

    return AnswerStatus.DETECTED  # Detección clara
```

---

## 🗄️ Modelo de Datos (PostgreSQL)

### Diagrama ER

```
┌─────────────────────┐       ┌─────────────────────────┐
│       exams         │       │        students         │
├─────────────────────┤       ├─────────────────────────┤
│ id (UUID) PK        │       │ id (UUID) PK            │
│ title               │       │ code (UNIQUE)           │
│ description         │       │ full_name               │
│ total_questions     │       │ email                   │
│ answers_per_question│       │ status (ENUM)           │
│ exam_date           │       │ created_at              │
│ status (ENUM)       │       │ updated_at              │
│ answer_key (JSONB)  │       └─────────────────────────┘
│ answer_key_image_url│                      │
│ answer_key_confidence│                     │
│ answer_key_processed_at│                   │
│ created_at          │                      │
│ updated_at          │                      │
└──────────┬──────────┘                      │
           │                                 │
           │ 1:N                             │ 1:N
           ▼                                 ▼
┌─────────────────────────────────────────────────────────┐
│                    exam_attempts                         │
├─────────────────────────────────────────────────────────┤
│ id (UUID) PK                                             │
│ exam_id (FK) ─────────────────▶ exams.id                │
│ student_id (FK) ──────────────▶ students.id             │
│ image_url                                                │
│ processed_image_url                                      │
│ status (ENUM: pending|processing|completed|failed)       │
│ processed_at                                             │
│ score (DECIMAL)                                          │
│ total_correct                                            │
│ total_incorrect                                          │
│ total_blank                                              │
│ confidence_score (DECIMAL)                               │
│ created_at                                               │
│ updated_at                                               │
│ UNIQUE(exam_id, student_id)                             │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ 1:N
                      ▼
┌───────────────────────────────────────┐
│              answers                   │
├───────────────────────────────────────┤
│ id (UUID) PK                          │
│ attempt_id (FK) ──▶ exam_attempts.id  │
│ question_number                        │
│ selected_option                        │
│ is_correct                             │
│ status (ENUM)                          │
│ confidence_score                       │
│ created_at                             │
└───────────────────────────────────────┘
```

### Enums del Sistema

```typescript
// back/packages/shared-types/src/enums/

enum ExamStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  COMPLETED = "completed",
  ARCHIVED = "archived",
}

enum StudentStatus {
  REGISTERED = "registered",
  ACTIVE = "active",
  INACTIVE = "inactive",
}

enum ProcessingStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  NEEDS_REVIEW = "needs_review",
}

enum AnswerStatus {
  DETECTED = "detected",
  AMBIGUOUS = "ambiguous",
  BLANK = "blank",
  MULTIPLE = "multiple",
  INVALID = "invalid",
}
```

---

## 📨 Mensajería RabbitMQ

### Colas Configuradas

| Cola             | Tipo    | Propósito                                        |
| ---------------- | ------- | ------------------------------------------------ |
| `omr.processing` | Durable | Mensajes para procesar respuestas de estudiantes |
| `omr.results`    | Durable | Resultados del procesamiento                     |

### Estructura de Mensajes

#### ProcessStudentAnswerMessage (omr.processing)

```typescript
interface ProcessStudentAnswerMessage {
  attemptId: string;
  examId: string;
  studentId: string;
  imageUrl: string;
  answerKey: number[][]; // [[0], [2], [1], ...] - índices de respuestas correctas
  totalQuestions: number;
  optionsPerQuestion: number;
  timestamp: string; // ISO 8601
}
```

#### ProcessingResultMessage (omr.results)

```typescript
interface ProcessingResultMessage {
  attemptId: string;
  examId: string;
  studentId: string;
  success: boolean;
  score?: number;
  totalCorrect?: number;
  totalIncorrect?: number;
  totalBlank?: number;
  confidenceScore?: number;
  answers?: Array<{
    questionNumber: number;
    selectedOption?: number;
    correctOption: number;
    isCorrect: boolean;
    status: string;
    confidenceScore: number;
  }>;
  error?: { code: string; message: string };
  processedAt: string;
}
```

---

## ⚠️ Estados Actuales y TODOs

### Funcionalidades Implementadas ✅

- [x] Procesamiento de Answer Key (síncrono vía HTTP)
- [x] Validación de calidad de imagen
- [x] Detección de rectángulo con corrección de perspectiva
- [x] Detección por contraste relativo (robusto para fotos de cámara)
- [x] Upload de imágenes a MinIO/S3
- [x] Endpoint de debug para calibración visual
- [x] CRUD de exámenes y estudiantes
- [x] Integración RabbitMQ para procesamiento asíncrono

### Funcionalidades Pendientes (TODOs en código) ⏳

| Archivo                    | Línea | TODO                                                     |
| -------------------------- | ----- | -------------------------------------------------------- |
| `processing.service.ts`    | ~163  | Guardar answer key confirmado en BD                      |
| `processing.service.ts`    | ~238  | Consultar estado de procesamiento desde BD               |
| `processing.service.ts`    | ~254  | Consultar resultado desde BD                             |
| `processing.controller.ts` | ~154  | Obtener answerKey de BD (actualmente mock)               |
| `processing_consumer.py`   | ~126  | Descargar imagen de MinIO (actualmente simulado)         |
| `processing_consumer.py`   | ~138  | Usar OMRProcessor real (actualmente simulado con random) |

### Código Simulado/Mock 🔶

```python
# processing_consumer.py (líneas 147-177)
# Por ahora simula detección con random:

import random
for q in range(1, total_questions + 1):
    # Simular detección (en producción usar OMRProcessor)
    selected = random.randint(0, options_per_question - 1) if random.random() > 0.1 else None
    # ...
```

---

## 🔧 Configuración de Calibración OMR

### Parámetros Configurables (omr_processor.py)

```python
# Configuración del grid (Calibración v19)
CALIBRATION = {
    "num_columns": 3,
    "rows_per_column": 30,
    "bubble_area_start": 0.22,   # Inicio del área de burbujas (% del ancho de columna)
    "bubble_area_end": 0.98,     # Fin del área de burbujas
    "crop_top_percent": 0.02,    # Recorte del header
    "crop_bottom_percent": 0.01, # Recorte del footer
}

# Umbrales de detección
DETECTION_THRESHOLDS = {
    "MIN_ROW_RANGE": 20,         # Rango mínimo para detectar marca
    "MIN_CONTRAST": 10,          # Contraste mínimo con segundo más oscuro
    "FILL_THRESHOLD": 0.28,      # Umbral de llenado (método alternativo)
    "DIFF_THRESHOLD": 0.08,      # Diferencia mínima entre opciones
}
```

### Validación de Imagen

```python
# Constantes de validación (image_validator.py)
MIN_IMAGE_WIDTH = 800
MIN_IMAGE_HEIGHT = 1000
MAX_IMAGE_WIDTH = 4000
MAX_IMAGE_HEIGHT = 5000
BLUR_THRESHOLD = 100.0
MIN_QUALITY_SCORE = 0.7

# Score de calidad = (blur_score * 0.4) + (contrast_score * 0.35) + (brightness_score * 0.25)
```

---

## 🚀 Dependencias Externas Requeridas

### Para desarrollo local:

```bash
# 1. Iniciar infraestructura con Docker
cd back
docker-compose -f docker-compose.production.yml up -d postgres redis rabbitmq minio

# 2. Crear bucket en MinIO Console (http://localhost:9001)
#    Bucket: omr-images

# 3. Iniciar API Gateway
cd back
pnpm install
pnpm --filter @omr/api-gateway dev

# 4. Iniciar OMR Processor
cd omr-processor-service
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

## 📊 Performance Esperado

| Operación           | Tiempo | Notas                |
| ------------------- | ------ | -------------------- |
| Procesar Answer Key | ~500ms | Por imagen           |
| Validar imagen      | ~50ms  | Solo validación      |
| Upload a MinIO      | ~100ms | Depende del tamaño   |
| Detección OMR       | ~400ms | Procesamiento OpenCV |

### Recursos recomendados:

| Servicio      | RAM   | CPU    | Disco |
| ------------- | ----- | ------ | ----- |
| API Gateway   | 256MB | 1 core | -     |
| OMR Processor | 512MB | 1 core | -     |
| PostgreSQL    | 512MB | 1 core | 10GB  |
| MinIO         | 256MB | 1 core | 20GB  |
| RabbitMQ      | 256MB | 1 core | 1GB   |

---

## 🔐 Seguridad

### Implementado:

- ✅ Helmet.js en API Gateway
- ✅ CORS configurado
- ✅ Validación de entrada con class-validator y Pydantic
- ✅ Usuario no-root en contenedores Docker
- ✅ Swagger deshabilitado en producción
- ✅ Límite de tamaño de archivo (10MB por defecto)

### Configuración de CORS:

```typescript
// api-gateway: main.ts
CORS_ORIGIN: "*"; // Configurar para producción

// omr-processor: config.py
CORS_ORIGINS: ["http://localhost:3000", "http://localhost:3001"];
```

---

## 📚 Documentación de API

- **Swagger UI (API Gateway):** `http://localhost:3000/api/docs` (solo desarrollo)
- **Swagger UI (OMR Processor):** `http://localhost:8000/docs` (solo desarrollo)
- **ReDoc (OMR Processor):** `http://localhost:8000/redoc` (solo desarrollo)

---

## 📝 Notas Finales

1. **Monorepo Structure:** El backend usa pnpm workspaces + Turborepo para manejar paquetes compartidos (`@omr/database`, `@omr/shared-types`).

2. **Dual OMR Location:** Hay dos carpetas de OMR processor:

   - `back/apps/omr-processor/` → Solo cache Python, no se usa
   - `omr-processor-service/` → **Servicio real en producción**

3. **Calibración:** El sistema está calibrado para hojas GIB D'Nivel (3 columnas, 30 filas, 90 preguntas). Otros formatos requieren ajustar las constantes.

4. **Debug Mode:** Usar el endpoint `/api/processing/debug-detection` para generar imágenes de debug en `debug_output/` y verificar alineación del grid.
