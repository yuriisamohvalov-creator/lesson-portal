#!/usr/bin/env bash
# Deploy stable release to brix-pc (lessons.samoh.ru).
set -euo pipefail

SOURCE_DIR="${CI_PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
DEPLOY_DIR="${BRIX_PC_DEPLOY_DIR:-/home/ysamohvalov/service/lessons-portal}"
SSH_USER="${BRIX_PC_USER:-ysamohvalov}"
SSH_HOST="${BRIX_PC_HOST:-192.168.150.90}"
SSH_TARGET="${SSH_USER}@${SSH_HOST}"

echo "=== GitLab prod deploy -> $SSH_TARGET ==="
echo "Source:  $SOURCE_DIR"
echo "Target:  $DEPLOY_DIR"
echo "Branch:  ${CI_COMMIT_REF_NAME:-unknown}"
echo "Commit:  ${CI_COMMIT_SHORT_SHA:-unknown}"

setup_ssh() {
  mkdir -p ~/.ssh
  chmod 700 ~/.ssh

  if [[ -n "${SSH_KNOWN_HOSTS:-}" ]]; then
    echo "$SSH_KNOWN_HOSTS" > ~/.ssh/known_hosts
  elif ! grep -q "$SSH_HOST" ~/.ssh/known_hosts 2>/dev/null; then
    ssh-keyscan -H "$SSH_HOST" >> ~/.ssh/known_hosts 2>/dev/null || true
  fi
  chmod 600 ~/.ssh/known_hosts 2>/dev/null || true

  if [[ -n "${SSH_PRIVATE_KEY:-}" ]]; then
    eval "$(ssh-agent -s)"
    if [[ -f "$SSH_PRIVATE_KEY" ]]; then
      chmod 600 "$SSH_PRIVATE_KEY"
      ssh-add "$SSH_PRIVATE_KEY"
    else
      echo "$SSH_PRIVATE_KEY" | tr -d '\r' | ssh-add -
    fi
  fi
}

setup_ssh

echo "=== Sync files to $SSH_TARGET ==="
rsync -az --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude backend/node_modules \
  --exclude frontend/node_modules \
  --exclude .env \
  --exclude docker-compose.override.yml \
  "$SOURCE_DIR/" "$SSH_TARGET:$DEPLOY_DIR/"

echo "=== Run prod deploy on brix-pc ==="
ssh "$SSH_TARGET" "chmod +x '$DEPLOY_DIR/deploy/dockhand-deploy.sh' && '$DEPLOY_DIR/deploy/dockhand-deploy.sh'"

echo "=== Prod deploy finished ==="
echo "URL: https://lessons.samoh.ru"
