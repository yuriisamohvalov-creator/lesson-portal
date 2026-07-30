#!/usr/bin/env bash
# Deploy dev stack locally on the GitLab runner host (SER9).
set -euo pipefail

SOURCE_DIR="${CI_PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
DEPLOY_DIR="${LOCAL_DEPLOY_DIR:-/home/ysamohvalov/service/lessons-portal-local}"
ENV_FILE="${LOCAL_ENV_FILE:-$DEPLOY_DIR/.env}"

echo "=== GitLab local deploy ==="
echo "Source:  $SOURCE_DIR"
echo "Target:  $DEPLOY_DIR"
echo "Branch:  ${CI_COMMIT_REF_NAME:-local}"
echo "Commit:  ${CI_COMMIT_SHORT_SHA:-unknown}"

mkdir -p "$DEPLOY_DIR"

rsync -az --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude backend/node_modules \
  --exclude frontend/node_modules \
  --exclude .env \
  "$SOURCE_DIR/" "$DEPLOY_DIR/"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: Env file not found: $ENV_FILE"
  echo "Create it from .env.example on the runner host."
  exit 1
fi

cp "$ENV_FILE" "$DEPLOY_DIR/.env"

cd "$DEPLOY_DIR"

# Host node_modules are bind-mounted in docker-compose.override.yml
echo "=== npm ci (host mounts for backend/frontend) ==="
export npm_config_registry="${npm_config_registry:-http://127.0.0.1:4873}"
export npm_config_cache="${npm_config_cache:-/home/gitlab-runner/.npm}"
export PRISMA_SKIP_POSTINSTALL_GENERATE="${PRISMA_SKIP_POSTINSTALL_GENERATE:-true}"
(
  cd backend
  npm ci --prefer-offline --no-audit --no-fund
  npx prisma generate
)
(
  cd frontend
  npm ci --prefer-offline --no-audit --no-fund
)

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.override.yml --env-file .env"

echo "=== Build & start (dev stack) ==="
$COMPOSE build
$COMPOSE up -d --force-recreate

echo "=== Wait for backend ==="
for i in $(seq 1 40); do
  if curl -sf "http://127.0.0.1:3001/health" >/dev/null 2>&1; then
    echo "Backend healthy"
    break
  fi
  sleep 3
  if [[ $i -eq 40 ]]; then
    echo "Backend health check failed"
    $COMPOSE logs backend --tail 40
    exit 1
  fi
done

echo "=== Migrations ==="
$COMPOSE exec -T backend npx prisma migrate deploy

echo "=== Done ==="
$COMPOSE ps
echo ""
echo "Frontend: http://localhost:3002"
echo "Backend:  http://localhost:3001/api/docs"
