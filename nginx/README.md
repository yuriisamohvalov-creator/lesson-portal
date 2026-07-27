# Nginx Reverse Proxy Configuration

## Overview

This directory contains the nginx configuration for the Lessons Portal. Nginx runs outside the docker-compose stack, on the host server, as the single entry point for all traffic.

## Files

- `portal.conf` - Main nginx configuration
- `setup.sh` - Automated setup script

## Manual Setup

1. Copy the config:
   ```bash
   sudo cp portal.conf /etc/nginx/sites-available/lessons-portal
   sudo ln -s /etc/nginx/sites-available/lessons-portal /etc/nginx/sites-enabled/
   ```

2. Replace `lessons-portal.example.com` with your actual domain:
   ```bash
   sudo sed -i 's/lessons-portal.example.com/YOUR_DOMAIN/g' /etc/nginx/sites-available/lessons-portal
   ```

3. Install certbot and get SSL certificate:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot certonly --webroot -w /var/www/certbot -d YOUR_DOMAIN
   ```

4. Test and reload nginx:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## Automated Setup

```bash
chmod +x setup.sh
sudo ./setup.sh your-domain.com your-email@example.com
```

## Routing

| Path | Destination |
|------|-------------|
| `/api/*`, `/auth/*`, `/health` | Backend (port 3001) |
| `/_next/static/*` | Frontend (cached 7 days) |
| Everything else | Frontend (port 3002) |

## Features

- HTTP → HTTPS redirect
- Let's Encrypt SSL with auto-renewal
- Rate limiting (10 req/s for API, 30 req/s general)
- Security headers (HSTS, X-Frame-Options, etc.)
- Proxy headers (X-Real-IP, X-Forwarded-For, X-Forwarded-Proto)
- 500MB client body size for file uploads
