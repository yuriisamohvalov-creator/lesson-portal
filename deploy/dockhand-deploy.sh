#!/bin/bash
# Redeploy lessons-portal prod stack via Dockhand (brix-pc)
set -euo pipefail

DOCKHAND_URL="${DOCKHAND_URL:-http://127.0.0.1:9988}"
ENV_ID="${DOCKHAND_ENV_ID:-1}"
STACK_NAME="${STACK_NAME:-lessons-portal}"
PROJECT_DIR="${PROJECT_DIR:-/home/ysamohvalov/service/lessons-portal}"
COMPOSE="docker compose -f $PROJECT_DIR/docker-compose.yml -f $PROJECT_DIR/docker-compose.prod.yml --env-file $PROJECT_DIR/.env"
RELEASE_FILE="$PROJECT_DIR/docker-compose.release.yml"

echo "=== Prod deploy: $STACK_NAME ==="

if [[ ! -f "$PROJECT_DIR/.env" ]]; then
  echo "ERROR: $PROJECT_DIR/.env not found"
  exit 1
fi

# Dev override breaks prod (opens postgres :5432)
rm -f "$PROJECT_DIR/docker-compose.override.yml"

grep -q '^COMPOSE_FILE=' "$PROJECT_DIR/.env" 2>/dev/null || \
  echo 'COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml' >> "$PROJECT_DIR/.env"

set -a
# shellcheck disable=SC1091
source "$PROJECT_DIR/.env"
set +a
mkdir -p "${MINIO_DATA_DIR:-minio_data}"

echo "=== Build & up (docker compose) ==="
cd "$PROJECT_DIR"
# Sequential builds: brix has ~15Gi RAM, no swap, and many other stacks.
# Parallel `compose build` OOMs frontend `npm ci` ("Exit handler never called").
export COMPOSE_PARALLEL_LIMIT=1
$COMPOSE build backend
$COMPOSE build frontend
$COMPOSE up -d --force-recreate

echo "=== Render release compose for Dockhand ==="
$COMPOSE config > "$RELEASE_FILE"

docker exec dockhand sqlite3 /app/data/db/dockhand.db "
INSERT INTO stack_sources (stack_name, environment_id, source_type, compose_path, env_path)
VALUES ('$STACK_NAME', $ENV_ID, 'internal', '$RELEASE_FILE', '$PROJECT_DIR/.env')
ON CONFLICT(stack_name, environment_id) DO UPDATE SET
  compose_path = excluded.compose_path,
  env_path = excluded.env_path,
  source_type = 'internal',
  updated_at = CURRENT_TIMESTAMP;
"

echo "=== Sync stack in Dockhand ==="
# Avoid pipefail SIGPIPE from `curl | head` failing the whole deploy after a successful up.
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
  if curl -sf "http://127.0.0.1:3071/health" >/dev/null 2>&1; then
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
