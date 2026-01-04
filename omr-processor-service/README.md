# OMR Processor Service

Servicio de procesamiento de hojas ópticas (Optical Mark Recognition) usando Python, FastAPI y OpenCV.

## 🏗️ Arquitectura

- **Framework**: FastAPI
- **Procesamiento**: OpenCV + NumPy
- **Storage**: MinIO (S3-compatible)
- **Queue**: RabbitMQ (opcional)
- **Logging**: Structlog

## 🚀 Despliegue Rápido

### Opción 1: Docker (Recomendado)

```bash
# Build
docker build -t omr-processor .

# Run
docker run -p 8000:8000 \
  -e MINIO_ENDPOINT=minio \
  -e MINIO_ACCESS_KEY=minioadmin \
  -e MINIO_SECRET_KEY=password \
  omr-processor
```

### Opción 2: Desarrollo Local

```bash
# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# o
.\venv\Scripts\activate  # Windows

# Instalar dependencias
pip install -r requirements.txt

# Copiar variables de entorno
cp .env.example .env

# Ejecutar servidor
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 📦 Deploy en Dokploy

### Configuración en Dokploy

| Campo | Valor |
|-------|-------|
| **Tipo** | Git Repository |
| **Build Path** | `omr-processor-service` |
| **Dockerfile Path** | `omr-processor-service/Dockerfile` |
| **Puerto** | `8000` |

### Variables de Entorno Requeridas

```env
# Application
ENVIRONMENT=production
HOST=0.0.0.0
PORT=8000

# MinIO (usar nombre del servicio en Dokploy)
MINIO_ENDPOINT=omr-minio-service
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=your-secure-password
MINIO_BUCKET=omr-images
MINIO_USE_SSL=false

# RabbitMQ (opcional)
RABBITMQ_URL=amqp://guest:password@omr-rabbitmq-service:5672/
ENABLE_CONSUMER=true

# Logging
LOG_LEVEL=INFO
```

## 📡 API Endpoints

### Health Check
```bash
GET /health
```

**Respuesta:**
```json
{
  "status": "healthy",
  "service": "OMR Processor",
  "version": "1.0.0"
}
```

### Procesar Imagen OMR
```bash
POST /api/v1/process
Content-Type: multipart/form-data

{
  "file": <imagen>,
  "template_type": "type-a",
  "num_questions": 50
}
```

### Documentación Completa
- **Swagger UI**: `http://localhost:8000/docs` (solo dev)
- **ReDoc**: `http://localhost:8000/redoc` (solo dev)

## 🔧 Desarrollo

### Estructura del Proyecto
```
omr-processor-service/
├── app/
│   ├── api/          # Endpoints de FastAPI
│   ├── consumers/    # RabbitMQ consumers
│   ├── core/         # Config, logging, constants
│   ├── schemas/      # Pydantic schemas
│   ├── services/     # Lógica de negocio
│   └── main.py       # Entry point
├── Dockerfile
├── requirements.txt
└── .env.example
```

### Tests
```bash
pytest
pytest --cov=app tests/
```

### Linting
```bash
ruff check app/
black app/
```

## 🔗 Dependencias Externas

Este servicio requiere:

- **MinIO**: Almacenamiento de imágenes (requerido)
- **RabbitMQ**: Cola de mensajes (opcional)

## 🛠️ Troubleshooting

### Error: "Cannot connect to MinIO"
```bash
# Verificar que MinIO esté corriendo
curl http://minio:9000/minio/health/live

# Verificar credenciales en .env
echo $MINIO_ENDPOINT
echo $MINIO_ACCESS_KEY
```

### Error: "Module not found"
```bash
# Reinstalar dependencias
pip install -r requirements.txt --force-reinstall
```

### Build de Docker falla
```bash
# Limpiar cache
docker system prune -af

# Build sin cache
docker build --no-cache -t omr-processor .
```

## 📊 Performance

- **Tiempo de procesamiento**: ~500ms por imagen
- **Memoria requerida**: ~256MB-512MB
- **CPU**: 1 core recomendado

## 🔐 Seguridad

- Aplicación corre como usuario no-root (UID 1000)
- No se exponen documentos Swagger en producción
- Validación de entrada con Pydantic
- Health checks configurados

## 📝 Notas

- Las imágenes se procesan en memoria, no se almacenan localmente
- Los resultados se retornan como JSON
- Las imágenes originales se guardan en MinIO para auditoría
