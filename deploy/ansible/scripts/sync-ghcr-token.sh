#!/usr/bin/env bash
# Sync GitHub PAT for GHCR into ansible-vault and GitHub Actions secret GHCR_TOKEN.
# Usage: GHCR_PAT='ghp_...' ./deploy/ansible/scripts/sync-ghcr-token.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
VAULT_FILE="$ROOT/deploy/ansible/inventory/group_vars/all/vault.yml"
VAULT_PASS_FILE="${ANSIBLE_VAULT_PASSWORD_FILE:-$HOME/.config/lessons-portal/ansible-vault-pass}"
REPO="${GITHUB_REPOSITORY:-yuriisamohvalov-creator/lesson-portal}"

if [[ -z "${GHCR_PAT:-}" ]]; then
  echo "Set GHCR_PAT to a classic PAT with read:packages and write:packages." >&2
  exit 1
fi

if [[ ! -f "$VAULT_PASS_FILE" ]]; then
  echo "Missing vault password file: $VAULT_PASS_FILE" >&2
  exit 1
fi

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

if [[ -f "$VAULT_FILE" ]]; then
  ansible-vault view "$VAULT_FILE" --vault-password-file "$VAULT_PASS_FILE" >"$TMP" 2>/dev/null || true
fi

python3 - "$TMP" <<'PY'
import os, sys
path = sys.argv[1]
lines = []
if os.path.isfile(path) and os.path.getsize(path) > 0:
    with open(path) as f:
        lines = f.read().splitlines()
out = {}
for line in lines:
    if not line.strip() or line.lstrip().startswith("#"):
        continue
    if ":" in line:
        k, _, v = line.partition(":")
        out[k.strip()] = v.strip().strip('"').strip("'")
out["vault_ghcr_token"] = os.environ["GHCR_PAT"]
for k, v in out.items():
    print(f'{k}: "{v}"')
PY

ansible-vault encrypt --encrypt-vault-id default --vault-password-file "$VAULT_PASS_FILE" --output "$VAULT_FILE" "$TMP"

gh secret set GHCR_TOKEN -R "$REPO" --body "$GHCR_PAT"

echo "Updated $VAULT_FILE and GitHub secret GHCR_TOKEN for $REPO."
