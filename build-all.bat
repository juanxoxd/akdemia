@echo off
REM ==============================================
REM OMR Akdemia - Build Script (Windows)
REM ==============================================
REM Script para buildear todos los servicios localmente
REM Uso: build-all.bat
REM ==============================================

echo.
echo Building OMR Akdemia Services...
echo.

REM OMR Processor
echo Building OMR Processor...
cd omr-processor-service
docker build -t omr-processor:latest .
if %errorlevel% neq 0 exit /b %errorlevel%
echo OMR Processor built successfully
echo.
cd ..

REM API Gateway
echo Building API Gateway...
cd back
docker build -f Dockerfile.gateway -t api-gateway:latest .
if %errorlevel% neq 0 exit /b %errorlevel%
echo API Gateway built successfully
echo.
cd ..

REM Frontend
echo Building Frontend...
cd front
docker build -t omr-frontend:latest .
if %errorlevel% neq 0 exit /b %errorlevel%
echo Frontend built successfully
echo.
cd ..

echo.
echo All services built successfully!
echo.
echo Available images:
docker images | findstr /C:"omr-processor" /C:"api-gateway" /C:"omr-frontend"

pause
