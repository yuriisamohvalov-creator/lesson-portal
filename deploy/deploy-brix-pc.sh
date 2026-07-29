#!/bin/bash
# Deploy Lessons Portal stack on brix-pc (Docker + host nginx)
set -euo pipefail

DOMAIN="${1:-lessons.samoh.ru}"
EMAIL="${2:-admin@samoh.ru}"
PROJECT_DIR="${PROJECT_DIR:-/home/ysamohvalov/service/lessons-portal}"
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

echo "=== Lessons Portal deploy -> $DOMAIN ==="
echo "Project dir: $PROJECT_DIR"

if [[ ! -f "$PROJECT_DIR/.env" ]]; then
  echo "ERROR: $PROJECT_DIR/.env not found."
  echo "Copy .env.production.example to .env and set secrets first."
  exit 1
fi

cd "$PROJECT_DIR"

set -a
# shellcheck disable=SC1091
source "$PROJECT_DIR/.env"
set +a
mkdir -p "${MINIO_DATA_DIR:-minio_data}"

echo "=== Building images ==="
$COMPOSE build --pull

echo "=== Starting stack ==="
$COMPOSE up -d

echo "=== Waiting for backend ==="
for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:3071/health" >/dev/null; then
    echo "Backend healthy"
    break
  fi
  sleep 2
  if [[ $i -eq 30 ]]; then
    echo "Backend health check failed"
    $COMPOSE logs backend --tail 50
    exit 1
  fi
done

echo "=== Running migrations ==="
$COMPOSE exec -T backend npx prisma migrate deploy

echo "=== Stack status ==="
$COMPOSE ps

echo ""
echo "Docker stack is up."
echo "Configure nginx (requires sudo):"
echo "  cd $PROJECT_DIR/nginx"
echo "  sudo ./setup.sh $DOMAIN $EMAIL"
echo ""
echo "Dockhand: import stack from $PROJECT_DIR"
echo "  Compose files: docker-compose.yml + docker-compose.prod.yml"
echo "  URL: https://$DOMAIN"
