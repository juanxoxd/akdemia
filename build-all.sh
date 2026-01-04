#!/bin/bash

# ==============================================
# OMR Akdemia - Build Script
# ==============================================
# Script para buildear todos los servicios localmente
# Uso: ./build-all.sh
# ==============================================

set -e

echo "🚀 Building OMR Akdemia Services..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# OMR Processor
echo -e "${BLUE}📦 Building OMR Processor...${NC}"
cd omr-processor-service
docker build -t omr-processor:latest .
echo -e "${GREEN}✅ OMR Processor built successfully${NC}"
echo ""
cd ..

# API Gateway
echo -e "${BLUE}📦 Building API Gateway...${NC}"
cd back
docker build -f Dockerfile.gateway -t api-gateway:latest .
echo -e "${GREEN}✅ API Gateway built successfully${NC}"
echo ""
cd ..

# Frontend
echo -e "${BLUE}📦 Building Frontend...${NC}"
cd front
docker build -t omr-frontend:latest .
echo -e "${GREEN}✅ Frontend built successfully${NC}"
echo ""
cd ..

echo -e "${GREEN}🎉 All services built successfully!${NC}"
echo ""
echo "Available images:"
docker images | grep -E "omr-processor|api-gateway|omr-frontend"
