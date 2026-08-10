# Задание для AI-агента: Этап 5 — Модерация и админ-панель

## Цель

Реализовать экраны модерации статей и административной панели для управления пользователями и категориями.

## Контекст

- Этапы 1–4 завершены: авторизация, каталог, редактор, курсы, профиль работают.
- Backend endpoint для модерации и админки существуют.
- Требования: см. `docs/android-app-spec.md`.

## Структура дополнений

```
android/app/src/main/java/ru/samoh/lessonsportal/
├── data/
│   ├── remote/
│   │   ├── api/
│   │   │   ├── ModerationApi.kt
│   │   │   └── AdminApi.kt
│   │   └── dto/
│   │       ├── ModerateArticleRequest.kt
│   │       ├── ChangeRoleRequest.kt
│   │       └── CreateCategoryRequest.kt
│   └── repository/
│       ├── ModerationRepositoryImpl.kt
│       └── AdminRepositoryImpl.kt
├── domain/
│   ├── model/
│   │   └── ModerationArticle.kt
│   ├── repository/
│   │   ├── ModerationRepository.kt
│   │   └── AdminRepository.kt
│   └── usecase/
│       ├── GetPendingArticlesUseCase.kt
│       ├── ApproveArticleUseCase.kt
│       ├── RejectArticleUseCase.kt
│       ├── GetUsersUseCase.kt
│       ├── ChangeUserRoleUseCase.kt
│       ├── BlockUserUseCase.kt
│       ├── UnblockUserUseCase.kt
│       ├── GetCategoriesUseCase.kt (уже есть)
│       ├── CreateCategoryUseCase.kt
│       └── UpdateCategoryUseCase.kt
├── presentation/
│   ├── moderation/
│   │   ├── ModerationScreen.kt
│   │   ├── ModerationViewModel.kt
│   │   └── components/
│   │       ├── ModerationArticleCard.kt
│   │       └── RejectDialog.kt
│   └── admin/
│       ├── AdminScreen.kt
│       ├── AdminViewModel.kt
│       ├── UsersTab.kt
│       └── CategoriesTab.kt
└── navigation/
    └── AdminGraph.kt
```

## Задачи

### 5.1 API-интерфейсы

Создать `ModerationApi`:

```kotlin
interface ModerationApi {
    @GET("articles?status=PENDING")
    suspend fun getPendingArticles(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): List<ArticleDto>

    @POST("moderation/{id}/approve")
    suspend fun approveArticle(@Path("id") id: String): ArticleDto

    @POST("moderation/{id}/reject")
    suspend fun rejectArticle(
        @Path("id") id: String,
        @Body request: ModerateArticleRequest
    ): ArticleDto
}
```

Создать `AdminApi`:

```kotlin
interface AdminApi {
    @GET("users")
    suspend fun getUsers(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): List<UserDto>

    @PATCH("users/{id}/role")
    suspend fun changeRole(
        @Path("id") id: String,
        @Body request: ChangeRoleRequest
    ): UserDto

    @PATCH("users/{id}/block")
    suspend fun blockUser(@Path("id") id: String): UserDto

    @PATCH("users/{id}/unblock")
    suspend fun unblockUser(@Path("id") id: String): UserDto

    @POST("categories")
    suspend fun createCategory(@Body request: CreateCategoryRequest): CategoryDto

    @PATCH("categories/{id}")
    suspend fun updateCategory(
        @Path("id") id: String,
        @Body request: CreateCategoryRequest
    ): CategoryDto
}
```

### 5.2 DTO

```kotlin
@Serializable
data class ModerateArticleRequest(
    val comment: String
)

@Serializable
data class ChangeRoleRequest(
    val role: String
)

@Serializable
data class CreateCategoryRequest(
    val name: String
)
```

### 5.3 Репозитории

`ModerationRepository`:

- `getPendingArticles(page, limit)`
- `approveArticle(id)`
- `rejectArticle(id, reason)`

`AdminRepository`:

- `getUsers(page, limit)`
- `changeRole(userId, role)`
- `blockUser(userId)`
- `unblockUser(userId)`
- `createCategory(name)`
- `updateCategory(id, name)`

### 5.4 UI: ModerationScreen

- TopAppBar "Модерация".
- LazyColumn со статьями в статусе PENDING.
- Карточка статьи:
  - заголовок;
  - автор;
  - дата создания;
  - краткое превью контента (первые 150 символов).
- Кнопки:
  - "Одобрить" — зелёная, сразу вызывает approve.
  - "Отклонить" — красная, открывает диалог с причиной.
- Snackbar с результатом действия.
- Pull-to-refresh.

### 5.5 UI: RejectDialog

- AlertDialog с многострочным полем ввода причины.
- Кнопки "Отмена" / "Отклонить".
- Причина обязательна (min 5 символов).

### 5.6 UI: AdminScreen

- TopAppBar "Админ-панель".
- TabRow: "Пользователи", "Категории".

### 5.7 UI: UsersTab

- LazyColumn с пользователями.
- Карточка пользователя:
  - email;
  - отображаемое имя;
  - роль (chip);
  - статус (активен/заблокирован).
- Меню действий (DropdownMenu):
  - Сменить роль: USER / MODERATOR / ADMIN.
  - Заблокировать / Разблокировать.
- Pull-to-refresh.

### 5.8 UI: CategoriesTab

- LazyColumn с категориями.
- FAB "Добавить категорию".
- При нажатии на категорию — диалог редактирования.
- Диалог создания/редактирования:
  - поле "Название";
  - slug генерируется автоматически (транслитерация + lower case + замена пробелов на дефис).

### 5.9 ViewModel

`ModerationViewModel`:

```kotlin
class ModerationViewModel @Inject constructor(
    private val getPendingArticles: GetPendingArticlesUseCase,
    private val approveArticle: ApproveArticleUseCase,
    private val rejectArticle: RejectArticleUseCase
) : ViewModel()
```

`AdminViewModel`:

```kotlin
class AdminViewModel @Inject constructor(
    private val getUsers: GetUsersUseCase,
    private val changeRole: ChangeUserRoleUseCase,
    private val blockUser: BlockUserUseCase,
    private val unblockUser: UnblockUserUseCase,
    private val getCategories: GetCategoriesUseCase,
    private val createCategory: CreateCategoryUseCase,
    private val updateCategory: UpdateCategoryUseCase
) : ViewModel()
```

### 5.10 Контроль доступа

- ModerationScreen доступен только для ролей MODERATOR и ADMIN.
- AdminScreen доступен только для ADMIN.
- Если пользователь без нужной роли пытается открыть экран — показывать экран "Доступ запрещён" с кнопкой "Назад".
- Проверку роли делать в ProfileScreen перед навигацией.

### 5.11 Навигация

Добавить в `ProfileGraph`:

```kotlin
sealed class Screen(val route: String) {
    // ... существующие
    object Moderation : Screen("moderation")
    object Admin : Screen("admin")
}
```

### 5.12 Тестирование

- Unit-тест `ModerationViewModelTest`:
  - загрузка pending-статей;
  - approve;
  - reject с причиной.
- Unit-тест `AdminViewModelTest`:
  - загрузка пользователей;
  - смена роли;
  - блокировка/разблокировка;
  - создание/обновление категории.
- UI-тест ModerationScreen: approve статьи.

## Критерии приёмки

- [ ] ModerationScreen доступен MODERATOR/ADMIN и показывает pending-статьи.
- [ ] Кнопки "Одобрить" и "Отклонить" работают.
- [ ] AdminScreen доступен только ADMIN.
- [ ] UsersTab позволяет менять роли и блокировать пользователей.
- [ ] CategoriesTab позволяет создавать и редактировать категории.
- [ ] Доступ запрещён для недостаточных прав.
- [ ] Unit/UI тесты проходят.

## Примечания

- Для генерации slug из названия категории использовать простую транслитерацию (рус → en) или оставить латиницу.
- После approve/reject статья исчезает из списка pending.
- Пагинация пользователей и категорий — опционально, для MVP можно загружать первые 50/100.
