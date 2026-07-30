#!/usr/bin/env bash
# Encrypt/decrypt ENC(...) secrets with AES-256-CBC + PBKDF2 (openssl).
#
# Usage:
#   SECRETS_MASTER_KEY_FILE=~/.config/lessons-portal/master.key \
#     ./deploy/secrets.sh encrypt 'plaintext'
#   ./deploy/secrets.sh decrypt 'ENC(...)'
#   ./deploy/secrets.sh decrypt-env .env .env.runtime
#   ./deploy/secrets.sh encrypt-env .env.plain .env   # encrypt known secret keys
#
# Master key: SECRETS_MASTER_KEY (raw) or SECRETS_MASTER_KEY_FILE (path).
set -euo pipefail

DEFAULT_KEY_FILE="${HOME}/.config/lessons-portal/master.key"
# Keys that must be stored as ENC(...) in production .env
SECRET_KEYS=(
  POSTGRES_PASSWORD
  MINIO_ROOT_PASSWORD
  MINIO_ROOT_USER
  JWT_SECRET
  JWT_REFRESH_SECRET
)

resolve_master_key() {
  if [[ -n "${SECRETS_MASTER_KEY:-}" ]]; then
    printf '%s' "$SECRETS_MASTER_KEY"
    return 0
  fi
  local file="${SECRETS_MASTER_KEY_FILE:-$DEFAULT_KEY_FILE}"
  if [[ ! -f "$file" ]]; then
    echo "ERROR: master key not found. Set SECRETS_MASTER_KEY or SECRETS_MASTER_KEY_FILE" >&2
    echo "  (default file: $DEFAULT_KEY_FILE)" >&2
    exit 1
  fi
  tr -d '\r\n' < "$file"
}

openssl_encrypt() {
  local plaintext="$1"
  local key
  key="$(resolve_master_key)"
  # -A: single-line base64; salt embedded in ciphertext (Salted__...)
  printf '%s' "$plaintext" | openssl enc -aes-256-cbc -pbkdf2 -iter 100000 -salt -base64 -A -pass "pass:${key}"
}

openssl_decrypt() {
  local b64="$1"
  local key
  key="$(resolve_master_key)"
  printf '%s' "$b64" | openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -base64 -A -pass "pass:${key}"
}

cmd_encrypt() {
  local plaintext="${1:-}"
  if [[ -z "$plaintext" ]]; then
    echo "Usage: $0 encrypt <plaintext>" >&2
    exit 1
  fi
  local cipher
  cipher="$(openssl_encrypt "$plaintext")"
  printf 'ENC(%s)\n' "$cipher"
}

cmd_decrypt() {
  local value="${1:-}"
  if [[ -z "$value" ]]; then
    echo "Usage: $0 decrypt 'ENC(...)'" >&2
    exit 1
  fi
  if [[ "$value" =~ ^ENC\((.*)\)$ ]]; then
    openssl_decrypt "${BASH_REMATCH[1]}"
    printf '\n'
  else
    echo "ERROR: value must look like ENC(...)" >&2
    exit 1
  fi
}

is_secret_key() {
  local name="$1"
  local k
  for k in "${SECRET_KEYS[@]}"; do
    [[ "$name" == "$k" ]] && return 0
  done
  return 1
}

decrypt_value() {
  local value="$1"
  if [[ "$value" =~ ^ENC\((.*)\)$ ]]; then
    openssl_decrypt "${BASH_REMATCH[1]}"
  else
    printf '%s' "$value"
  fi
}

cmd_decrypt_env() {
  local src="${1:-}"
  local dest="${2:-}"
  if [[ -z "$src" || -z "$dest" ]]; then
    echo "Usage: $0 decrypt-env <src.env> <dest.env>" >&2
    exit 1
  fi
  [[ -f "$src" ]] || { echo "ERROR: $src not found" >&2; exit 1; }

  local tmp
  tmp="$(mktemp)"
  # shellcheck disable=SC2064
  trap "rm -f '$tmp'" RETURN

  while IFS= read -r line || [[ -n "$line" ]]; do
    # Preserve comments and blank lines
    if [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]]; then
      printf '%s\n' "$line" >> "$tmp"
      continue
    fi
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      local key="${BASH_REMATCH[1]}"
      local raw="${BASH_REMATCH[2]}"
      # Strip optional surrounding quotes
      local val="$raw"
      if [[ "$val" =~ ^\"(.*)\"$ ]]; then
        val="${BASH_REMATCH[1]}"
      elif [[ "$val" =~ ^\'(.*)\'$ ]]; then
        val="${BASH_REMATCH[1]}"
      fi
      local plain
      plain="$(decrypt_value "$val")"
      # Always quote decrypted values for safe dotenv parsing
      plain="${plain//\\/\\\\}"
      plain="${plain//\"/\\\"}"
      printf '%s="%s"\n' "$key" "$plain" >> "$tmp"
    else
      printf '%s\n' "$line" >> "$tmp"
    fi
  done < "$src"

  umask 077
  mv -f "$tmp" "$dest"
  chmod 600 "$dest"
  trap - RETURN
  echo "Wrote decrypted env: $dest" >&2
}

cmd_encrypt_env() {
  local src="${1:-}"
  local dest="${2:-}"
  if [[ -z "$src" || -z "$dest" ]]; then
    echo "Usage: $0 encrypt-env <src.env> <dest.env>" >&2
    exit 1
  fi
  [[ -f "$src" ]] || { echo "ERROR: $src not found" >&2; exit 1; }

  local tmp
  tmp="$(mktemp)"
  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]]; then
      printf '%s\n' "$line" >> "$tmp"
      continue
    fi
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      local key="${BASH_REMATCH[1]}"
      local raw="${BASH_REMATCH[2]}"
      local val="$raw"
      if [[ "$val" =~ ^\"(.*)\"$ ]]; then
        val="${BASH_REMATCH[1]}"
      elif [[ "$val" =~ ^\'(.*)\'$ ]]; then
        val="${BASH_REMATCH[1]}"
      fi
      if is_secret_key "$key" && [[ ! "$val" =~ ^ENC\( ]]; then
        local enc
        enc="$(openssl_encrypt "$val")"
        printf '%s=ENC(%s)\n' "$key" "$enc" >> "$tmp"
      else
        printf '%s\n' "$line" >> "$tmp"
      fi
    else
      printf '%s\n' "$line" >> "$tmp"
    fi
  done < "$src"

  umask 077
  mv -f "$tmp" "$dest"
  chmod 600 "$dest"
  echo "Wrote encrypted env: $dest" >&2
}

cmd_gen_key() {
  local file="${1:-$DEFAULT_KEY_FILE}"
  mkdir -p "$(dirname "$file")"
  if [[ -f "$file" ]]; then
    echo "ERROR: $file already exists" >&2
    exit 1
  fi
  umask 077
  openssl rand -hex 32 > "$file"
  chmod 600 "$file"
  echo "Master key written to $file" >&2
}

usage() {
  cat <<'EOF'
Usage:
  secrets.sh gen-key [path]           Create master key file (default ~/.config/lessons-portal/master.key)
  secrets.sh encrypt <plaintext>      Print ENC(...)
  secrets.sh decrypt 'ENC(...)'       Print plaintext
  secrets.sh decrypt-env <in> <out>   Decrypt all ENC(...) values into out file
  secrets.sh encrypt-env <in> <out>   Encrypt known secret keys into out file

Env:
  SECRETS_MASTER_KEY       raw master key
  SECRETS_MASTER_KEY_FILE  path to master key file
EOF
}

main() {
  local cmd="${1:-}"
  shift || true
  case "$cmd" in
    gen-key) cmd_gen_key "$@" ;;
    encrypt) cmd_encrypt "$@" ;;
    decrypt) cmd_decrypt "$@" ;;
    decrypt-env) cmd_decrypt_env "$@" ;;
    encrypt-env) cmd_encrypt_env "$@" ;;
    -h|--help|help|"") usage; [[ -n "$cmd" ]] || exit 1 ;;
    *) echo "Unknown command: $cmd" >&2; usage; exit 1 ;;
  esac
}

main "$@"
