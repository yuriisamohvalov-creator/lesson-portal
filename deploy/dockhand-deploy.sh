#!/usr/bin/env bash
# Prod deploy on brix-pc: decrypt ENC(.env) → pull prebuilt images → compose up --no-build
set -euo pipefail

DOCKHAND_URL="${DOCKHAND_URL:-http://127.0.0.1:9988}"
ENV_ID="${DOCKHAND_ENV_ID:-1}"
STACK_NAME="${STACK_NAME:-lessons-portal}"
PROJECT_DIR="${PROJECT_DIR:-/home/ysamohvalov/service/lessons-portal}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

ENV_FILE="$PROJECT_DIR/.env"
RUNTIME_ENV="$PROJECT_DIR/.env.runtime"
RELEASE_FILE="$PROJECT_DIR/docker-compose.release.yml"
COMPOSE="docker compose -f $PROJECT_DIR/docker-compose.yml -f $PROJECT_DIR/docker-compose.prod.yml --env-file $RUNTIME_ENV"

echo "=== Prod deploy: $STACK_NAME ==="

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found (encrypted secrets + non-secret config)"
  exit 1
fi

# Dev override breaks prod (opens postgres :5432)
rm -f "$PROJECT_DIR/docker-compose.override.yml"

chmod +x "$SCRIPT_DIR/secrets.sh"

echo "=== Decrypt .env → .env.runtime ==="
bash "$SCRIPT_DIR/secrets.sh" decrypt-env "$ENV_FILE" "$RUNTIME_ENV"

# Image pins from CI (optional override of values already in .env)
if [[ -n "${BACKEND_IMAGE:-}" ]]; then
  if grep -q '^BACKEND_IMAGE=' "$RUNTIME_ENV"; then
    sed -i "s|^BACKEND_IMAGE=.*|BACKEND_IMAGE=${BACKEND_IMAGE}|" "$RUNTIME_ENV"
  else
    echo "BACKEND_IMAGE=${BACKEND_IMAGE}" >> "$RUNTIME_ENV"
  fi
fi
if [[ -n "${FRONTEND_IMAGE:-}" ]]; then
  if grep -q '^FRONTEND_IMAGE=' "$RUNTIME_ENV"; then
    sed -i "s|^FRONTEND_IMAGE=.*|FRONTEND_IMAGE=${FRONTEND_IMAGE}|" "$RUNTIME_ENV"
  else
    echo "FRONTEND_IMAGE=${FRONTEND_IMAGE}" >> "$RUNTIME_ENV"
  fi
fi

grep -q '^COMPOSE_FILE=' "$RUNTIME_ENV" 2>/dev/null || \
  echo 'COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml' >> "$RUNTIME_ENV"

set -a
# shellcheck disable=SC1091
source "$RUNTIME_ENV"
set +a

if [[ -z "${BACKEND_IMAGE:-}" || -z "${FRONTEND_IMAGE:-}" ]]; then
  echo "ERROR: BACKEND_IMAGE and FRONTEND_IMAGE must be set (in .env or by CI deploy)"
  exit 1
fi

mkdir -p "${MINIO_DATA_DIR:-minio_data}"

# Optional registry login on brix (Deploy Token / job credentials forwarded by CI)
if [[ -n "${CI_REGISTRY:-}" && -n "${CI_REGISTRY_USER:-}" && -n "${CI_REGISTRY_PASSWORD:-}" ]]; then
  echo "=== Docker login to ${CI_REGISTRY} ==="
  echo "$CI_REGISTRY_PASSWORD" | docker login -u "$CI_REGISTRY_USER" --password-stdin "$CI_REGISTRY"
fi

echo "=== Pull prebuilt images ==="
cd "$PROJECT_DIR"
pull_or_ok() {
  local img="$1"
  if docker image inspect "$img" >/dev/null 2>&1; then
    echo "Image already present: $img"
    return 0
  fi
  docker pull "$img"
}
pull_or_ok "$BACKEND_IMAGE"
pull_or_ok "$FRONTEND_IMAGE"

echo "=== Up (no build) ==="
$COMPOSE up -d --no-build --force-recreate --remove-orphans

echo "=== Render release compose for Dockhand ==="
$COMPOSE config > "$RELEASE_FILE"

docker exec dockhand sqlite3 /app/data/db/dockhand.db "
INSERT INTO stack_sources (stack_name, environment_id, source_type, compose_path, env_path)
VALUES ('$STACK_NAME', $ENV_ID, 'internal', '$RELEASE_FILE', '$RUNTIME_ENV')
ON CONFLICT(stack_name, environment_id) DO UPDATE SET
  compose_path = excluded.compose_path,
  env_path = excluded.env_path,
  source_type = 'internal',
  updated_at = CURRENT_TIMESTAMP;
" 2>/dev/null || echo "(Dockhand DB update skipped)"

echo "=== Sync stack in Dockhand ==="
set +o pipefail
curl -sS -X POST "$DOCKHAND_URL/api/stacks/$STACK_NAME/deploy?env=$ENV_ID" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"pull": false, "build": false, "forceRecreate": false}' \
  | head -c 500 || echo "(Dockhand sync skipped)"
echo
set -o pipefail

echo "=== Waiting for backend health ==="
for i in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:${BACKEND_PORT:-3071}/health" >/dev/null 2>&1; then
    echo "Backend healthy"
    break
  fi
  sleep 3
  if [[ $i -eq 60 ]]; then
    echo "Backend health check failed"
    $COMPOSE logs backend --tail 40
    exit 1
  fi
done

echo "=== Migrations ==="
$COMPOSE exec -T backend npx prisma migrate deploy

echo "=== Done ==="
$COMPOSE ps
exit 0
