# 📝 Sistema OMR - Documentación Completa

**Última actualización:** 2025-12-17  
**Estado:** ✅ Fase 1 y 2 IMPLEMENTADAS

---

## 📑 Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Arquitectura](#arquitectura)
3. [Requisitos](#requisitos)
4. [Instalación y Configuración](#instalación-y-configuración)
5. [Cómo Ejecutar](#cómo-ejecutar)
6. [API Endpoints](#api-endpoints)
7. [Procesamiento OMR](#procesamiento-omr)
8. [Hoja GIB D'Nivel](#hoja-gib-dnivel)
9. [Pruebas con cURL](#pruebas-con-curl)
10. [Troubleshooting](#troubleshooting)
11. [Implementación Técnica](#implementación-técnica)

---

## 📋 Descripción General

Sistema de Reconocimiento Óptico de Marcas (OMR) para procesar hojas de respuestas de exámenes. Detecta automáticamente las burbujas marcadas y extrae las respuestas.

### Flujos Principales

```
┌─────────────────────────────────────────────────────────────────┐
│ FLUJO 1: Answer Key (HTTP Síncrono)                             │
│                                                                 │
│ Usuario → POST /api/exams/:examId/answer-key                   │
│         → API Gateway sube imagen a MinIO                      │
│         → API Gateway llama a OMR Processor (HTTP)             │
│         → OMR Processor detecta respuestas con OpenCV          │
│         → Retorna respuestas detectadas al usuario             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ FLUJO 2: Student Answers (Asíncrono con RabbitMQ)              │
│                                                                 │
│ Usuario → POST /api/exams/:examId/students/:studentId/submit   │
│         → API Gateway sube imagen a MinIO                      │
│         → API Gateway encola mensaje en RabbitMQ               │
│         → Usuario recibe attemptId inmediatamente              │
│         → [Background] OMR Processor consume cola              │
│         → [Background] Procesa y compara con Answer Key        │
│         → [Background] Publica resultado                       │
└─────────────────────────────────────────────────────────────────┘
```

---

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

### Estructura del Proyecto

```
back/
├── apps/
│   ├── api-gateway/              # NestJS - API principal
│   │   └── src/
│   │       ├── exams/            # CRUD de exámenes
│   │       ├── processing/       # Procesamiento OMR
│   │       └── infrastructure/   # S3, RabbitMQ
│   │
│   └── omr-processor/            # Python/FastAPI - Procesamiento
│       └── app/
│           ├── api/endpoints/    # Endpoints FastAPI
│           ├── core/             # Constantes, config
│           ├── services/         # OMRProcessor, ImageValidator
│           └── schemas/          # Modelos Pydantic
│
├── packages/
│   ├── database/                 # Entidades TypeORM
│   └── shared-types/             # Tipos compartidos
│
├── docker/
│   └── docker-compose.yml        # Infraestructura
│
└── docs/
    └── OMR_SYSTEM.md            # Esta documentación
```

---

## ⚙️ Requisitos

### Software Requerido

| Software       | Versión Mínima | Verificar                |
| -------------- | -------------- | ------------------------ |
| Node.js        | >= 18.x        | `node --version`         |
| pnpm           | >= 8.x         | `pnpm --version`         |
| Python         | >= 3.11        | `python --version`       |
| Docker         | Latest         | `docker --version`       |
| Docker Compose | Latest         | `docker compose version` |

### Puertos Utilizados

| Puerto | Servicio                |
| ------ | ----------------------- |
| 3000   | API Gateway (NestJS)    |
| 8000   | OMR Processor (FastAPI) |
| 5432   | PostgreSQL              |
| 6379   | Redis                   |
| 5672   | RabbitMQ (AMQP)         |
| 15672  | RabbitMQ Management     |
| 9000   | MinIO API               |
| 9001   | MinIO Console           |

---

## 🚀 Instalación y Configuración

### Paso 1: Instalar Dependencias de Node.js

```bash
cd c:\Users\JD\Documents\GitHub\akdemia\back
pnpm install
```

### Paso 2: Configurar Variables de Entorno

```bash
# Copiar archivo de ejemplo
copy .env.example .env
```

Editar `.env` con los valores necesarios (los defaults funcionan para desarrollo):

```env
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=omr_db
REDIS_HOST=localhost
REDIS_PORT=6379
RABBITMQ_URL=amqp://guest:guest@localhost:5672
OMR_PROCESSOR_URL=http://localhost:8000
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

### Paso 3: Configurar OMR Processor (Python)

```bash
cd apps/omr-processor

# Crear entorno virtual
python -m venv venv

# Activar entorno (Windows)
.\venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt
```

**Dependencias de Python:**

- FastAPI
- uvicorn
- opencv-python
- numpy
- Pillow
- structlog
- pydantic

---

## ▶️ Cómo Ejecutar

### Opción A: Solo OMR (Sin Docker)

Para pruebas rápidas del procesamiento de imágenes:

**Terminal 1 - API Gateway:**

```bash
cd c:\Users\JD\Documents\GitHub\akdemia\back
pnpm dev:gateway
```

**Terminal 2 - OMR Processor:**

```bash
cd c:\Users\JD\Documents\GitHub\akdemia\back\apps\omr-processor
.\venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

> ⚠️ **Nota:** Verás un warning de RabbitMQ, se puede ignorar para pruebas básicas.

### Opción B: Stack Completo (Con Docker)

**Terminal 1 - Infraestructura:**

```bash
cd c:\Users\JD\Documents\GitHub\akdemia\back
pnpm docker:up
```

Esperar a que todos los servicios estén healthy (~30 segundos).

**Terminal 2 - API Gateway:**

```bash
pnpm dev:gateway
```

**Terminal 3 - OMR Processor:**

```bash
cd apps/omr-processor
.\venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

### Verificar que Todo Funciona

| Servicio      | URL                              | Esperado                      |
| ------------- | -------------------------------- | ----------------------------- |
| API Gateway   | http://localhost:3000/api/health | `{"status":"ok"}`             |
| Swagger Docs  | http://localhost:3000/api/docs   | UI de Swagger                 |
| OMR Processor | http://localhost:8000/health     | `{"status":"healthy"}`        |
| OMR Docs      | http://localhost:8000/docs       | UI de FastAPI                 |
| MinIO Console | http://localhost:9001            | Login (minioadmin/minioadmin) |
| RabbitMQ      | http://localhost:15672           | Login (guest/guest)           |

---

## 📡 API Endpoints

### Exámenes (CRUD)

| Método   | Endpoint                    | Descripción       |
| -------- | --------------------------- | ----------------- |
| `POST`   | `/api/exams/start`          | Crear examen      |
| `GET`    | `/api/exams`                | Listar exámenes   |
| `GET`    | `/api/exams/:id`            | Obtener examen    |
| `PUT`    | `/api/exams/:id`            | Actualizar examen |
| `DELETE` | `/api/exams/:id`            | Eliminar examen   |
| `GET`    | `/api/exams/:id/statistics` | Estadísticas      |

### Procesamiento OMR

| Método | Endpoint                                        | Descripción                                   |
| ------ | ----------------------------------------------- | --------------------------------------------- |
| `POST` | `/api/exams/:examId/answer-key`                 | Subir y procesar hoja de respuestas correctas |
| `POST` | `/api/exams/:examId/answer-key/confirm`         | Confirmar respuestas procesadas               |
| `POST` | `/api/exams/:examId/students/:studentId/submit` | Enviar hoja de estudiante                     |

### OMR Processor (FastAPI - Puerto 8000)

| Método | Endpoint                         | Descripción                   |
| ------ | -------------------------------- | ----------------------------- |
| `POST` | `/api/processing/answer-key`     | Procesar imagen de Answer Key |
| `POST` | `/api/processing/student-answer` | Procesar imagen de estudiante |
| `POST` | `/api/processing/validate-image` | Validar calidad de imagen     |
| `GET`  | `/health`                        | Health check                  |

---

## 🔍 Procesamiento OMR

### Pipeline de Procesamiento

```
1. RECEPCIÓN
   └─ Imagen (JPEG/PNG/TIFF)

2. VALIDACIÓN
   ├─ Tamaño mínimo: 800x1000px
   ├─ Tamaño máximo: 4000x5000px
   └─ Formatos: jpg, jpeg, png, tiff

3. DETECCIÓN DE REGIÓN (Opción A - Contornos)
   ├─ Convertir a escala de grises
   ├─ Aplicar Gaussian blur
   ├─ Detección de bordes (Canny)
   ├─ Encontrar contornos rectangulares
   └─ Recortar área de respuestas

4. PREPROCESAMIENTO
   ├─ Escala de grises
   ├─ Gaussian blur (reducir ruido)
   ├─ Umbralización adaptativa (binarización)
   └─ Operaciones morfológicas (limpieza)

5. DETECCIÓN DE GRID
   ├─ Calcular layout de columnas
   ├─ Calcular posición de cada pregunta
   └─ Calcular posición de cada burbuja

6. ANÁLISIS DE MARCAS
   Para cada pregunta:
   ├─ Extraer región de cada burbuja
   ├─ Calcular ratio de relleno
   ├─ Determinar burbuja más marcada
   └─ Clasificar: DETECTED, BLANK, AMBIGUOUS, MULTIPLE

7. RESULTADOS
   └─ Array de respuestas con confidence score
```

### Umbrales de Detección

```python
MARK_DETECTION_THRESHOLD = 0.65   # Mínimo para considerar marcada
CONFIDENCE_THRESHOLD = 0.85       # Mínimo para alta confianza
AMBIGUITY_THRESHOLD = 0.40        # Máximo para considerar en blanco
```

### Estados de Respuesta

| Estado      | Descripción                             |
| ----------- | --------------------------------------- |
| `DETECTED`  | Respuesta detectada con alta confianza  |
| `AMBIGUOUS` | Marca detectada pero con baja confianza |
| `BLANK`     | Sin marca detectada                     |
| `MULTIPLE`  | Múltiples marcas detectadas             |
| `INVALID`   | Error en la detección                   |

---

## 📄 Hoja GIB D'Nivel

### Características

| Característica            | Valor                |
| ------------------------- | -------------------- |
| **Nombre**                | GIB D'Nivel Academia |
| **Total preguntas**       | 90                   |
| **Opciones por pregunta** | 5 (A, B, C, D, E)    |
| **Layout**                | 3 columnas           |
| **Columna 1**             | Preguntas 1-30       |
| **Columna 2**             | Preguntas 31-60      |
| **Columna 3**             | Preguntas 61-90      |

### Estructura de la Hoja

```
┌─────────────────────────────────────────────────────┐
│  ┌───────────────────┐  ┌────────────────────────┐ │
│  │ Logo GIB D'Nivel  │  │  HOJA DE RESPUESTAS   │ │
│  │ Datos del Alumno  │  │                        │ │
│  │ - Apellido Paterno │  │  1. ⓐⒷⒸⒹⒺ  31. ...  │ │
│  │ - Apellido Materno │  │  2. ⒶⓑⒸⒹⒺ  32. ...  │ │
│  │ - Nombres          │  │  3. ⒶⒷⒸⓓⒺ  33. ...  │ │
│  │ - Carrera          │  │  ...                   │ │
│  │ - Fecha            │  │  30. ...   60. ... 90. │ │
│  │ - Firma            │  │                        │ │
│  ├───────────────────┤  │  Col1 | Col2 | Col3    │ │
│  │ "USE SOLO LÁPIZ"  │  │                        │ │
│  ├───────────────────┤  └────────────────────────┘ │
│  │ CÓDIGO DEL ALUMNO │                             │
│  │ ⓪①②③④⑤⑥⑦⑧⑨ │                             │
│  └───────────────────┘                             │
└─────────────────────────────────────────────────────┘
```

### Configuración en el Sistema

```python
# En constants.py
GIB_DNIVEL_CONFIG = {
    "columns": 3,
    "rows_per_column": 30,
    "total_questions": 90,
    "options_per_question": 5,
    "answer_area_top_percent": 0.35,
    "answer_area_bottom_percent": 0.98,
    "answer_area_left_percent": 0.50,
    "answer_area_right_percent": 0.98,
}
```

---

## 🧪 Pruebas con cURL

### 1. Health Check

```bash
# API Gateway
curl http://localhost:3000/api/health

# OMR Processor
curl http://localhost:8000/health
```

### 2. Crear Examen

```bash
curl -X POST http://localhost:3000/api/exams/start ^
  -H "Content-Type: application/json" ^
  -d "{\"examTitle\": \"Examen GIB DNivel\", \"totalQuestions\": 90, \"answersPerQuestion\": 5, \"examDate\": \"2025-12-20\"}"
```

**Respuesta:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Examen GIB DNivel",
  "totalQuestions": 90,
  "answersPerQuestion": 5,
  "examDate": "2025-12-20",
  "status": "draft"
}
```

### 3. Subir Answer Key (Imagen)

```bash
curl -X POST http://localhost:3000/api/exams/{examId}/answer-key ^
  -F "file=@C:\ruta\a\hoja_respuestas.jpg" ^
  -F "totalQuestions=90" ^
  -F "optionsPerQuestion=5"
```

**Respuesta:**

```json
{
  "success": true,
  "examId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "detectedAnswers": [
    {
      "question_number": 1,
      "selected_option": 0,
      "selected_option_label": "A",
      "confidence_score": 0.95
    },
    {
      "question_number": 2,
      "selected_option": 3,
      "selected_option_label": "D",
      "confidence_score": 0.92
    },
    {
      "question_number": 3,
      "selected_option": 4,
      "selected_option_label": "E",
      "confidence_score": 0.88
    }
    // ... 90 respuestas
  ],
  "confidenceScore": 0.91,
  "warnings": []
}
```

### 4. Probar OMR Processor Directamente

```bash
curl -X POST http://localhost:8000/api/processing/answer-key ^
  -F "file=@C:\ruta\a\hoja_respuestas.jpg" ^
  -F "exam_id=test-123" ^
  -F "total_questions=90" ^
  -F "options_per_question=5"
```

### 5. Validar Imagen

```bash
curl -X POST http://localhost:8000/api/processing/validate-image ^
  -F "file=@C:\ruta\a\imagen.jpg"
```

---

## 🔧 Troubleshooting

### Error: "No se pudo conectar a RabbitMQ"

```
WARN [ResultsConsumer] ⚠️ No se pudo conectar a RabbitMQ:
```

**Causa:** Docker no está ejecutándose o RabbitMQ no está corriendo.

**Solución:**

```bash
pnpm docker:up
```

> Para pruebas básicas del OMR, puedes ignorar este warning.

### Error: "turbo no se reconoce"

```
"turbo" no se reconoce como un comando interno o externo
```

**Causa:** Dependencias no instaladas correctamente.

**Solución:**

```bash
pnpm install
```

### Error: "node_modules missing"

```
WARN Local package.json exists, but node_modules missing
```

**Causa:** Usaste `npm` en lugar de `pnpm`.

**Solución:**

```bash
pnpm install  # NO usar npm install
```

### Error: Python no encuentra módulos

```
ModuleNotFoundError: No module named 'cv2'
```

**Causa:** Entorno virtual no activado o dependencias no instaladas.

**Solución:**

```bash
cd apps/omr-processor
.\venv\Scripts\activate
pip install -r requirements.txt
```

### Error: Puerto en uso

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solución:** Cerrar el proceso que usa el puerto o usar otro:

```bash
# Encontrar proceso
netstat -ano | findstr :3000

# Matar proceso
taskkill /PID <PID> /F
```

---

## 💻 Implementación Técnica

### Archivos Modificados (Fase 1 y 2)

| Archivo                                                 | Descripción                               |
| ------------------------------------------------------- | ----------------------------------------- |
| `apps/omr-processor/app/core/constants.py`              | Constantes para layout multi-columna      |
| `apps/omr-processor/app/services/omr_processor.py`      | Procesador OMR con detección de contornos |
| `apps/omr-processor/app/api/endpoints/processing.py`    | Logging formateado en FastAPI             |
| `apps/api-gateway/src/processing/processing.service.ts` | Logging formateado en NestJS              |

### Clase OMRProcessor

```python
class OMRProcessor:
    """
    Procesador OMR con soporte multi-columna.

    Métodos principales:
    - process_image(): Procesa imagen y retorna respuestas
    - _detect_answer_region(): Detecta área de respuestas (contornos)
    - _preprocess_image(): Preprocesa para detección
    - _detect_bubble_grid_multicolumn(): Calcula grid de burbujas
    - _analyze_question_multicolumn(): Analiza una pregunta
    """
```

### Output del Logger

Cuando procesas una imagen, verás en la terminal:

```
════════════════════════════════════════════════════════════════════════
ANSWER KEY PROCESADO - Examen: 550e8400-e29b-41d4-a716-446655440000
════════════════════════════════════════════════════════════════════════
1:A | 2:D | 3:E | 4:E | 5:C | 6:B | 7:A | 8:B | 9:A | 10:A
11:B | 12:B | 13:A | 14:A | 15:A | 16:A | 17:C | 18:A | 19:C | 20:B
21:A | 22:B | 23:A | 24:A | 25:A | 26:A | 27:A | 28:B | 29:A | 30:C
... (todas las 90 respuestas)
════════════════════════════════════════════════════════════════════════
Total: 90 respuestas | Confidence: 85.0% | Time: 234ms
════════════════════════════════════════════════════════════════════════
```

---

## 📝 TODOs (Próximas Fases)

- [ ] **Fase 3:** Persistir Answer Key en base de datos
- [ ] **Fase 4:** Comparar respuestas de estudiantes vs Answer Key
- [ ] **Fase 5:** Calcular puntajes automáticamente
- [ ] **Fase 6:** Reportes y estadísticas
- [ ] **Fase 7:** UI web para subir hojas

---

## 📚 Referencias

- [OpenCV Documentation](https://docs.opencv.org/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [MinIO Documentation](https://min.io/docs/)

---

_Documentación generada y mantenida para el proyecto Akdemia OMR System_
