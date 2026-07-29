#!/bin/bash
# Apply nginx config for large video uploads (requires sudo)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ $EUID -ne 0 ]]; then
  echo "Run as root: sudo $0"
  exit 1
fi

cp "$SCRIPT_DIR/portal.conf" /etc/nginx/sites-available/lessons-portal
nginx -t
systemctl reload nginx
echo "Nginx reloaded: client_max_body_size=5120M, MinIO proxy enabled"
