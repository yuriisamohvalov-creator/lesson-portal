# Prod-деплой на brix-pc (Dockhand + nginx)

Домен: **https://lessons.samoh.ru**

## Архитектура

```
Internet -> nginx (host, :443)
              ├─ /api/*  -> localhost:3071 (NestJS backend)
              ├─ /health -> localhost:3071
              └─ /*      -> localhost:3070 (Next.js frontend)

Docker Compose (Dockhand / CLI):
  postgres, redis, minio, backend, frontend
```

API доступен по префиксу `/api` (например `/api/auth/login`, `/api/articles`).
Swagger: `https://lessons.samoh.ru/api/docs`

## 1. Подготовка на brix-pc

```bash
mkdir -p ~/service/lessons-portal
cd ~/service/lessons-portal
git clone git@github.com:yuriisamohvalov-creator/lesson-portal.git .
cp .env.production.example .env
# Отредактируйте .env — пароли и JWT-секреты
nano .env
```

Сгенерировать секреты:

```bash
openssl rand -hex 32   # JWT_SECRET
openssl rand -hex 32   # JWT_REFRESH_SECRET
openssl rand -hex 16   # POSTGRES_PASSWORD
openssl rand -hex 16   # MINIO_ROOT_PASSWORD
```

## 2. Запуск через Docker Compose

```bash
chmod +x deploy/deploy-brix-pc.sh
./deploy/deploy-brix-pc.sh lessons.samoh.ru admin@samoh.ru
```

Или вручную:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed   # опционально
```

## 3. Dockhand

1. Открыть https://dockge.samoh.ru (Dockhand на порту 9988)
2. **Stacks → Add stack** (или Git deploy)
3. Путь: `/home/ysamohvalov/service/lessons-portal`
4. Compose files:
   - `docker-compose.yml`
   - `docker-compose.prod.yml`
5. Env file: `.env` (из `.env.production.example`)
6. Deploy / Pull & redeploy

> Для GitOps: подключить репозиторий `lesson-portal`, webhook на push в `main`.

## 4. Nginx (на хосте)

```bash
cd ~/service/lessons-portal/nginx
sudo ./setup.sh lessons.samoh.ru admin@samoh.ru
```

Скрипт:
- копирует `portal.conf` в `/etc/nginx/sites-available/lessons-portal`
- получает SSL-сертификат Let's Encrypt
- перезагружает nginx

Порты приложения (только localhost):
| Сервис   | Порт |
|----------|------|
| Frontend | 3070 |
| Backend  | 3071 |

## 5. Проверка

```bash
curl -sf https://lessons.samoh.ru/health
curl -sf https://lessons.samoh.ru/api/categories
curl -I https://lessons.samoh.ru/
```

Тестовые пользователи (после seed):

| Email | Пароль | Роль |
|-------|--------|------|
| user@test.com | testpass123 | USER |
| moderator@test.com | testpass123 | MODERATOR |
| admin@test.com | testpass123 | ADMIN |

## Обновление

```bash
cd ~/service/lessons-portal
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
docker compose exec backend npx prisma migrate deploy
```

Или через Dockhand: **Pull & redeploy**.
