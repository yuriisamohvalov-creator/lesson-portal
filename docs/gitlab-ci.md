# GitLab CI/CD

Два pipeline деплоя для self-hosted GitLab (`gitlab.local`):

| Job | Ветка | Когда | Куда |
|-----|-------|-------|------|
| `deploy:local` | `develop` | автоматически после push | dev-стек на машине runner (SER9) |
| `build:images` | `stable-release`, tags | после тестов | push в GitLab Container Registry |
| `deploy:prod` | `stable-release`, tags | после `build:images` (tags — manual) | pull на brix-pc → https://lessons.samoh.ru |

Тесты (`backend:check`, `frontend:check`) запускаются на MR и push в `develop` / `main` / `stable-release`.
Ветка `main` **не** деплоит прод — только проверки. Прод обновляется при merge/push в `stable-release`.
Один job = один `npm ci` (lint+test/build вместе), shallow clone `GIT_DEPTH=50`.
Runner: shell на SER9, tag `lessons-portal`, **`concurrent = 2`**.
`PRISMA_SKIP_POSTINSTALL_GENERATE=true` + `NODE_OPTIONS=--max-old-space-size=2048 --dns-result-order=ipv4first`.

### npm cache (SER9)

| Слой | Путь / URL | Назначение |
|------|------------|------------|
| Verdaccio | `http://127.0.0.1:4873` | локальный proxy/кэш tarball’ов с npmjs |
| Host npm cache | `/home/gitlab-runner/.npm` | общий `_cacache` |

CI vars: `npm_config_registry=http://127.0.0.1:4873`, `npm_config_cache=/home/gitlab-runner/.npm`.

## 1. GitLab Runner (shell, SER9)

```bash
sudo gitlab-runner register \
  --url "http://gitlab.local/" \
  --token "YOUR_RUNNER_TOKEN" \
  --executor shell \
  --description "lessons-portal SER9" \
  --tag-list "lessons-portal"

sudo usermod -aG docker gitlab-runner
sudo systemctl restart gitlab-runner
```

## 2. Container Registry (обязательно для prod)

Registry уже слушает **`gitlab.local:5050`** (HTTP). Образы:

- `gitlab.local:5050/yurii.samohvalov/lesson-portal/backend:<sha|stable-release|tag>`
- `gitlab.local:5050/yurii.samohvalov/lesson-portal/frontend:<sha|stable-release|tag>`

Job `build:images` логинится через встроенные `CI_REGISTRY*` и пушит `:sha` + `:stable-release` (или git tag).

На **brix** при деплое CI передаёт `CI_REGISTRY_USER` / `CI_REGISTRY_PASSWORD` (job token) в `docker login`. Альтернатива: Deploy Token (read_registry) и `docker login` один раз на brix.

## 3. Локальный деплой (develop)

Без registry: rsync + `compose build` на SER9 (как раньше).

```bash
mkdir -p /home/ysamohvalov/service/lessons-portal-local
cp .env.example /home/ysamohvalov/service/lessons-portal-local/.env
```

| Variable | Пример |
|----------|--------|
| `LOCAL_DEPLOY_DIR` | `/home/gitlab-runner/lessons-portal` |
| `LOCAL_ENV_FILE` | путь к `.env` на runner-хосте |

## 4. Prod деплой (stable-release / tags)

**На проде нет сборки.** CI пушит образы → brix делает `docker pull` + `compose up --no-build`.

### Секреты ENC(...) + мастер-ключ

На brix один раз:

```bash
./deploy/secrets.sh gen-key
# → ~/.config/lessons-portal/master.key (chmod 600)

cp .env.production.example .env.plain
# заполните plaintext-секреты
./deploy/secrets.sh encrypt-env .env.plain .env
shred -u .env.plain   # или безопасное удаление
```

В `.env` на диске:

```bash
POSTGRES_PASSWORD=ENC(U2FsdGVkX1...)
JWT_SECRET=ENC(...)
# не-секреты — plaintext
FRONTEND_URL=https://lessons.samoh.ru
```

Перед `compose up` скрипт пишет `.env.runtime` (plaintext, `chmod 600`, в `.gitignore`). Dockhand должен указывать **`.env.runtime`**, не ciphertext `.env`.

Мастер-ключ: только файл на brix (`SECRETS_MASTER_KEY_FILE` / `SECRETS_MASTER_KEY`). Не коммитить, не класть в GitLab CI Variables для runtime.

Обязательно ENC: `POSTGRES_PASSWORD`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET`.

### CI/CD Variables

| Variable | Type | Пример | Описание |
|----------|------|--------|----------|
| `BRIX_PC_HOST` | Variable | `brix-pc` | SSH host |
| `BRIX_PC_USER` | Variable | `ysamohvalov` | SSH user |
| `BRIX_PC_DEPLOY_DIR` | Variable | `/home/ysamohvalov/service/lessons-portal` | Путь на сервере |
| `SSH_PRIVATE_KEY` | **File** (optional) | — | Приватный ключ для SSH на brix-pc. Если битый/с паролем — job падает на `error in libcrypto`; тогда используется `~/.ssh/id_ed25519` у `gitlab-runner` |
| `SSH_KNOWN_HOSTS` | Variable (optional) | output of `ssh-keyscan brix-pc` | Host key |

`CI_REGISTRY*` задаёт GitLab автоматически, если registry включён.

**Если `deploy:prod` падает с `error in libcrypto`:** переменная `SSH_PRIVATE_KEY` повреждена (часто вставили как Variable вместо File, или RSA с passphrase). Варианты:
1. Пересоздать File variable: содержимое `-----BEGIN OPENSSH PRIVATE KEY-----` … без passphrase, с реальными переводами строк.
2. Либо удалить/очистить `SSH_PRIVATE_KEY` — скрипт возьмёт host-ключ `/home/gitlab-runner/.ssh/id_ed25519` (публичный ключ должен быть в `authorized_keys` на brix-pc).

### Процесс

1. `build:images` — build + push backend/frontend  
2. rsync на brix: только `docker-compose*.yml`, `deploy/*.sh`, `nginx/` (без исходников npm)  
3. На brix: decrypt `.env` → `.env.runtime`, `docker login`, pull, `up --no-build`, migrate  

### Troubleshooting

**`error in libcrypto` / SSH** — починить или удалить `SSH_PRIVATE_KEY`; fallback на `~/.ssh/id_ed25519` у `gitlab-runner`.

**`BRIX_PC_DEPLOY_DIR` File** — сменить тип на Variable.

**`CI_REGISTRY_IMAGE is empty`** — включить Container Registry у проекта / GitLab.

**`master key not found`** — создать ключ на brix: `./deploy/secrets.sh gen-key`.

**`BACKEND_IMAGE must be set`** — CI должен передать pin; либо прописать в `.env` теги `.../backend:stable-release`.

## 5. Workflow

```
feature → MR → develop → [deploy:local, build on SER9]
                    ↓ merge
                  main → tests only
                    ↓ merge (release)
           stable-release → build:images (registry) → deploy:prod (pull on brix)
```

## 6. Ручной запуск

```bash
# Dev
LOCAL_DEPLOY_DIR=~/service/lessons-portal-local \
LOCAL_ENV_FILE=~/service/lessons-portal-local/.env \
  ./deploy/gitlab-local-deploy.sh

# Encrypt a single value
SECRETS_MASTER_KEY_FILE=~/.config/lessons-portal/master.key \
  ./deploy/secrets.sh encrypt 'my-secret'

# Prod from a machine with SSH to brix (expects images already in registry)
CI_REGISTRY_IMAGE=gitlab.local:5050/yurii.samohvalov/lesson-portal \
CI_COMMIT_SHA=abcdef... \
  ./deploy/gitlab-prod-deploy.sh
```
