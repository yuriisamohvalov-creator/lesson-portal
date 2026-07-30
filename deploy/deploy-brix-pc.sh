#!/bin/bash
# Deploy Lessons Portal stack on brix-pc (prebuilt images + encrypted .env)
set -euo pipefail

DOMAIN="${1:-lessons.samoh.ru}"
EMAIL="${2:-admin@samoh.ru}"
PROJECT_DIR="${PROJECT_DIR:-/home/ysamohvalov/service/lessons-portal}"

echo "=== Lessons Portal deploy -> $DOMAIN ==="
echo "Project dir: $PROJECT_DIR"

if [[ ! -f "$PROJECT_DIR/.env" ]]; then
  echo "ERROR: $PROJECT_DIR/.env not found."
  echo "Copy .env.production.example, encrypt secrets with deploy/secrets.sh, write .env"
  exit 1
fi

cd "$PROJECT_DIR"
chmod +x deploy/dockhand-deploy.sh deploy/secrets.sh
bash deploy/dockhand-deploy.sh

echo ""
echo "Docker stack is up (pulled images, no local build)."
echo "Configure nginx (requires sudo):"
echo "  cd $PROJECT_DIR/nginx"
echo "  sudo ./setup.sh $DOMAIN $EMAIL"
echo ""
echo "Dockhand env file must be .env.runtime (decrypted), not ciphertext .env"
echo "  URL: https://$DOMAIN"
