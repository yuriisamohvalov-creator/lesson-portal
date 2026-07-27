#!/bin/bash
# Nginx setup script for Lessons Portal
# Run this on the server where nginx is installed

set -e

DOMAIN="${1:-lessons-portal.example.com}"
EMAIL="${2:-admin@example.com}"

echo "=== Setting up Nginx for $DOMAIN ==="

# Install certbot if not present
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
fi

# Create certbot webroot
mkdir -p /var/www/certbot

# Copy nginx config
cp "$(dirname "$0")/portal.conf" /etc/nginx/sites-available/lessons-portal
ln -sf /etc/nginx/sites-available/lessons-portal /etc/nginx/sites-enabled/

# Replace domain in config
sed -i "s/lessons-portal.example.com/$DOMAIN/g" /etc/nginx/sites-available/lessons-portal

# Test nginx config
nginx -t

# Reload nginx
systemctl reload nginx

# Get SSL certificate
echo "=== Getting SSL certificate ==="
certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" --email "$EMAIL" --agree-tos --no-eff-email

# Reload nginx with SSL
systemctl reload nginx

# Setup auto-renewal
echo "0 0,12 * * * root certbot renew --quiet --post-hook 'systemctl reload nginx'" > /etc/cron.d/certbot-renew

echo "=== Setup complete ==="
echo "Site available at https://$DOMAIN"
echo "Auto-renewal configured"
