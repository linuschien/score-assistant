#!/usr/bin/env bash
# ==============================================================================
# DevOps Pipeline: Frontend & Backend Unified Packager & Docker Image Builder
# ==============================================================================
set -euo pipefail

# 1. Resolve Directories (4 levels up from .agents/skills/docker-image-builder/scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"

FRONTEND_DIR="${WORKSPACE_ROOT}/engineers/03-implementations/frontend"
BACKEND_DIR="${WORKSPACE_ROOT}/engineers/03-implementations/backend"
DEVOPS_DIR="${WORKSPACE_ROOT}/engineers/03-implementations/devops"

echo "======================================================================"
echo "🚀 DevOps Pipeline: Initiating Secure Containerization Build"
echo "   Workspace Root: ${WORKSPACE_ROOT}"
echo "======================================================================"

# 2. Frontend Compilation
echo ""
echo "--- 📦 Step 1: Compiling Frontend (React / Vite) ---"
if [ ! -d "${FRONTEND_DIR}/node_modules" ]; then
  echo "Node modules missing. Installing dependencies first..."
  cd "${FRONTEND_DIR}"
  npm install
fi
cd "${FRONTEND_DIR}"
npm run build
echo "✅ Frontend built successfully."

# 3. Integrate Frontend Assets into Backend
echo ""
echo "--- 🔄 Step 2: Injecting Static UI Assets into Spring Boot ---"
STATIC_DIR="${BACKEND_DIR}/src/main/resources/static"
mkdir -p "${STATIC_DIR}"

echo "Copying compiled UI assets to Spring static resource location..."
cp -r "${FRONTEND_DIR}/dist"/* "${STATIC_DIR}/"
echo "✅ UI assets successfully unified into Spring Boot backend resource path."

# 4. Backend Packaging
echo ""
echo "--- ☕ Step 3: Packaging Spring Boot Reactive Fat JAR ---"
cd "${BACKEND_DIR}"
# Build jar and skip tests for fast pipeline iteration
mvn clean package -DskipTests
echo "✅ Spring Boot backend JAR compiled successfully."

# 5. Move JAR to DevOps Build Context
echo ""
echo "--- 🚚 Step 4: Transferring Artifact to DevOps Context ---"
# Clear any existing stale JARs in devops directory
rm -f "${DEVOPS_DIR}"/*.jar

JAR_FILE="${BACKEND_DIR}/target/score-assistant-backend-1.0.0-SNAPSHOT.jar"
if [ ! -f "${JAR_FILE}" ]; then
  echo "❌ Error: Could not locate packaged JAR file at ${JAR_FILE}!"
  exit 1
fi

echo "Copying ${JAR_FILE} to ${DEVOPS_DIR}..."
cp "${JAR_FILE}" "${DEVOPS_DIR}/score-assistant-backend-1.0.0-SNAPSHOT.jar"
echo "✅ Artifact successfully placed in build context."

# 6. Docker Build
echo ""
echo "--- 🐳 Step 5: Building Secure, Lightweight Docker Image ---"
cd "${DEVOPS_DIR}"

# Generate dynamic build tag (Timestamp + Git Short SHA)
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "no-git")
TAG="${TIMESTAMP}-${GIT_SHA}"

echo "Building local docker images with tags 'score-assistant:${TAG}' and 'score-assistant:latest'..."
docker build -t "score-assistant:${TAG}" -t score-assistant:latest .
echo "✅ Docker Images built successfully."

# 7. Post-Build Cleanup
echo ""
echo "--- 🧹 Step 6: Post-Build Workspace Sanitization ---"
rm -f "${DEVOPS_DIR}/score-assistant-backend-1.0.0-SNAPSHOT.jar"
echo "Cleaning static directory: ${STATIC_DIR}"
rm -rf "${STATIC_DIR}"
echo "✅ Transient build JAR and static assets removed. Workspace remains clean."

echo ""
echo "======================================================================"
echo "🎉 DevOps Pipeline: Successfully Containerized Score Assistant!"
echo "   Image Tags: score-assistant:${TAG}"
echo "               score-assistant:latest"
echo "======================================================================"
