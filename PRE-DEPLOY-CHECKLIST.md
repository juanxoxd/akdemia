# ✅ Pre-Deploy Checklist - OMR Akdemia

Lista de verificación antes de desplegar en Dokploy.

## 📋 Antes de Empezar

### 1. Repositorio Git
- [ ] Código subido a repositorio Git (GitHub/GitLab/Bitbucket)
- [ ] Branch principal actualizado (`main` o `master`)
- [ ] Sin archivos `.env` en el repositorio
- [ ] `.gitignore` configurado correctamente

### 2. Revisión de Archivos
- [ ] `omr-processor-service/Dockerfile` existe
- [ ] `back/Dockerfile.gateway` existe
- [ ] `front/Dockerfile` existe
- [ ] Todos los `.env.example` están presentes
- [ ] `README.md` y `DEPLOY.md` actualizados

---

## 🏗️ Configuración de Infraestructura en Dokploy

### 3. PostgreSQL
- [ ] Servicio creado con imagen `postgres:15-alpine`
- [ ] Variable `POSTGRES_USER` configurada
- [ ] Variable `POSTGRES_PASSWORD` configurada (segura)
- [ ] Variable `POSTGRES_DB=omr_db` configurada
- [ ] Volume configurado en `/var/lib/postgresql/data`
- [ ] Health check funcionando

### 4. Redis
- [ ] Servicio creado con imagen `redis:7-alpine`
- [ ] Command: `redis-server --appendonly yes`
- [ ] Volume configurado en `/data`
- [ ] Health check funcionando

### 5. RabbitMQ
- [ ] Servicio creado con imagen `rabbitmq:3-management-alpine`
- [ ] Variable `RABBITMQ_DEFAULT_USER` configurada
- [ ] Variable `RABBITMQ_DEFAULT_PASS` configurada (segura)
- [ ] Volume configurado en `/var/lib/rabbitmq`
- [ ] Health check funcionando
- [ ] (Opcional) Puerto 15672 expuesto para management UI

### 6. MinIO
- [ ] Servicio creado con imagen `minio/minio:latest`
- [ ] Command: `server /data --console-address ":9001"`
- [ ] Variable `MINIO_ROOT_USER` configurada
- [ ] Variable `MINIO_ROOT_PASSWORD` configurada (segura)
- [ ] Volume configurado en `/data`
- [ ] Health check funcionando
- [ ] Bucket `omr-images` creado
- [ ] (Opcional) Puerto 9001 expuesto para console

---

## 🚀 Configuración de Aplicaciones en Dokploy

### 7. OMR Processor
- [ ] Servicio tipo: Git Repository
- [ ] Repositorio Git configurado
- [ ] Build Path: `omr-processor-service`
- [ ] Dockerfile Path: `omr-processor-service/Dockerfile`
- [ ] Puerto: 8000
- [ ] Variables de entorno configuradas:
  - [ ] `ENVIRONMENT=production`
  - [ ] `MINIO_ENDPOINT=<nombre-servicio-minio>`
  - [ ] `MINIO_ACCESS_KEY`
  - [ ] `MINIO_SECRET_KEY`
  - [ ] `MINIO_BUCKET=omr-images`
  - [ ] `RABBITMQ_URL=amqp://...@<nombre-servicio-rabbitmq>:5672/`
- [ ] Build exitoso
- [ ] Health check `/health` responde 200

### 8. API Gateway
- [ ] Servicio tipo: Git Repository
- [ ] Repositorio Git configurado
- [ ] Build Path: `back`
- [ ] Dockerfile Path: `back/Dockerfile.gateway`
- [ ] Puerto: 3000
- [ ] Variables de entorno configuradas:
  - [ ] `NODE_ENV=production`
  - [ ] `DB_HOST=<nombre-servicio-postgres>`
  - [ ] `DB_PASSWORD=<password-postgres>`
  - [ ] `DB_DATABASE=omr_db`
  - [ ] `REDIS_HOST=<nombre-servicio-redis>`
  - [ ] `RABBITMQ_URL=amqp://...@<nombre-servicio-rabbitmq>:5672`
  - [ ] `MINIO_ENDPOINT=<nombre-servicio-minio>`
  - [ ] `MINIO_ACCESS_KEY`
  - [ ] `MINIO_SECRET_KEY`
  - [ ] `OMR_PROCESSOR_URL=http://<nombre-servicio-omr>:8000`
  - [ ] `CORS_ORIGIN=<url-frontend>` o `*`
- [ ] Build exitoso
- [ ] Health check `/api/health` responde 200
- [ ] Swagger docs accesible en dev (`/api/docs`)

### 9. Frontend (Opcional - solo para web)
- [ ] Servicio tipo: Git Repository
- [ ] Repositorio Git configurado
- [ ] Build Path: `front`
- [ ] Dockerfile Path: `front/Dockerfile`
- [ ] Puerto: 8081
- [ ] Variables de entorno configuradas:
  - [ ] `EXPO_PUBLIC_API_BASE_URL=https://api.tu-dominio.com/api`
  - [ ] `EXPO_PUBLIC_ENABLE_LOGS=false`
  - [ ] `EXPO_PUBLIC_MOCK_API=false`
- [ ] Build exitoso
- [ ] App carga correctamente

---

## 🔗 Verificación de Conectividad

### 10. Red Interna
- [ ] Todos los servicios están en la misma red de Dokploy
- [ ] Ping entre servicios funciona
- [ ] DNS resolution funciona (nombres de servicio)

### 11. Conexiones Database
- [ ] API Gateway se conecta a PostgreSQL
- [ ] API Gateway se conecta a Redis
- [ ] No hay errores de autenticación en logs

### 12. Conexiones Storage
- [ ] API Gateway se conecta a MinIO
- [ ] OMR Processor se conecta a MinIO
- [ ] Bucket `omr-images` es accesible

### 13. Conexiones Queue
- [ ] API Gateway se conecta a RabbitMQ
- [ ] OMR Processor se conecta a RabbitMQ
- [ ] Consumer está corriendo (si `ENABLE_CONSUMER=true`)

### 14. Conexiones Inter-Service
- [ ] API Gateway puede llamar a OMR Processor
- [ ] Timeout configurado correctamente
- [ ] Retry logic funcionando

---

## 🌐 Configuración de Dominio (Opcional)

### 15. SSL/HTTPS
- [ ] Certificado SSL configurado
- [ ] HTTP a HTTPS redirect habilitado
- [ ] Frontend usa HTTPS

### 16. DNS
- [ ] Dominio apunta a Dokploy
- [ ] Subdominios configurados (api., app., etc.)
- [ ] DNS propagado (puede tomar hasta 48h)

---

## 🔐 Seguridad

### 17. Passwords y Secrets
- [ ] Todas las contraseñas cambiadas de defaults
- [ ] Passwords son fuertes (12+ caracteres, mezcla)
- [ ] No hay secrets en repositorio Git
- [ ] No hay secrets en logs

### 18. CORS
- [ ] CORS configurado correctamente en API Gateway
- [ ] Frontend puede hacer requests al backend
- [ ] No hay errores CORS en console

### 19. Exposición de Puertos
- [ ] Solo puertos necesarios son públicos (3000, 8081)
- [ ] Puertos de infraestructura son privados (5432, 6379, etc.)
- [ ] Management UIs solo accesibles si necesario

### 20. Usuarios
- [ ] Containers corren como non-root user
- [ ] Permisos de archivos correctos

---

## 📊 Monitoreo y Logs

### 21. Health Checks
- [ ] Health checks configurados en todos los servicios
- [ ] Health checks pasan en Dokploy
- [ ] Interval y timeout configurados apropiadamente

### 22. Logs
- [ ] Logs son legibles y útiles
- [ ] Log level configurado (`INFO` en prod)
- [ ] No hay errores en logs de inicio

### 23. Resources
- [ ] Memoria asignada es suficiente
- [ ] CPU asignada es suficiente
- [ ] Disco tiene espacio suficiente

---

## 🧪 Testing

### 24. Pruebas Básicas
- [ ] Frontend carga sin errores
- [ ] Puedo hacer login (si aplica)
- [ ] Puedo subir una imagen OMR
- [ ] Imagen se procesa correctamente
- [ ] Resultados se guardan en DB
- [ ] Resultados se muestran en frontend

### 25. Pruebas de Integración
- [ ] Upload → Processing → Storage funciona end-to-end
- [ ] Múltiples uploads simultáneos funcionan
- [ ] Manejo de errores funciona (imagen inválida, etc.)

### 26. Performance
- [ ] Response time es aceptable (<2s)
- [ ] No hay memory leaks
- [ ] CPU usage es normal

---

## 📦 Backups y Recovery

### 27. Backup Strategy
- [ ] Backups de PostgreSQL configurados
- [ ] Backups de MinIO configurados
- [ ] Frecuencia de backup definida
- [ ] Retention policy definida

### 28. Disaster Recovery
- [ ] Plan de recuperación documentado
- [ ] Backup restoration probado
- [ ] Rollback plan definido

---

## 📝 Documentación

### 29. Documentación Técnica
- [ ] `DEPLOY.md` actualizado
- [ ] Variables de entorno documentadas
- [ ] Arquitectura documentada
- [ ] Troubleshooting documentado

### 30. Documentación de Usuario
- [ ] Manual de usuario (si aplica)
- [ ] API documentation accesible
- [ ] Ejemplos de uso disponibles

---

## ✨ Post-Deploy

### 31. Validación Final
- [ ] Todos los servicios están running
- [ ] Todos los health checks pasan
- [ ] Frontend es accesible
- [ ] API responde correctamente
- [ ] Procesamiento OMR funciona

### 32. Notificaciones
- [ ] Equipo notificado del deploy
- [ ] Usuarios notificados (si aplica)
- [ ] Monitoreo activado

### 33. Runbook
- [ ] Procedimiento de deploy documentado
- [ ] Contactos de emergencia definidos
- [ ] Procedimientos de rollback listos

---

## 🎉 Deploy Completado!

Si todos los items están marcados, tu deploy está listo! 🚀

### Siguientes pasos:
1. Monitorear logs por 24-48 horas
2. Estar disponible para soporte
3. Documentar cualquier issue encontrado
4. Celebrar! 🎊

---

**Notas**:
- No todos los items son obligatorios dependiendo de tu setup
- La sección de Frontend (#9) es opcional si solo despliegas backend
- Adapta este checklist a tus necesidades específicas
