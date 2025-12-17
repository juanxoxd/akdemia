# OMR Scanner - Mobile App

Aplicación móvil para escanear hojas ópticas de respuestas de exámenes mediante reconocimiento de marcas (OMR).

## Características

- 📷 Captura de imágenes con detección automática de esquinas
- 🔄 Corrección de perspectiva en tiempo real
- 📤 Envío al backend para procesamiento
- 📊 Visualización de resultados con estadísticas
- 💾 Persistencia local de datos del estudiante

## Requisitos

- Node.js 22+ LTS
- npm o yarn
- Expo CLI
- iOS 13+ o Android 8.0+

## Instalación

1. **Clonar el repositorio:**
```bash
cd omr-front
```

2. **Instalar dependencias:**
```bash
npm install
```

3. **Configurar variables de entorno:**
Crear archivo `.env` basado en `.env.example`:
```bash
cp .env.example .env
```

4. **Iniciar en modo desarrollo:**
```bash
npm start
```

## Variables de Entorno

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api
EXPO_PUBLIC_ENABLE_LOGS=true
EXPO_PUBLIC_MOCK_CAMERA=false
EXPO_PUBLIC_POLLING_INTERVAL=2000
EXPO_PUBLIC_MAX_POLLING_ATTEMPTS=30
```

## Estructura del Proyecto

```
omr-front/
├── app/                    # Pantallas (Expo Router)
│   ├── _layout.tsx         # Layout principal
│   ├── index.tsx           # Lista de exámenes
│   ├── exam/[examId].tsx   # Registro de estudiante
│   ├── capture.tsx         # Captura de imagen
│   ├── preview.tsx         # Vista previa
│   └── results.tsx         # Resultados
├── src/
│   ├── config/             # Configuración
│   ├── data/               # Capa de datos
│   │   └── api/            # Clientes API
│   ├── domain/             # Entidades del dominio
│   │   └── entities/       # Interfaces TypeScript
│   ├── presentation/       # Capa de presentación
│   │   ├── components/     # Componentes React
│   │   └── hooks/          # Custom hooks
│   └── store/              # Estado global (Zustand)
├── assets/                 # Assets estáticos
├── app.json                # Configuración Expo
└── package.json            # Dependencias
```

## Scripts Disponibles

```bash
# Desarrollo
npm start             # Inicia Expo Dev Server
npm run android       # Inicia en Android
npm run ios           # Inicia en iOS
npm run web           # Inicia en Web

# Testing y calidad
npm test              # Ejecuta tests
npm run lint          # Ejecuta ESLint
npm run format        # Formatea código con Prettier
```

## Módulos de la Aplicación

### Módulo 2: Gestión de Exámenes
- Listado de exámenes activos
- Selección de examen
- Formulario de registro de estudiante

### Módulo 3: Captura de Documento
- Activación de cámara
- Detección de esquinas en tiempo real
- Overlay visual de detección
- Captura manual y automática
- Corrección de perspectiva

### Módulo 4: Procesamiento y Envío
- Validación de imagen
- Compresión y optimización
- Upload con progress bar
- Manejo de errores y reintentos

### Módulo 5: Resultados
- Polling de resultados
- Score con gráfico circular
- Estadísticas por pregunta
- Detalle de respuestas

## Integración con Backend

La aplicación se conecta a los siguientes endpoints:

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/exams` | Lista de exámenes |
| POST | `/exams/:examId/students` | Registrar estudiante |
| POST | `/processing/exams/:examId/students/:studentId/submit` | Subir hoja |
| GET | `/processing/exams/:examId/students/:studentId/results` | Consultar resultados |

## Tecnologías

- **React Native** 0.73+ con TypeScript
- **Expo SDK** 52+
- **Expo Router** (navegación file-based)
- **Zustand** (estado global)
- **TanStack Query** (estado async)
- **NativeWind** (TailwindCSS)
- **Axios** (HTTP client)

## Build para Producción

### Android
```bash
npx eas build --platform android --profile production
```

### iOS
```bash
npx eas build --platform ios --profile production
```

## Licencia

MIT
