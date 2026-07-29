#!/bin/bash
# Nginx setup for Lessons Portal on brix-pc
set -euo pipefail

DOMAIN="${1:-lessons.samoh.ru}"
EMAIL="${2:-admin@samoh.ru}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Nginx setup for $DOMAIN ==="

if [[ $EUID -ne 0 ]]; then
  echo "Run as root: sudo $0 $DOMAIN $EMAIL"
  exit 1
fi

if ! command -v certbot &>/dev/null; then
  apt-get update
  apt-get install -y certbot python3-certbot-nginx
fi

mkdir -p /var/www/certbot

cp "$SCRIPT_DIR/portal.conf" /etc/nginx/sites-available/lessons-portal
ln -sf /etc/nginx/sites-available/lessons-portal /etc/nginx/sites-enabled/lessons-portal

# Temporary HTTP-only config for certbot if certs missing
if [[ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
  cat > /etc/nginx/sites-available/lessons-portal <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'ok';
        add_header Content-Type text/plain;
    }
}
EOF
  nginx -t
  systemctl reload nginx
  certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" \
    --email "$EMAIL" --agree-tos --no-eff-email --non-interactive
fi

cp "$SCRIPT_DIR/portal.conf" /etc/nginx/sites-available/lessons-portal
sed -i "s/lessons.samoh.ru/$DOMAIN/g" /etc/nginx/sites-available/lessons-portal

nginx -t
systemctl reload nginx

echo "=== Done: https://$DOMAIN ==="
