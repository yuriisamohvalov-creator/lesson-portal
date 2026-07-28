# Lessons Portal

Обучающий портал авто/мото тематики — статьи, курсы, модерация.

## Технологии

- **Backend**: NestJS + Prisma + PostgreSQL
- **Frontend**: Next.js (SSR/SSG)
- **Хранилище**: MinIO (S3)
- **Кэш**: Redis

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
