# Техническое задание: Android-приложение Lessons Portal

## 1. Общие сведения

- **Название проекта**: Lessons Portal Android
- **Платформа**: Android 8.0+ (API 26+)
- **Язык**: Kotlin
- **UI-фреймворк**: Jetpack Compose
- **Архитектура**: MVVM + Clean Architecture
- **DI**: Hilt
- **Сеть**: Retrofit2 + OkHttp + Kotlin Serialization
- **Локальное хранилище**: Room
- **Навигация**: Jetpack Navigation Compose
- **Изображения**: Coil
- **Видео**: YouTube IFrame API через WebView
- **Backend**: существующий NestJS REST API (`https://lessons.samoh.ru/api`)

## 2. Функциональные требования

### 2.1 Авторизация и регистрация

- Экран входа по email и паролю.
- Экран регистрации: email, пароль, отображаемое имя.
- Валидация полей:
  - email — корректный формат;
  - пароль — минимум 8 символов;
  - отображаемое имя — не пустое.
- Хранение access/refresh токенов в `EncryptedSharedPreferences`.
- Автоматическое обновление access-токена при 401.
- Выход из аккаунта с очисткой токенов и локального кеша.

### 2.2 Нижняя навигация

Четыре основных раздела:

1. **Каталог** — категории и статьи.
2. **Курсы** — список курсов.
3. **Мои статьи** — статьи текущего пользователя.
4. **Профиль** — профиль, настройки, выход.

### 2.3 Каталог статей

- Экран списка категорий (`GET /categories`).
- Экран списка статей (`GET /articles`) с:
  - пагинацией (page/limit);
  - фильтром по категории;
  - поиском по подстроке в заголовке;
  - pull-to-refresh;
  - skeleton-загрузкой.
- Карточка статьи: заголовок, автор, категория, дата.

### 2.4 Детальная статья

- Заголовок, автор, категория, дата публикации.
- HTML-контент отображается через WebView с базовыми стилями.
- Список видео статьи (`GET /articles/:articleId/videos`).
- YouTube-видео открывается во встроенном плеере (WebView с YouTube IFrame API).
- Блок комментариев:
  - список комментариев (`GET /articles/:articleId/comments`);
  - добавление комментария (`POST /articles/:articleId/comments`).
- Для авторов/модераторов: кнопки "Редактировать", "Отправить на модерацию", "Удалить".

### 2.5 Создание и редактирование статьи

- Поле заголовка.
- Выбор категории из списка.
- Редактор контента:
  - MVP: Markdown-редактор с preview.
  - Расширенный вариант: WYSIWYG с кнопками bold/italic/heading/list/link/image.
- Загрузка изображений в тело статьи (`POST /uploads/image`) с вставкой URL.
- Импорт текста из PDF через `POST /pdf-import` (опционально).
- Автосохранение черновика в Room каждые 10 секунд.
- Кнопки: "Сохранить черновик", "Отправить на модерацию".

### 2.6 Курсы

- Список курсов (`GET /courses`) с карточками.
- Деталь курса: название, описание, список статей в порядке `order`.
- Переход к статье из курса.

### 2.7 Мои статьи

- Табы: "Черновики", "На модерации", "Опубликованные", "Отклонённые".
- Данные из `GET /articles/mine`.
- Свайп для удаления/редактирования.

### 2.8 Профиль

- Отображение email, отображаемого имени, роли.
- Редактирование профиля (`PATCH /users/me`).
- Выход из аккаунта.
- Для admin: кнопка "Админ-панель".

### 2.9 Модерация

- Экран доступен для ролей `MODERATOR` и `ADMIN`.
- Список статей со статусом `PENDING`.
- Кнопки: "Одобрить" (`POST /moderation/:id/approve`), "Отклонить" с причиной (`POST /moderation/:id/reject`).

### 2.10 Админ-панель

- Доступно только `ADMIN`.
- Управление пользователями:
  - список (`GET /users`);
  - блокировка/разблокировка;
  - смена роли.
- Управление категориями (создание/редактирование/удаление).

### 2.11 Офлайн-режим

- Кеширование просмотренных статей в Room.
- Возможность чтения закешированных статей без сети.
- Индикатор офлайн-режима.
- Синхронизация черновиков при появлении сети (WorkManager).

## 3. Нефункциональные требования

- Поддержка тёмной и светлой темы (Material3 dynamic colors — опционально).
- Адаптивная вёрстка для телефонов и планшетов.
- Обработка ошибок сети и retry.
- Минимум анимаций, приоритет — производительность.
- Логирование ошибок через Timber.
- Базовые unit-тесты для ViewModel и UI-тесты для критичных экранов.

## 4. API-интеграция

### 4.1 Используемые endpoint

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /categories`
- `GET /articles`
- `GET /articles/mine`
- `GET /articles/:id`
- `POST /articles`
- `PATCH /articles/:id`
- `DELETE /articles/:id`
- `POST /articles/:id/submit`
- `GET /articles/:articleId/comments`
- `POST /articles/:articleId/comments`
- `GET /courses`
- `GET /courses/:id`
- `GET /users/me`
- `PATCH /users/me`
- `GET /users` (admin)
- `PATCH /users/:id/role` (admin)
- `PATCH /users/:id/block` / `unblock` (admin)
- `POST /pdf-import`
- `POST /uploads/image` (требуется добавить в backend)

### 4.2 Требования к backend

- Refresh-токен должен приниматься в теле запроса, не только из cookie.
- Endpoint для загрузки изображений.
- CORS разрешён для мобильного приложения (или прямой доступ к API).

## 5. Структура проекта

```
android/
├── app/
│   ├── src/main/java/ru/samoh/lessonsportal/
│   │   ├── app/
│   │   │   ├── LessonsPortalApp.kt
│   │   │   └── di/
│   │   ├── data/
│   │   │   ├── local/
│   │   │   ├── remote/
│   │   │   └── repository/
│   │   ├── domain/
│   │   │   ├── model/
│   │   │   └── repository/
│   │   ├── presentation/
│   │   │   ├── auth/
│   │   │   ├── articles/
│   │   │   ├── courses/
│   │   │   ├── profile/
│   │   │   └── moderation/
│   │   └── navigation/
│   └── src/main/res/
├── build.gradle.kts
└── gradle/libs.versions.toml
```

## 6. Экраны и навигация

### Граф навигации

```
LoginScreen -> BottomNavHost
RegisterScreen -> BottomNavHost

BottomNavHost:
  - catalog_graph
      CategoriesScreen -> ArticlesScreen -> ArticleDetailScreen -> CreateArticleScreen
  - courses_graph
      CoursesScreen -> CourseDetailScreen -> ArticleDetailScreen
  - my_articles_graph
      MyArticlesScreen -> ArticleDetailScreen -> CreateArticleScreen
  - profile_graph
      ProfileScreen -> EditProfileScreen -> AdminScreen / ModerationScreen
```

## 7. Модели данных

### User

```kotlin
data class User(
    val id: String,
    val email: String,
    val displayName: String,
    val role: UserRole
)

enum class UserRole { USER, MODERATOR, ADMIN }
```

### Article

```kotlin
data class Article(
    val id: String,
    val title: String,
    val slug: String,
    val content: String?,
    val status: ArticleStatus,
    val author: Author,
    val category: Category,
    val createdAt: String,
    val publishedAt: String?,
    val rejectionReason: String?
)

enum class ArticleStatus { DRAFT, PENDING, PUBLISHED, REJECTED }
```

### Category

```kotlin
data class Category(
    val id: String,
    val name: String,
    val slug: String
)
```

### Course

```kotlin
data class Course(
    val id: String,
    val name: String,
    val description: String?,
    val slug: String,
    val status: String,
    val articles: List<CourseArticle> = emptyList()
)
```

### Comment

```kotlin
data class Comment(
    val id: String,
    val body: String,
    val author: Author,
    val createdAt: String
)
```

### Video

```kotlin
data class Video(
    val id: String,
    val type: VideoType,
    val youtubeUrl: String?
)

enum class VideoType { YOUTUBE, UPLOADED }
```

## 8. UI/UX описание экранов

### 8.1 LoginScreen

- Центрированная карточка на светлом/тёмном фоне.
- Поля: Email, Пароль (скрытый ввод с иконкой показа).
- Кнопка "Войти" (занимает всю ширину).
- Ссылка "Создать аккаунт".
- Снекбар с ошибкой при неверных данных.

### 8.2 RegisterScreen

- Поля: Email, Пароль, Подтверждение пароля, Отображаемое имя.
- Кнопка "Зарегистрироваться".
- Ссылка "Уже есть аккаунт".

### 8.3 CategoriesScreen

- Сетка категорий в 2 колонки.
- Карточка категории: крупный текст названия, иконка по умолчанию.
- При нажатии — переход к списку статей категории.

### 8.4 ArticlesScreen

- Верхний search bar.
- Chips для фильтра по категории.
- LazyColumn с карточками статей.
- Карточка: заголовок, автор + дата, категория (badge).
- FAB для создания новой статьи (если пользователь авторизован).

### 8.5 ArticleDetailScreen

- TopAppBar с заголовком и кнопкой "Назад".
- ScrollableColumn:
  - заголовок H4;
  - мета-информация (аватар placeholder, имя автора, дата);
  - WebView с HTML-контентом;
  - блок видео (горизонтальный список превью YouTube);
  - блок комментариев.
- Для авторов/модераторов: меню действий (редактировать, отправить, удалить).

### 8.6 CreateArticleScreen

- TopAppBar: "Новая статья" / "Редактирование".
- Поле заголовка (OutlinedTextField).
- Dropdown выбора категории.
- TabRow: "Редактор" / "Preview".
- Markdown-редактор (многострочное поле с monospace шрифтом).
- Toolbar над редактором: Bold, Italic, Heading, List, Link, Image.
- Кнопки внизу: "Сохранить черновик", "Отправить на модерацию".

### 8.7 CoursesScreen

- LazyColumn с карточками курсов.
- Карточка: название, описание (2 строки), количество статей.

### 8.8 CourseDetailScreen

- Заголовок курса.
- Описание.
- Список статей курса (нумерованный).

### 8.9 MyArticlesScreen

- TabRow со статусами.
- LazyColumn со статьями текущего статуса.
- Свайп-экшены: редактировать, удалить.

### 8.10 ProfileScreen

- Карточка пользователя с аватаром placeholder.
- Список полей: email, имя, роль.
- Кнопки: "Редактировать профиль", "Выйти".
- Для привилегированных ролей: кнопки "Модерация" / "Админ-панель".

### 8.11 ModerationScreen

- Список статей в статусе PENDING.
- Карточка: заголовок, автор, дата.
- Кнопки: "Одобрить" (зелёная), "Отклонить" (красная, с диалогом причины).

### 8.12 AdminScreen

- TabRow: "Пользователи", "Категории".
- Пользователи: список с ролью и статусом, меню действий.
- Категории: список с кнопкой добавления.

## 9. Безопасность

- Все токены — только в `EncryptedSharedPreferences`.
- SSL-pinning — опционально.
- Пароль нигде не логируется.
- Запросы с авторизацией через `Authorization: Bearer <accessToken>`.

## 10. Производительность

- Пагинация списков через Paging 3.
- Кеширование изображений через Coil.
- Room как кеш для офлайн-чтения.
- LazyColumn/LazyRow вместо Column/Row для больших списков.

## 11. Тестирование

### Unit-тесты

- Валидация email/пароля.
- JWT interceptor.
- ViewModel: загрузка статей, обработка ошибок.

### UI-тесты

- Авторизация.
- Переход по категориям.
- Создание черновика статьи.

## 12. CI/CD

- GitHub Actions / GitLab CI:
  - сборка debug APK на каждый PR;
  - запуск unit-тестов;
  - сборка signed release AAB при пуше в `main`;
  - загрузка AAB в Google Play Internal Testing.

## 13. Релиз

- Google Play Console:
  - создание приложения;
  - заполнение store listing;
  - загрузка AAB;
  - closed testing → open testing → production.

## 14. Этапы реализации

### MVP (4–6 недель)

1. Авторизация/регистрация.
2. Просмотр категорий, статей, курсов.
3. Детальная статья с YouTube и комментариями.
4. Профиль.

### Release 1.5 (2–3 недели)

5. Создание/редактирование статей.
6. Загрузка изображений.
7. Мои статьи.

### Release 2.0 (2 недели)

8. Модерация.
9. Админ-панель.
10. Офлайн-кеш.

## 15. Открытые вопросы

- Нужна ли поддержка push-уведомлений в MVP?
- Нужен ли in-app WYSIWYG-редактор или достаточно Markdown?
- Нужна ли поддержка загрузки видео на MinIO из приложения?
- Нужен ли deeplink на статьи (для sharing)?
- Нужна ли поддержка планшетной раскладки (two-pane)?
