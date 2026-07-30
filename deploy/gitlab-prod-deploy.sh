#!/usr/bin/env bash
# Deploy stable release to brix-pc (lessons.samoh.ru).
set -euo pipefail

SOURCE_DIR="${CI_PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
SSH_USER="${BRIX_PC_USER:-ysamohvalov}"
SSH_HOST="${BRIX_PC_HOST:-192.168.150.90}"
SSH_TARGET="${SSH_USER}@${SSH_HOST}"
SSH_IDENTITY=""
TMP_KEY=""

# Resolve deploy dir: trim; if CI File-variable path was used by mistake, read contents.
resolve_deploy_dir() {
  local default_dir="/home/ysamohvalov/service/lessons-portal"
  local raw="${BRIX_PC_DEPLOY_DIR:-$default_dir}"
  raw="${raw#"${raw%%[![:space:]]*}"}"
  raw="${raw%"${raw##*[![:space:]]}"}"

  # GitLab File variables expand to a temp file path, not the file contents.
  if [[ -f "$raw" ]]; then
    echo "WARNING: BRIX_PC_DEPLOY_DIR is a File variable (value is a temp path). Reading contents." >&2
    local content
    content="$(tr -d '\r' < "$raw" | head -n1)"
    content="${content#"${content%%[![:space:]]*}"}"
    content="${content%"${content##*[![:space:]]}"}"
    if [[ "$content" == /* ]]; then
      raw="$content"
    else
      echo "WARNING: File contents are not an absolute path; using default $default_dir" >&2
      raw="$default_dir"
    fi
  fi

  raw="${raw%/}"
  if [[ -z "$raw" || "$raw" != /* ]]; then
    echo "WARNING: invalid BRIX_PC_DEPLOY_DIR; using default $default_dir" >&2
    raw="$default_dir"
  fi
  printf '%s' "$raw"
}

DEPLOY_DIR="$(resolve_deploy_dir)"

cleanup() {
  [[ -n "${TMP_KEY:-}" && -f "${TMP_KEY:-}" ]] && rm -f "$TMP_KEY"
}
trap cleanup EXIT

echo "=== GitLab prod deploy -> ${SSH_USER}@${SSH_HOST} ==="
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

remote_ssh() {
  ssh -o BatchMode=yes -o IdentitiesOnly=yes -i "$SSH_IDENTITY" "$SSH_TARGET" "$@"
}

echo "=== Sync files to ${SSH_USER}@${SSH_HOST}:$DEPLOY_DIR ==="
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
  "$SOURCE_DIR/" "${SSH_TARGET}:${DEPLOY_DIR}/"

echo "=== Verify remote deploy script ==="
remote_ssh "set -e; test -d '$DEPLOY_DIR'; test -f '$DEPLOY_DIR/deploy/dockhand-deploy.sh'; ls -la '$DEPLOY_DIR/deploy/dockhand-deploy.sh'"

echo "=== Run prod deploy on brix-pc ==="
remote_ssh "set -euo pipefail; cd '$DEPLOY_DIR'; chmod +x deploy/dockhand-deploy.sh; bash deploy/dockhand-deploy.sh"

echo "=== Prod deploy finished ==="
echo "URL: https://lessons.samoh.ru"
exit 0
