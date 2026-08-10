# API-контракт для Android-приложения Lessons Portal

Документ описывает все endpoint'ы backend'а, которые использует Android-приложение, с точными форматами запросов и ответов. Используется как единый источник истины при генерации DTO и API-интерфейсов в Kotlin.

## Базовые сведения

- **Базовый URL (prod)**: `https://lessons.samoh.ru/api`
- **Базовый URL (dev, Docker)**: `http://10.0.2.2:3001/api` (для Android Emulator) или `http://<local-ip>:3001/api`
- **Global prefix**: `/api`
- **Content-Type**: `application/json` для JSON-запросов, `multipart/form-data` для загрузки файлов
- **Авторизация**: `Authorization: Bearer <accessToken>`

## Общие типы

### Пагинация

Все списочные endpoint'ы (кроме `GET /categories`) возвращают объект:

```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### Формат ошибок

При ошибке backend возвращает стандартный NestJS-ответ:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

или для одного поля:

```json
{
  "statusCode": 400,
  "message": ["password must be longer than or equal to 8 characters"],
  "error": "Bad Request"
}
```

Мобильное приложение должно парсить `message` (строка или массив строк) и показывать человекочитаемое сообщение.

### Роли пользователей

```kotlin
enum class UserRole { USER, MODERATOR, ADMIN }
```

### Статусы статей

```kotlin
enum class ArticleStatus { DRAFT, PENDING, PUBLISHED, REJECTED }
```

---

## 1. Авторизация

### 1.1 Регистрация

- **Method**: `POST`
- **Path**: `/auth/register`
- **Auth**: нет
- **Throttle**: 5 запросов в минуту

**Request:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "Иван Петров"
}
```

**Response (201):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "displayName": "Иван Петров",
  "role": "USER",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

**Errors:**
- `409 Conflict` — email уже зарегистрирован
- `400 Bad Request` — невалидный email, пароль < 8 символов, пустое displayName

### 1.2 Вход

- **Method**: `POST`
- **Path**: `/auth/login`
- **Auth**: нет
- **Throttle**: 5 запросов в минуту

**Request:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200) — требуемый формат для mobile:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "displayName": "Иван Петров",
    "role": "USER"
  }
}
```

> **Важно:** текущий backend возвращает только `accessToken` и `user`, а `refreshToken` пишет в httpOnly-cookie. Для Android нужно доработать backend, чтобы `refreshToken` возвращался в теле (см. `docs/android-backend-changes.md`).

**Errors:**
- `401 Unauthorized` — неверные учётные данные
- `403 Forbidden` — аккаунт заблокирован

### 1.3 Обновление access-токена

- **Method**: `POST`
- **Path**: `/auth/refresh`
- **Auth**: нет
- **Body**: `RefreshRequest`

**Request (требуемый формат для mobile):**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `401 Unauthorized` — отсутствует/невалиден refresh-токен

### 1.4 Выход

- **Method**: `POST`
- **Path**: `/auth/logout`
- **Auth**: нет (для mobile) или Bearer accessToken

**Request (mobile):**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**

```json
{
  "message": "Logged out"
}
```

> **Примечание:** текущий backend очищает только cookie. Для mobile рекомендуется либо не вызывать logout на backend (просто удалить токены на устройстве), либо добавить backend-чейндж для инвалидации refresh-токена по телу запроса.

---

## 2. Пользователи

### 2.1 Текущий пользователь

- **Method**: `GET`
- **Path**: `/users/me`
- **Auth**: Bearer

**Response (200):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "displayName": "Иван Петров",
  "role": "USER",
  "isBlocked": false,
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

### 2.2 Обновление профиля

- **Method**: `PATCH`
- **Path**: `/users/me`
- **Auth**: Bearer

**Request:**

```json
{
  "displayName": "Иван Иванов"
}
```

**Response (200):** тот же объект пользователя, что и в `GET /users/me`.

### 2.3 Список пользователей (admin)

- **Method**: `GET`
- **Path**: `/users`
- **Auth**: Bearer, роль `ADMIN`
- **Query**: `?page=1&limit=20&role=USER&isBlocked=false`

**Response (200):** пагинированный список пользователей.

### 2.4 Смена роли (admin)

- **Method**: `PATCH`
- **Path**: `/users/{id}/role`
- **Auth**: Bearer, роль `ADMIN`

**Request:**

```json
{
  "role": "MODERATOR"
}
```

**Response (200):** объект пользователя.

**Errors:**
- `400 Bad Request` — роль не изменилась
- `403 Forbidden` — нельзя понизить последнего администратора

### 2.5 Блокировка пользователя (admin)

- **Method**: `PATCH`
- **Path**: `/users/{id}/block`
- **Auth**: Bearer, роль `ADMIN`

**Response (200):** объект пользователя с `isBlocked: true`.

### 2.6 Разблокировка пользователя (admin)

- **Method**: `PATCH`
- **Path**: `/users/{id}/unblock`
- **Auth**: Bearer, роль `ADMIN`

**Response (200):** объект пользователя с `isBlocked: false`.

### 2.7 Удаление пользователя (admin)

- **Method**: `DELETE`
- **Path**: `/users/{id}`
- **Auth**: Bearer, роль `ADMIN`

**Response (200):**

```json
{
  "deleted": true
}
```

---

## 3. Категории

### 3.1 Список категорий

- **Method**: `GET`
- **Path**: `/categories`
- **Auth**: нет

**Response (200):**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Двигатель",
    "slug": "dvigatel"
  }
]
```

### 3.2 Детальная категории

- **Method**: `GET`
- **Path**: `/categories/{id}`
- **Auth**: нет

**Response (200):** объект категории.

### 3.3 Создание категории (admin)

- **Method**: `POST`
- **Path**: `/categories`
- **Auth**: Bearer, роль `ADMIN`

**Request:**

```json
{
  "name": "Трансмиссия",
  "slug": "transmissiya"
}
```

**Response (201):** объект категории.

### 3.4 Обновление категории (admin)

- **Method**: `PATCH`
- **Path**: `/categories/{id}`
- **Auth**: Bearer, роль `ADMIN`

**Request:**

```json
{
  "name": "Трансмиссия (обновлено)"
}
```

**Response (200):** объект категории.

### 3.5 Удаление категории (admin)

- **Method**: `DELETE`
- **Path**: `/categories/{id}`
- **Auth**: Bearer, роль `ADMIN`

**Response (200):** объект удалённой категории.

---

## 4. Статьи

### 4.1 Список опубликованных статей

- **Method**: `GET`
- **Path**: `/articles`
- **Auth**: нет
- **Query**: `?page=1&limit=20&categoryId=...&search=...`

**Response (200):**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "title": "Как заменить масло",
      "slug": "kak-zamenit-maslo",
      "content": null,
      "status": "PUBLISHED",
      "author": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "displayName": "Иван Петров"
      },
      "category": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Двигатель",
        "slug": "dvigatel"
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "publishedAt": "2024-01-16T08:00:00.000Z",
      "rejectionReason": null,
      "coverUrl": "https://img.youtube.com/vi/VIDEO_ID/0.jpg",
      "hasVideo": true
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

> Поля `coverUrl` и `hasVideo` вычисляются backend'ом на основе первого видео статьи.

### 4.2 Мои статьи

- **Method**: `GET`
- **Path**: `/articles/mine`
- **Auth**: Bearer

**Response (200):** массив статей текущего пользователя (не пагинированный). Каждая статья включает `lastRejectionComment` — последний комментарий модератора при отклонении.

```json
[
  {
    "id": "...",
    "title": "...",
    "slug": "...",
    "status": "REJECTED",
    "category": { "id": "...", "name": "...", "slug": "..." },
    "createdAt": "...",
    "publishedAt": null,
    "rejectionReason": "Недостаточно подробно",
    "lastRejectionComment": "Недостаточно подробно"
  }
]
```

### 4.3 Детальная статья

- **Method**: `GET`
- **Path**: `/articles/{id}`
- **Auth**: опционально (Bearer) — требуется для просмотра черновиков/на модерации
- **Query**: `?courseId=...` (опционально, для построения навигации по курсу)

**Response (200):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "title": "Как заменить масло",
  "slug": "kak-zamenit-maslo",
  "content": "<p>Текст статьи в HTML...</p>",
  "status": "PUBLISHED",
  "author": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "displayName": "Иван Петров"
  },
  "category": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Двигатель",
    "slug": "dvigatel"
  },
  "createdAt": "2024-01-15T10:30:00.000Z",
  "publishedAt": "2024-01-16T08:00:00.000Z",
  "rejectionReason": null,
  "videos": [
    {
      "id": "...",
      "type": "YOUTUBE",
      "youtubeUrl": "https://www.youtube.com/watch?v=VIDEO_ID",
      "s3Key": null,
      "s3Bucket": null,
      "thumbnailKey": null,
      "duration": null,
      "processStatus": "ready",
      "createdAt": "..."
    }
  ],
  "courseNav": {
    "course": {
      "id": "...",
      "name": "Базовый курс"
    },
    "previous": { "id": "...", "title": "Предыдущая статья" },
    "next": { "id": "...", "title": "Следующая статья" }
  }
}
```

### 4.4 Создание статьи

- **Method**: `POST`
- **Path**: `/articles`
- **Auth**: Bearer

**Request:**

```json
{
  "title": "Новая статья",
  "content": "<p>Содержимое в HTML</p>",
  "categoryId": "550e8400-e29b-41d4-a716-446655440001"
}
```

**Response (201):** объект созданной статьи со статусом `DRAFT`.

### 4.5 Обновление статьи

- **Method**: `PATCH`
- **Path**: `/articles/{id}`
- **Auth**: Bearer

**Request:**

```json
{
  "title": "Обновленный заголовок",
  "content": "<p>Обновленное содержимое</p>",
  "categoryId": "550e8400-e29b-41d4-a716-446655440001"
}
```

**Response (200):** объект обновлённой статьи.

> **Важно:** если статья была `PUBLISHED`, любое изменение возвращает её в статус `DRAFT` и требует повторной модерации.

**Errors:**
- `403 Forbidden` — редактировать можно только свою статью (или admin/moderator)

### 4.6 Отправка на модерацию

- **Method**: `POST`
- **Path**: `/articles/{id}/submit`
- **Auth**: Bearer

**Response (200):** объект статьи со статусом `PENDING`.

**Errors:**
- `409 Conflict` — отправить можно только `DRAFT` или `REJECTED`

### 4.7 Удаление статьи

- **Method**: `DELETE`
- **Path**: `/articles/{id}`
- **Auth**: Bearer

**Response (200):**

```json
{
  "success": true
}
```

**Errors:**
- `403 Forbidden` — удалить можно только свою статью (admin тоже может)
- `409 Conflict` — удалить можно только `DRAFT` или `REJECTED`

---

## 5. Комментарии

### 5.1 Список комментариев к статье

- **Method**: `GET`
- **Path**: `/articles/{articleId}/comments`
- **Auth**: нет

**Response (200):**

```json
[
  {
    "id": "...",
    "body": "Спасибо, очень полезно!",
    "author": {
      "id": "...",
      "displayName": "Иван Петров"
    },
    "createdAt": "2024-01-15T12:00:00.000Z"
  }
]
```

### 5.2 Добавление комментария

- **Method**: `POST`
- **Path**: `/articles/{articleId}/comments`
- **Auth**: Bearer

**Request:**

```json
{
  "body": "Отличная статья!"
}
```

**Response (201):** объект созданного комментария.

**Errors:**
- `403 Forbidden` — комментировать можно только опубликованные статьи

### 5.3 Удаление комментария

- **Method**: `DELETE`
- **Path**: `/articles/{articleId}/comments/{commentId}`
- **Auth**: Bearer

**Response (200):** удалённый комментарий.

---

## 6. Видео

> **Примечание:** Android-приложение работает только с YouTube-ссылками. Загрузка видео-файлов на MinIO из мобильного приложения не поддерживается.

### 6.1 Список видео статьи

- **Method**: `GET`
- **Path**: `/articles/{articleId}/videos`
- **Auth**: нет

**Response (200):**

```json
[
  {
    "id": "...",
    "type": "YOUTUBE",
    "youtubeUrl": "https://www.youtube.com/watch?v=VIDEO_ID",
    "s3Key": null,
    "s3Bucket": null,
    "thumbnailKey": null,
    "duration": null,
    "processStatus": "ready",
    "createdAt": "..."
  }
]
```

### 6.2 Добавление YouTube-видео

- **Method**: `POST`
- **Path**: `/articles/{articleId}/videos/youtube`
- **Auth**: Bearer

**Request:**

```json
{
  "youtubeUrl": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

**Response (201):** объект видео.

### 6.3 Удаление видео

- **Method**: `DELETE`
- **Path**: `/articles/{articleId}/videos/{videoId}`
- **Auth**: Bearer

**Response (200):** удалённое видео.

---

## 7. Курсы

### 7.1 Список курсов

- **Method**: `GET`
- **Path**: `/courses`
- **Auth**: нет
- **Query**: `?page=1&limit=20&categoryId=...`

**Response (200):**

```json
{
  "data": [
    {
      "id": "...",
      "name": "Базовый курс по ремонту",
      "description": "Описание курса",
      "slug": "bazovyy-kurs-po-remontu",
      "status": "published",
      "author": {
        "id": "...",
        "displayName": "Иван Петров"
      },
      "createdAt": "...",
      "articles": [
        {
          "id": "...",
          "article": {
            "id": "...",
            "title": "Статья 1",
            "slug": "statya-1",
            "status": "PUBLISHED"
          },
          "order": 1
        }
      ]
    }
  ],
  "meta": { ... }
}
```

### 7.2 Детальная курса

- **Method**: `GET`
- **Path**: `/courses/{id}`
- **Auth**: опционально (Bearer)

**Response (200):** объект курса со списком статей в порядке `order`.

---

## 8. Модерация

> Доступно для ролей `MODERATOR` и `ADMIN`.

### 8.1 Очередь модерации

- **Method**: `GET`
- **Path**: `/moderation/queue`
- **Auth**: Bearer, роль `MODERATOR` или `ADMIN`
- **Query**: `?page=1&limit=20`

**Response (200):** пагинированный список статей со статусом `PENDING`.

### 8.2 Одобрение статьи

- **Method**: `POST`
- **Path**: `/moderation/articles/{id}/approve`
- **Auth**: Bearer, роль `MODERATOR` или `ADMIN`

**Response (200):** объект статьи со статусом `PUBLISHED`.

### 8.3 Отклонение статьи

- **Method**: `POST`
- **Path**: `/moderation/articles/{id}/reject`
- **Auth**: Bearer, роль `MODERATOR` или `ADMIN`

**Request:**

```json
{
  "comment": "Недостаточно подробно описан процесс"
}
```

**Response (200):** объект статьи со статусом `REJECTED`.

### 8.4 История модерации

- **Method**: `GET`
- **Path**: `/moderation/articles/{id}/history`
- **Auth**: Bearer, роль `MODERATOR` или `ADMIN`

**Response (200):**

```json
[
  {
    "id": "...",
    "action": "APPROVE",
    "comment": null,
    "moderator": { "id": "...", "displayName": "..." },
    "createdAt": "..."
  }
]
```

---

## 9. Админка

> Доступно только для роли `ADMIN`.

### 9.1 Статистика

- **Method**: `GET`
- **Path**: `/admin/stats`
- **Auth**: Bearer, роль `ADMIN`

**Response (200):**

```json
{
  "totalUsers": 100,
  "totalArticles": 500,
  "totalCourses": 20,
  "pendingArticles": 5
}
```

> Точная структура зависит от реализации `AdminService.getStats()`.

### 9.2 Все статьи (admin view)

- **Method**: `GET`
- **Path**: `/admin/articles`
- **Auth**: Bearer, роль `ADMIN`
- **Query**: `?page=1&limit=20&status=PENDING`

**Response (200):** пагинированный список статей.

---

## 10. Загрузка файлов

> **Важно:** endpoint `/uploads/image` отсутствует в текущем backend и требует реализации (см. `docs/android-backend-changes.md`).

### 10.1 Загрузка изображения

- **Method**: `POST`
- **Path**: `/uploads/image`
- **Auth**: Bearer
- **Content-Type**: `multipart/form-data`

**Request:**

```
POST /api/uploads/image
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="photo.jpg"
Content-Type: image/jpeg

<binary data>
------WebKitFormBoundary--
```

**Response (201):**

```json
{
  "url": "https://lessons.samoh.ru/api/uploads/photo-uuid.jpg"
}
```

**Ограничения (рекомендуемые):**
- Максимальный размер: 5 МБ
- Разрешённые форматы: `image/jpeg`, `image/png`, `image/webp`

---

## 11. Импорт PDF

### 11.1 Импорт текста из PDF

- **Method**: `POST`
- **Path**: `/pdf-import`
- **Auth**: Bearer
- **Content-Type**: `multipart/form-data`

**Request:**

```
POST /api/pdf-import
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="document.pdf"
Content-Type: application/pdf

<binary data>
------WebKitFormBoundary--
```

**Response (200):**

```json
{
  "text": "Чистый текст...",
  "html": "<p>HTML-версия текста</p>",
  "suggestedTitle": "Заголовок документа",
  "metadata": { }
}
```

**Ограничения:**
- Максимальный размер: 20 МБ (настраивается через `PDF_IMPORT_MAX_MB`)
- Только PDF-файлы

---

## Kotlin DTO — сводная таблица

| Backend тип | Kotlin DTO |
|-------------|-----------|
| `User` (public) | `UserDto(id, email, displayName, role, isBlocked, createdAt)` |
| `Author` | `AuthorDto(id, displayName)` |
| `Category` | `CategoryDto(id, name, slug)` |
| `Article` (list item) | `ArticleListItemDto(..., coverUrl, hasVideo)` |
| `Article` (detail) | `ArticleDto(..., videos, courseNav)` |
| `Video` | `VideoDto(...)` |
| `Comment` | `CommentDto(id, body, author, createdAt)` |
| `Course` | `CourseDto(...)` |
| `CourseArticle` | `CourseArticleDto(id, order, article)` |
| `ModerationLog` | `ModerationLogDto(...)` |

## Дополнительные требования к Android-клиенту

1. **Автоматический refresh**: при получении `401` от любого защищённого endpoint'а клиент должен вызвать `POST /auth/refresh` и повторить исходный запрос.
2. **Хранение токенов**: access и refresh токены хранятся только в `EncryptedSharedPreferences`.
3. **Пагинация**: списки статей, курсов, пользователей и очередь модерации используют Paging 3.
4. **Офлайн-кеш**: статьи и категории кешируются в Room; при отсутствии сети отдаются закешированные данные.
5. **YouTube**: видео открываются через WebView с embed URL `https://www.youtube.com/embed/{videoId}`.
