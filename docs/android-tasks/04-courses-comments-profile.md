# Задание для AI-агента: Этап 4 — Курсы, комментарии и профиль

## Цель

Реализовать разделы "Курсы", полноценные комментарии к статьям и профиль пользователя с редактированием.

## Контекст

- Этапы 1–3 завершены: авторизация, каталог, редактор статей работают.
- Backend endpoint для курсов, комментариев и пользователей уже существуют.
- Требования: см. `docs/android-app-spec.md`.

## Структура дополнений

```
android/app/src/main/java/ru/samoh/lessonsportal/
├── data/
│   ├── remote/
│   │   ├── api/
│   │   │   └── CoursesApi.kt (если ещё не создан)
│   │   └── dto/
│   │       ├── CourseDto.kt
│   │       ├── CourseArticleDto.kt
│   │       ├── CreateCommentRequest.kt
│   │       └── UpdateProfileRequest.kt
│   └── repository/
│       ├── CoursesRepositoryImpl.kt
│       └── UserRepositoryImpl.kt (расширить)
├── domain/
│   ├── model/
│   │   ├── Course.kt
│   │   ├── CourseArticle.kt
│   │   └── Profile.kt
│   ├── repository/
│   │   ├── CoursesRepository.kt
│   │   └── UserRepository.kt (расширить)
│   └── usecase/
│       ├── GetCoursesUseCase.kt
│       ├── GetCourseDetailUseCase.kt
│       ├── GetProfileUseCase.kt
│       ├── UpdateProfileUseCase.kt
│       ├── GetCommentsUseCase.kt
│       └── AddCommentUseCase.kt
├── presentation/
│   ├── courses/
│   │   ├── CoursesScreen.kt
│   │   ├── CoursesViewModel.kt
│   │   ├── CourseDetailScreen.kt
│   │   └── CourseDetailViewModel.kt
│   ├── profile/
│   │   ├── ProfileScreen.kt
│   │   ├── ProfileViewModel.kt
│   │   └── EditProfileScreen.kt
│   └── article/
│       └── comments/
│           ├── CommentsSection.kt
│           └── CommentInput.kt
└── navigation/
    ├── CoursesGraph.kt
    └── ProfileGraph.kt
```

## Задачи

### 4.1 API-интерфейсы

Создать/расширить `CoursesApi`:

```kotlin
interface CoursesApi {
    @GET("courses")
    suspend fun getCourses(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): List<CourseDto>

    @GET("courses/{id}")
    suspend fun getCourse(@Path("id") id: String): CourseDto
}
```

Расширить `UserApi`:

```kotlin
interface UserApi {
    @GET("users/me")
    suspend fun getProfile(): UserDto

    @PATCH("users/me")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): UserDto
}
```

### 4.2 DTO

```kotlin
@Serializable
data class CourseDto(
    val id: String,
    val name: String,
    val description: String?,
    val slug: String,
    val status: String,
    val articles: List<CourseArticleDto> = emptyList()
)

@Serializable
data class CourseArticleDto(
    val id: String,
    val title: String,
    val status: String,
    val order: Int
)

@Serializable
data class UpdateProfileRequest(
    val displayName: String
)
```

### 4.3 Модели

```kotlin
data class Course(
    val id: String,
    val name: String,
    val description: String?,
    val slug: String,
    val status: String,
    val articles: List<CourseArticle>
)

data class CourseArticle(
    val id: String,
    val title: String,
    val status: ArticleStatus,
    val order: Int
)
```

### 4.4 Репозитории

Создать `CoursesRepository`:

- `getCourses(page, limit)`
- `getCourse(id)`

Расширить `UserRepository`:

- `getProfile()`
- `updateProfile(displayName)`

### 4.5 UI: CoursesScreen

- LazyColumn с карточками курсов.
- Карточка: название, описание (2 строки), количество статей.
- Pull-to-refresh.
- Пагинация через Paging 3.

### 4.6 UI: CourseDetailScreen

- TopAppBar с названием курса.
- Описание курса.
- Нумерованный список статей.
- При нажатии — переход к ArticleDetailScreen.
- Статьи со статусом отличным от PUBLISHED скрываются для обычных пользователей (backend уже фильтрует, но на всякий случай — и на клиенте тоже).

### 4.7 UI: ProfileScreen

- Карточка пользователя:
  - аватар placeholder (Coil + инициалы);
  - отображаемое имя;
  - email;
  - роль (USER/MODERATOR/ADMIN).
- Кнопки:
  - "Редактировать профиль" → EditProfileScreen.
  - "Выйти" → диалог подтверждения → logout.
- Для MODERATOR/ADMIN: кнопка "Модерация" → ModerationScreen.
- Для ADMIN: кнопка "Админ-панель" → AdminScreen.

### 4.8 UI: EditProfileScreen

- Поле "Отображаемое имя".
- Кнопка "Сохранить".
- Валидация: не пустое, max 100 символов.
- После сохранения — возврат на ProfileScreen с обновлёнными данными.

### 4.9 Комментарии

Создать `CommentsSection`:

```kotlin
@Composable
fun CommentsSection(
    comments: List<Comment>,
    isLoading: Boolean,
    currentUserId: String?,
    onAddComment: (String) -> Unit
)
```

Состоит из:

- `LazyColumn` с `CommentItem`.
- `CommentInput` — поле ввода + кнопка отправки.
- Pull-to-refresh для списка комментариев.

`CommentItem`:

- Аватар placeholder.
- Имя автора и дата.
- Текст комментария.

### 4.10 ArticleDetailScreen — интеграция комментариев

- Добавить `CommentsSection` в конец экрана статьи.
- ViewModel загружает комментарии и видео параллельно (`async/await`).
- После добавления комментария — обновить список.

### 4.11 ViewModel

`ProfileViewModel`:

```kotlin
class ProfileViewModel @Inject constructor(
    private val getProfile: GetProfileUseCase,
    private val updateProfile: UpdateProfileUseCase,
    private val logout: LogoutUseCase
) : ViewModel()
```

`CoursesViewModel`:

```kotlin
class CoursesViewModel @Inject constructor(
    private val getCourses: GetCoursesUseCase
) : ViewModel()
```

`CourseDetailViewModel`:

```kotlin
class CourseDetailViewModel @Inject constructor(
    private val getCourseDetail: GetCourseDetailUseCase,
    savedStateHandle: SavedStateHandle
) : ViewModel()
```

### 4.12 Навигация

Расширить `MainGraph`:

```kotlin
sealed class Screen(val route: String) {
    // ... существующие экраны
    object Courses : Screen("courses")
    object CourseDetail : Screen("courses/{courseId}")
    object Profile : Screen("profile")
    object EditProfile : Screen("profile/edit")
}
```

Настроить bottom navigation:

- Каталог → CatalogGraph
- Курсы → CoursesGraph
- Мои статьи → MyArticlesGraph
- Профиль → ProfileGraph

### 4.13 Адаптивность

- На планшетах в ландшафтной ориентации:
  - CoursesScreen: две колонки.
  - CourseDetailScreen: two-pane (список слева, деталь справа) — опционально.
- Использовать `WindowSizeClass` из Jetpack WindowManager.

### 4.14 Тестирование

- Unit-тест `ProfileViewModelTest`:
  - загрузка профиля;
  - обновление профиля;
  - logout.
- Unit-тест `CoursesViewModelTest`:
  - загрузка списка курсов;
  - обработка ошибок.
- UI-тест перехода Profile → EditProfile.

## Критерии приёмки

- [ ] CoursesScreen отображает список курсов с пагинацией.
- [ ] CourseDetailScreen показывает статьи курса и позволяет открыть статью.
- [ ] ProfileScreen отображает данные текущего пользователя.
- [ ] EditProfileScreen позволяет изменить отображаемое имя.
- [ ] Комментарии к статье загружаются и добавляются.
- [ ] Bottom navigation корректно переключает разделы.
- [ ] На планшетах интерфейс адаптируется.
- [ ] Unit/UI тесты проходят.

## Примечания

- Для курсов использовать Paging 3, как для статей.
- В профиле отображать роль текстом на русском языке.
- Комментарии не кешировать в Room (только статьи кешируются для офлайн-режима).
