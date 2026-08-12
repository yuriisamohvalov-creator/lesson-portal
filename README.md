# Lessons Portal

Обучающий портал авто/мото тематики — статьи, курсы, модерация.

## Технологии

- **Backend**: NestJS + Prisma + PostgreSQL
- **Frontend**: Next.js (SSR/SSG)
- **Android**: Kotlin + Jetpack Compose
- **Хранилище**: MinIO (S3)
- **Кэш**: Redis

## Android-приложение

Мобильное приложение для портала разрабатывается в папке `android/`.

- **Техническое задание**: [docs/android-app-spec.md](docs/android-app-spec.md)
- **API-контракт**: [docs/android-api-contract.md](docs/android-api-contract.md)
- **Backend-изменения для mobile**: [docs/android-backend-changes.md](docs/android-backend-changes.md)
- **Архитектура**: [docs/android-architecture.md](docs/android-architecture.md)
- **Пошаговые задания для AI-агента**: [docs/android-tasks/](docs/android-tasks/)

Стек: Kotlin, Jetpack Compose, Hilt, Retrofit, Room, Paging 3, Navigation Compose, Coil.

Команды сборки, архитектура, настройка подписи и CI secrets описаны в [android/README.md](android/README.md). Android CI запускает unit-тесты, собирает debug APK и формирует подписанный release AAB для ветки `main`.

## Быстрый старт (разработка)

1. Скопируйте `.env.example` в `.env`:
   ```bash
   cp .env.example .env
   ```

2. Запустите стек:
   ```bash
   docker compose up
   ```

3. Откройте:
   - Frontend: http://localhost:3002
   - Backend API: http://localhost:3001
   - Swagger Docs: http://localhost:3001/api/docs
   - MinIO Console: http://localhost:9001

## Продакшен (brix-pc, lessons.samoh.ru)

Подробная инструкция: [docs/deploy-brix-pc.md](docs/deploy-brix-pc.md)

1. Скопируйте `.env.production.example` в `.env` на сервере
2. Запустите стек:
   ```bash
   ./deploy/deploy-brix-pc.sh lessons.samoh.ru
   ```
3. Настройте nginx:
   ```bash
   cd nginx && sudo ./setup.sh lessons.samoh.ru admin@samoh.ru
   ```

API: `https://lessons.samoh.ru/api/*` · Swagger: `https://lessons.samoh.ru/api/docs`

## CI/CD и деплой (Ansible + GitHub Actions)

Полная инфраструктура развёртывания находится в `deploy/ansible/`:

- `deploy/ansible/playbooks/deploy-local.yml` — локальный dev-стек
- `deploy/ansible/playbooks/build-and-push.yml` — сборка и пуш образов в `ghcr.io`
- `deploy/ansible/playbooks/deploy-brix-pc.yml` — продакшен-деплой на `brix-pc`
- `deploy/ansible/playbooks/setup-nginx-brix-pc.yml` — настройка nginx + TLS

GitHub Actions workflow: `.github/workflows/deploy.yml` запускает тесты, собирает образы и деплоит на `brix-pc` при push в `stable-release` или tags.

Подробнее: [deploy/ansible/README.md](deploy/ansible/README.md)

## Продакшен (локально)

1. Скопируйте `.env.example` в `.env` и заполните секреты:
   ```bash
   cp .env.example .env
   # Отредактируйте .env — замените все change_me_* значения
   ```

2. Запустите стек:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

3. Примените миграции:
   ```bash
   docker compose exec backend npx prisma migrate deploy
   ```

4. Заполните БД тестовыми данными (опционально):
   ```bash
   docker compose exec backend npx prisma db seed
   ```

## Структура

```
├── android/           # Android-приложение (Kotlin + Jetpack Compose)
│   └── app/           # Исходный код приложения
├── backend/           # NestJS API
│   ├── prisma/        # Schema и миграции
│   └── src/           # Модули: auth, users, categories, courses, articles, moderation, admin
├── frontend/          # Next.js SSR
│   └── src/           # Страницы и компоненты
├── docker-compose.yml           # Основной файл
├── docker-compose.override.yml  # Разработка (hot reload, порты)
└── docker-compose.prod.yml      # Продакшен (restart, порты)
```

## Команды

| Команда | Описание |
|---------|----------|
| `docker compose up` | Запуск (разработка) |
| `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d` | Запуск (продакшен) |
| `docker compose down` | Остановка (данные сохраняются) |
| `docker compose down -v` | Остановка + удаление данных |
| `docker compose restart backend` | Перезапуск backend |
| `docker compose exec backend npx prisma migrate deploy` | Применение миграций |
| `docker compose exec backend npx prisma db seed` | Seed данных |

## Доступ к сервисам

| Сервис | Разработка | Продакшен |
|--------|-----------|-----------|
| Frontend | localhost:3002 | Через nginx |
| Backend API | localhost:3001 | Через nginx |
| PostgreSQL | localhost:5432 | Только внутри сети |
| MinIO | localhost:9001 | Только внутри сети |
| Redis | localhost:6379 | Только внутри сети |

## Миграции

При первом запуске или обновлении:

```bash
# Применить все новые миграции
docker compose exec backend npx prisma migrate deploy

# Сбросить БД (разработка)
docker compose exec backend npx prisma migrate reset

# Генерация Prisma Client
docker compose exec backend npx prisma generate
```


```
Назначение роли администратора для уже существующего пользователя

 Для уже существующего пользователя (у тебя сейчас admin@test.com с ролью USER):

  UPDATE users
  SET role = 'ADMIN'
  WHERE email = 'admin@test.com';

  Проверка:

  SELECT id, email, display_name, role FROM users WHERE email = 'admin@test.com';

  Выполнить локально:

  docker compose -f docker-compose.yml -f docker-compose.override.yml --env-file .env \
    exec -T postgres psql -U lessons_user -d lessons_portal \
    -c "UPDATE users SET role = 'ADMIN' WHERE email = 'admin@test.com';"

  После этого нужно перелогиниться (JWT со старой ролью ещё в токене). Могу сразу выполнить UPDATE.


qw
```
