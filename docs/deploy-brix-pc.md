# Prod-деплой на brix-pc (prebuilt images + encrypted .env)

Домен: **https://lessons.samoh.ru**

## Архитектура

```
Internet -> nginx (host, :443)
              ├─ /api/*  -> localhost:3071 (NestJS backend)
              ├─ /health -> localhost:3071
              └─ /*      -> localhost:3070 (Next.js frontend)

GitLab CI (SER9):
  test → docker build/push → gitlab.local:5050/.../backend|frontend:<sha>

brix-pc:
  decrypt ENC(.env) → .env.runtime
  docker pull + compose up --no-build
  postgres, redis, minio, backend, frontend
```

На проде **нет** `npm ci` / `compose build`. Только готовые образы и `.env`.

## 1. Подготовка на brix-pc (один раз)

```bash
mkdir -p ~/service/lessons-portal/deploy
# после первого CI/rsync здесь появятся compose + deploy scripts

# Мастер-ключ для ENC(...)
cd ~/service/lessons-portal
./deploy/secrets.sh gen-key
# → ~/.config/lessons-portal/master.key
```

Создать зашифрованный `.env`:

```bash
cp .env.production.example .env.plain
nano .env.plain   # plaintext-секреты, MINIO_DATA_DIR, порты
./deploy/secrets.sh encrypt-env .env.plain .env
shred -u .env.plain
mkdir -p "$(grep '^MINIO_DATA_DIR=' .env | cut -d= -f2- | tr -d '"')"
```

Сгенерировать plaintext до encrypt:

```bash
openssl rand -hex 32   # JWT_SECRET / JWT_REFRESH_SECRET
openssl rand -hex 16   # POSTGRES_PASSWORD / MINIO_ROOT_PASSWORD
```

Registry login (если CI не передаёт job token):

```bash
docker login gitlab.local:5050
# Deploy Token с read_registry
```

## 2. Обычный релиз

Push/merge в `main` → pipeline:

1. `backend:check` / `frontend:check`
2. `build:images` — push в registry
3. `deploy:prod` — rsync compose/scripts, на brix: decrypt → pull → up → migrate

Вручную на brix (образы уже в registry):

```bash
cd ~/service/lessons-portal
export BACKEND_IMAGE=gitlab.local:5050/yurii.samohvalov/lesson-portal/backend:main
export FRONTEND_IMAGE=gitlab.local:5050/yurii.samohvalov/lesson-portal/frontend:main
./deploy/dockhand-deploy.sh
# или
./deploy/deploy-brix-pc.sh lessons.samoh.ru admin@samoh.ru
```

## 3. Dockhand

1. https://dockge.samoh.ru (порт 9988)
2. Stack path: `/home/ysamohvalov/service/lessons-portal`
3. Compose: `docker-compose.yml` + `docker-compose.prod.yml`
4. **Env file: `.env.runtime`** (результат decrypt; не ciphertext `.env`)
5. Pull & redeploy (без build)

Deploy-скрипт сам обновляет `env_path` на `.env.runtime`.

## 4. Nginx (на хосте)

```bash
cd ~/service/lessons-portal/nginx
sudo ./setup.sh lessons.samoh.ru admin@samoh.ru
```

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

| Email | Пароль | Роль |
|-------|--------|------|
| user@test.com | testpass123 | USER |
| moderator@test.com | testpass123 | MODERATOR |
| admin@test.com | testpass123 | ADMIN |

## 6. Ротация секрета

```bash
# на машине с master.key
./deploy/secrets.sh encrypt 'new-password'
# вставить ENC(...) в .env на brix
./deploy/dockhand-deploy.sh   # пересоберёт .env.runtime и recreate
```

Смена кода приложения = новый pipeline (новый image tag), не rebuild на brix.

## MinIO: каталог данных

`MINIO_DATA_DIR` в `.env` (можно plaintext). Миграция со старого volume:

```bash
MINIO_DIR="$(grep '^MINIO_DATA_DIR=' .env | cut -d= -f2- | tr -d '"')"
mkdir -p "$MINIO_DIR"
docker run --rm \
  -v lessons-portal_minio_data:/from \
  -v "$MINIO_DIR":/to \
  alpine sh -c "cp -a /from/. /to/"
```
