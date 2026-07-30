#!/usr/bin/env bash
# Build and push backend/frontend images to GitLab Container Registry.
set -euo pipefail

SOURCE_DIR="${CI_PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$SOURCE_DIR"

: "${CI_REGISTRY:?CI_REGISTRY is required}"
: "${CI_REGISTRY_IMAGE:?CI_REGISTRY_IMAGE is required}"
: "${CI_REGISTRY_USER:?CI_REGISTRY_USER is required}"
: "${CI_REGISTRY_PASSWORD:?CI_REGISTRY_PASSWORD is required}"
: "${CI_COMMIT_SHA:?CI_COMMIT_SHA is required}"

SHORT_SHA="${CI_COMMIT_SHORT_SHA:-${CI_COMMIT_SHA:0:8}}"
MOVABLE_TAG="main"
if [[ -n "${CI_COMMIT_TAG:-}" ]]; then
  MOVABLE_TAG="$CI_COMMIT_TAG"
elif [[ -n "${CI_COMMIT_REF_SLUG:-}" && "${CI_COMMIT_BRANCH:-}" != "main" ]]; then
  MOVABLE_TAG="$CI_COMMIT_REF_SLUG"
fi

NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://lessons.samoh.ru}"
NEXT_PUBLIC_MAX_VIDEO_SIZE_MB="${NEXT_PUBLIC_MAX_VIDEO_SIZE_MB:-${MAX_VIDEO_SIZE_MB:-5000}}"

BACKEND_REPO="${CI_REGISTRY_IMAGE}/backend"
FRONTEND_REPO="${CI_REGISTRY_IMAGE}/frontend"

echo "=== Docker login ${CI_REGISTRY} ==="
echo "$CI_REGISTRY_PASSWORD" | docker login -u "$CI_REGISTRY_USER" --password-stdin "$CI_REGISTRY"

echo "=== Build backend (${BACKEND_REPO}:${SHORT_SHA}) ==="
docker build \
  --target runner \
  -t "${BACKEND_REPO}:${SHORT_SHA}" \
  -t "${BACKEND_REPO}:${CI_COMMIT_SHA}" \
  -t "${BACKEND_REPO}:${MOVABLE_TAG}" \
  -f backend/Dockerfile \
  backend

echo "=== Build frontend (${FRONTEND_REPO}:${SHORT_SHA}) ==="
docker build \
  --target runner \
  --build-arg "NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}" \
  --build-arg "NEXT_PUBLIC_MAX_VIDEO_SIZE_MB=${NEXT_PUBLIC_MAX_VIDEO_SIZE_MB}" \
  -t "${FRONTEND_REPO}:${SHORT_SHA}" \
  -t "${FRONTEND_REPO}:${CI_COMMIT_SHA}" \
  -t "${FRONTEND_REPO}:${MOVABLE_TAG}" \
  -f frontend/Dockerfile \
  frontend

echo "=== Push images ==="
docker push "${BACKEND_REPO}:${SHORT_SHA}"
docker push "${BACKEND_REPO}:${CI_COMMIT_SHA}"
docker push "${BACKEND_REPO}:${MOVABLE_TAG}"
docker push "${FRONTEND_REPO}:${SHORT_SHA}"
docker push "${FRONTEND_REPO}:${CI_COMMIT_SHA}"
docker push "${FRONTEND_REPO}:${MOVABLE_TAG}"

echo "=== Images pushed ==="
echo "BACKEND_IMAGE=${BACKEND_REPO}:${SHORT_SHA}"
echo "FRONTEND_IMAGE=${FRONTEND_REPO}:${SHORT_SHA}"
echo "movable_tag=${MOVABLE_TAG}"
