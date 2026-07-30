#!/usr/bin/env bash
# Deploy stable release to brix-pc (lessons.samoh.ru).
set -euo pipefail

SOURCE_DIR="${CI_PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
DEPLOY_DIR="${BRIX_PC_DEPLOY_DIR:-/home/ysamohvalov/service/lessons-portal}"
SSH_USER="${BRIX_PC_USER:-ysamohvalov}"
SSH_HOST="${BRIX_PC_HOST:-192.168.150.90}"
SSH_TARGET="${SSH_USER}@${SSH_HOST}"
SSH_IDENTITY=""
TMP_KEY=""

cleanup() {
  [[ -n "${TMP_KEY:-}" && -f "${TMP_KEY:-}" ]] && rm -f "$TMP_KEY"
}
trap cleanup EXIT

echo "=== GitLab prod deploy -> $SSH_TARGET ==="
echo "Source:  $SOURCE_DIR"
echo "Target:  $DEPLOY_DIR"
echo "Branch:  ${CI_COMMIT_REF_NAME:-unknown}"
echo "Commit:  ${CI_COMMIT_SHORT_SHA:-unknown}"

normalize_key_file() {
  local src="$1"
  local dest="$2"
  tr -d '\r' < "$src" > "$dest"
  [[ -s "$dest" ]] || return 1
  [[ "$(tail -c1 "$dest" | wc -l)" -eq 1 ]] || echo >> "$dest"
  chmod 600 "$dest"
}

key_is_usable() {
  local key="$1"
  [[ -f "$key" ]] || return 1
  # Reject passphrase-protected / corrupt keys without prompting
  ssh-keygen -y -f "$key" -P "" >/dev/null 2>&1
}

setup_ssh() {
  mkdir -p ~/.ssh
  chmod 700 ~/.ssh

  if [[ -n "${SSH_KNOWN_HOSTS:-}" ]]; then
    printf '%s\n' "$SSH_KNOWN_HOSTS" > ~/.ssh/known_hosts
  elif ! grep -q "$SSH_HOST" ~/.ssh/known_hosts 2>/dev/null; then
    ssh-keyscan -H "$SSH_HOST" >> ~/.ssh/known_hosts 2>/dev/null || true
  fi
  chmod 600 ~/.ssh/known_hosts 2>/dev/null || true

  if [[ -n "${SSH_PRIVATE_KEY:-}" ]]; then
    TMP_KEY="$(mktemp "${TMPDIR:-/tmp}/gitlab-ssh-key.XXXXXX")"
    if [[ -f "$SSH_PRIVATE_KEY" ]]; then
      if normalize_key_file "$SSH_PRIVATE_KEY" "$TMP_KEY" && key_is_usable "$TMP_KEY"; then
        SSH_IDENTITY="$TMP_KEY"
        echo "Using CI File variable SSH_PRIVATE_KEY"
      else
        echo "WARNING: SSH_PRIVATE_KEY file is invalid (often: wrong type, mangled newlines, or passphrase)."
        echo "         Falling back to host key under ~/.ssh/"
        rm -f "$TMP_KEY"
        TMP_KEY=""
      fi
    else
      printf '%s\n' "$SSH_PRIVATE_KEY" | tr -d '\r' > "$TMP_KEY"
      chmod 600 "$TMP_KEY"
      if key_is_usable "$TMP_KEY"; then
        SSH_IDENTITY="$TMP_KEY"
        echo "Using CI variable SSH_PRIVATE_KEY"
      else
        echo "WARNING: SSH_PRIVATE_KEY variable is invalid. Falling back to host key."
        rm -f "$TMP_KEY"
        TMP_KEY=""
      fi
    fi
  fi

  if [[ -z "$SSH_IDENTITY" ]]; then
    for candidate in \
      "${HOME}/.ssh/id_ed25519" \
      "${HOME}/.ssh/id_rsa" \
      "${HOME}/.ssh/brix-pc_rsa"
    do
      if key_is_usable "$candidate"; then
        SSH_IDENTITY="$candidate"
        echo "Using host SSH key: $candidate"
        break
      fi
    done
  fi

  if [[ -z "$SSH_IDENTITY" ]]; then
    echo "ERROR: No usable SSH private key."
    echo "Fix GitLab CI File variable SSH_PRIVATE_KEY (unencrypted OpenSSH/PEM key),"
    echo "or ensure gitlab-runner has ~/.ssh/id_ed25519 authorized on brix-pc."
    exit 1
  fi
}

setup_ssh

echo "=== Sync files to $SSH_TARGET ==="
RSYNC_RSH="ssh -o BatchMode=yes -o IdentitiesOnly=yes -i ${SSH_IDENTITY}"
rsync -az --delete \
  -e "$RSYNC_RSH" \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude backend/node_modules \
  --exclude frontend/node_modules \
  --exclude .env \
  --exclude docker-compose.override.yml \
  "$SOURCE_DIR/" "$SSH_TARGET:$DEPLOY_DIR/"

echo "=== Run prod deploy on brix-pc ==="
ssh -o BatchMode=yes -o IdentitiesOnly=yes -i "$SSH_IDENTITY" "$SSH_TARGET" \
  "chmod +x '$DEPLOY_DIR/deploy/dockhand-deploy.sh' && '$DEPLOY_DIR/deploy/dockhand-deploy.sh'"

echo "=== Prod deploy finished ==="
echo "URL: https://lessons.samoh.ru"
