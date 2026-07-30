# GitLab CI/CD

Два pipeline деплоя для self-hosted GitLab (`gitlab.local`):

| Job | Ветка | Когда | Куда |
|-----|-------|-------|------|
| `deploy:local` | `develop` | автоматически после push | dev-стек на машине runner (SER9) |
| `deploy:prod` | `main`, tags | **вручную** (Play) | prod на brix-pc → https://lessons.samoh.ru |

Тесты (`backend:check`, `frontend:check`) запускаются на MR и push в `develop` / `main`.
Один job = один `npm ci` (lint+test/build вместе), shallow clone `GIT_DEPTH=50`.
Runner: 5× shell на SER9 (`lessons-portal SER9` … `SER9-5`), tag `lessons-portal`, `concurrent = 5`.

### npm cache (SER9)

GitLab `cache:` для `.npm/` на shell executor **не работал** (`Failed to extract cache`). Вместо этого:

| Слой | Путь / URL | Назначение |
|------|------------|------------|
| Verdaccio | `http://127.0.0.1:4873` | локальный proxy/кэш tarball’ов с npmjs |
| Host npm cache | `/home/gitlab-runner/.npm` | общий `_cacache` для всех 5 runners |

```bash
# Verdaccio
cd /home/ysamohvalov/project/devops/verdaccio && docker compose up -d
curl -sf http://127.0.0.1:4873/-/ping   # {}
# UI: http://SER9:4873/
```

CI vars: `npm_config_registry=http://127.0.0.1:4873`, `npm_config_cache=/home/gitlab-runner/.npm`.

**Почему не Nexus / GitLab Package Registry:** Package Registry в GitLab — для публикации своих пакетов, не pull-through proxy npmjs. Nexus3 избыточен только для npm. Verdaccio легче и заточен под npm.

**Почему не только host `.npm`:** без registry-proxy разные runners всё равно бьют в npmjs при промахе метаданных; Verdaccio хранит пакеты на диске и отдаёт локально.

## 1. GitLab Runner (shell, SER9)

На машине, где будет локальный деплой:

```bash
# Установка (Ubuntu/Debian)
curl -L "https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.deb.sh" | sudo bash
sudo apt install gitlab-runner

# Регистрация (токен: GitLab → Settings → CI/CD → Runners)
sudo gitlab-runner register \
  --url "https://gitlab.local/" \
  --token "YOUR_RUNNER_TOKEN" \
  --executor shell \
  --description "lessons-portal SER9" \
  --tag-list "lessons-portal,shell,local"

# Runner должен иметь доступ к docker без sudo
sudo usermod -aG docker gitlab-runner
sudo systemctl restart gitlab-runner
```

Проверка:

```bash
sudo gitlab-runner verify
sudo gitlab-runner list
```

## 2. Локальный деплой (develop)

### Подготовка каталога на runner-хосте

```bash
mkdir -p /home/ysamohvalov/service/lessons-portal-local
cp /path/to/lesson-portal/.env.example /home/ysamohvalov/service/lessons-portal-local/.env
# Отредактируйте .env — секреты, FRONTEND_URL=http://localhost:3002
```

### CI/CD Variables (GitLab → Settings → CI/CD → Variables)

| Variable | Пример | Описание |
|----------|--------|----------|
| `LOCAL_DEPLOY_DIR` | `/home/ysamohvalov/service/lessons-portal-local` | Куда rsync + docker compose |
| `LOCAL_ENV_FILE` | `/home/ysamohvalov/service/lessons-portal-local/.env` | Env-файл на runner-хосте |

Если переменные не заданы — используются значения по умолчанию из скрипта.

### Результат

После push в `develop`:

- Frontend: http://localhost:3002
- Backend: http://localhost:3001
- Swagger: http://localhost:3001/api/docs

## 3. Prod деплой на brix-pc (main / tags)

Запускается **вручную** в GitLab UI (кнопка ▶ на job `deploy:prod`).

### CI/CD Variables

| Variable | Type | Пример | Описание |
|----------|------|--------|----------|
| `BRIX_PC_HOST` | Variable | `brix-pc` | SSH host |
| `BRIX_PC_USER` | Variable | `ysamohvalov` | SSH user |
| `BRIX_PC_DEPLOY_DIR` | Variable | `/home/ysamohvalov/service/lessons-portal` | Путь на сервере |
| `SSH_PRIVATE_KEY` | **File** | — | Приватный ключ для SSH на brix-pc |
| `SSH_KNOWN_HOSTS` | Variable (optional) | output of `ssh-keyscan brix-pc` | Host key |

На brix-pc должен быть настроен `.env` (см. [deploy-brix-pc.md](deploy-brix-pc.md)).

### Процесс

1. `rsync` кода на brix-pc (без `.env`, `node_modules`)
2. Запуск `deploy/dockhand-deploy.sh` на сервере
3. Build образов, `docker compose up`, миграции Prisma

## 4. Workflow

```
feature branch → MR → develop → [auto deploy:local]
                              ↓ merge
                            main → [manual deploy:prod] → lessons.samoh.ru
```

## 5. Локальный запуск скриптов вручную

```bash
# Dev deploy (без GitLab)
LOCAL_DEPLOY_DIR=~/service/lessons-portal-local \
LOCAL_ENV_FILE=~/service/lessons-portal-local/.env \
  ./deploy/gitlab-local-deploy.sh

# Prod deploy (нужен SSH-доступ к brix-pc)
./deploy/gitlab-prod-deploy.sh
```

## 6. Troubleshooting

**Runner не подхватывает job** — проверьте tag `lessons-portal` у runner и что runner не paused. URL runner должен быть `http://gitlab.local` (не https). Токен — `glrt-...` из Settings → CI/CD → Runners.

**403 Forbidden при polling jobs** — перерегистрируйте runner или обновите token в `/etc/gitlab-runner/config.toml`.

**SSH на brix-pc из runner** — пользователь `gitlab-runner` не резолвит `brix-pc`; задайте `BRIX_PC_HOST=192.168.150.90` в CI variables. Добавьте deploy-ключ runner в `authorized_keys` на brix-pc.

**Permission denied (docker)** — добавьте `gitlab-runner` в группу `docker`.

**SSH на brix-pc** — проверьте `SSH_PRIVATE_KEY` (File variable) и что публичный ключ добавлен в `~/.ssh/authorized_keys` на brix-pc.

**`.env not found`** — создайте env-файл на runner-хосте вне репозитория (не коммитить секреты).
