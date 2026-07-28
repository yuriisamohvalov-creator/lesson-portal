# Nginx Reverse Proxy — lessons.samoh.ru

Nginx работает **на хосте** (не в Docker), проксирует трафик в контейнеры на localhost.

## Маршрутизация

| Путь | Назначение |
|------|------------|
| `/api/*` | Backend (NestJS, порт 3071) |
| `/health` | Backend health check |
| `/_next/static/*` | Frontend static (кэш 7 дней) |
| `/*` | Frontend Next.js (порт 3070) |

Префикс `/api` устраняет конфликт между страницами Next.js (`/articles`, `/courses`) и JSON API.

## Установка

```bash
sudo ./setup.sh lessons.samoh.ru admin@samoh.ru
```

## Файлы

- `portal.conf` — конфигурация nginx
- `setup.sh` — автоматическая установка + certbot

## Требования

- Docker stack запущен (`3070`, `3071` на 127.0.0.1)
- DNS `lessons.samoh.ru` → IP сервera brix-pc
- nginx и certbot установлены
