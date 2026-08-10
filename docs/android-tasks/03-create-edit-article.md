# Задание для AI-агента: Этап 3 — Создание и редактирование статей

## Цель

Реализовать полноценный редактор статей с WYSIWYG, загрузкой изображений, автосохранением черновиков и отправкой на модерацию.

## Контекст

- Этапы 1 и 2 завершены: авторизация, каталог, детальная статья работают.
- Backend endpoint `POST /uploads/image` требуется добавить (можно сделать после этого этапа или параллельно).
- PDF-импорт: можно переиспользовать `POST /pdf-import`, но для MVP — опционально.
- Требования: см. `docs/android-app-spec.md`.

## Структура дополнений

```
android/app/src/main/java/ru/samoh/lessonsportal/
├── data/
│   ├── remote/
│   │   ├── api/
│   │   │   ├── UploadsApi.kt
│   │   │   └── PdfImportApi.kt
│   │   └── dto/
│   │       ├── CreateArticleRequest.kt
│   │       ├── UpdateArticleRequest.kt
│   │       ├── UploadImageResponse.kt
│   │       └── PdfImportResponse.kt
│   ├── local/
│   │   ├── dao/
│   │   │   └── DraftArticleDao.kt (уже создан)
│   │   └── entity/
│   │       └── DraftArticleEntity.kt (уже создан)
│   └── repository/
│       ├── ArticlesRepositoryImpl.kt (расширить)
│       ├── UploadsRepositoryImpl.kt
│       └── PdfImportRepositoryImpl.kt
├── domain/
│   ├── model/
│   │   ├── ArticleStatus.kt
│   │   └── DraftArticle.kt
│   ├── repository/
│   │   ├── ArticlesRepository.kt (расширить)
│   │   ├── UploadsRepository.kt
│   │   └── PdfImportRepository.kt
│   └── usecase/
│       ├── CreateArticleUseCase.kt
│       ├── UpdateArticleUseCase.kt
│       ├── SaveDraftUseCase.kt
│       ├── GetDraftUseCase.kt
│       ├── DeleteDraftUseCase.kt
│       ├── SubmitArticleUseCase.kt
│       ├── UploadImageUseCase.kt
│       └── ImportPdfUseCase.kt
├── presentation/
│   ├── editor/
│   │   ├── ArticleEditorScreen.kt
│   │   ├── ArticleEditorViewModel.kt
│   │   ├── components/
│   │   │   ├── EditorToolbar.kt
│   │   │   ├── WysiwygEditor.kt
│   │   │   ├── MarkdownEditor.kt
│   │   │   ├── ArticlePreview.kt
│   │   │   └── CategoryDropdown.kt
│   │   └── model/
│   │       └── EditorUiState.kt
│   └── myarticles/
│       ├── MyArticlesScreen.kt
│       └── MyArticlesViewModel.kt
└── worker/
    └── DraftSyncWorker.kt
```

## Задачи

### 3.1 API-интерфейсы

Расширить `ArticlesApi`:

```kotlin
interface ArticlesApi {
    // ... существующие методы

    @POST("articles")
    suspend fun createArticle(@Body request: CreateArticleRequest): ArticleDto

    @PATCH("articles/{id}")
    suspend fun updateArticle(
        @Path("id") id: String,
        @Body request: UpdateArticleRequest
    ): ArticleDto

    @DELETE("articles/{id}")
    suspend fun deleteArticle(@Path("id") id: String)

    @POST("articles/{id}/submit")
    suspend fun submitArticle(@Path("id") id: String): ArticleDto

    @GET("articles/mine")
    suspend fun getMyArticles(): List<ArticleDto>
}
```

Создать `UploadsApi`:

```kotlin
interface UploadsApi {
    @Multipart
    @POST("uploads/image")
    suspend fun uploadImage(
        @Part image: MultipartBody.Part
    ): UploadImageResponse
}
```

Создать `PdfImportApi`:

```kotlin
interface PdfImportApi {
    @Multipart
    @POST("pdf-import")
    suspend fun importPdf(
        @Part file: MultipartBody.Part
    ): PdfImportResponse
}
```

### 3.2 DTO

```kotlin
@Serializable
data class CreateArticleRequest(
    val title: String,
    val content: String,
    val categoryId: String
)

@Serializable
data class UpdateArticleRequest(
    val title: String? = null,
    val content: String? = null,
    val categoryId: String? = null
)

@Serializable
data class UploadImageResponse(
    val url: String
)

@Serializable
data class PdfImportResponse(
    val html: String,
    val suggestedTitle: String? = null
)
```

### 3.3 Репозитории

Расширить `ArticlesRepository`:

- `createArticle(title, content, categoryId)`
- `updateArticle(id, title, content, categoryId)`
- `deleteArticle(id)`
- `submitArticle(id)`
- `getMyArticles()`

Создать `UploadsRepository.uploadImage(uri: Uri): Result<String>`.

Создать `PdfImportRepository.importPdf(uri: Uri): Result<PdfImportResult>`.

### 3.4 Черновики в Room

Расширить `DraftArticleEntity`:

```kotlin
@Entity(tableName = "draft_articles")
data class DraftArticleEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val articleId: String? = null, // null для новой статьи
    val title: String,
    val content: String,
    val categoryId: String,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)
```

Методы DAO:

```kotlin
@Dao
interface DraftArticleDao {
    @Query("SELECT * FROM draft_articles ORDER BY updatedAt DESC")
    fun observeDrafts(): Flow<List<DraftArticleEntity>>

    @Query("SELECT * FROM draft_articles WHERE articleId = :articleId LIMIT 1")
    suspend fun getDraftByArticleId(articleId: String): DraftArticleEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertDraft(draft: DraftArticleEntity)

    @Query("DELETE FROM draft_articles WHERE id = :id")
    suspend fun deleteDraft(id: String)
}
```

### 3.5 WYSIWYG-редактор

Реализовать на Jetpack Compose:

```kotlin
@Composable
fun WysiwygEditor(
    htmlContent: String,
    onContentChange: (String) -> Unit,
    onInsertImage: () -> Unit,
    onImportPdf: () -> Unit
)
```

Подход:

1. Внутреннее состояние редактора — список `EditorBlock`:

```kotlin
sealed class EditorBlock {
    data class Paragraph(val text: AnnotatedString, val spans: List<TextSpan>) : EditorBlock()
    data class Heading(val level: Int, val text: String) : EditorBlock()
    data class Image(val url: String, val caption: String?) : EditorBlock()
    data class List(val items: List<String>, val ordered: Boolean) : EditorBlock()
}

enum class TextSpan { BOLD, ITALIC }
```

2. Тулбар над редактором с кнопками:
   - Bold, Italic.
   - H1, H2, Paragraph.
   - Bulleted list, numbered list.
   - Link (диалог ввода URL).
   - Image (открывает галерею, загружает, вставляет URL).
   - PDF (открывает файловый менеджер, отправляет на backend, вставляет HTML).

3. Конвертация списка блоков в HTML для отправки на backend.
4. Конвертация HTML из backend в список блоков для редактирования (базовая поддержка: `<p>`, `<strong>`, `<em>`, `<h1>`-`<h3>`, `<ul>`, `<ol>`, `<img>`).

### 3.6 UI: ArticleEditorScreen

- TopAppBar: "Новая статья" / "Редактирование".
- Поле заголовка.
- Dropdown выбора категории (`CategoryDropdown`).
- TabRow: "Редактор" / "Preview".
- Вкладка "Редактор": `WysiwygEditor`.
- Вкладка "Preview": `ArticlePreview(html)` через WebView.
- Нижние кнопки:
  - "Сохранить черновик" — сохраняет в Room.
  - "Отправить на модерацию" — `POST /articles/:id/submit` (или create + submit для новой).
  - "Удалить" (только при редактировании) — диалог подтверждения.

### 3.7 UI: CategoryDropdown

```kotlin
@Composable
fun CategoryDropdown(
    categories: List<Category>,
    selectedCategoryId: String?,
    onCategorySelected: (String) -> Unit
)
```

- ExposedDropdownMenuBox из Material3.
- Загружать категории через `GetCategoriesUseCase`.

### 3.8 UI: MyArticlesScreen

- TabRow со статусами: "Черновики", "На модерации", "Опубликованные", "Отклонённые".
- Для локальных черновиков — отдельный таб "Черновики (локальные)" с данными из Room.
- LazyColumn со статьями.
- Swipe-экшены:
  - Редактировать → ArticleEditorScreen.
  - Удалить → диалог подтверждения.
- Pull-to-refresh.

### 3.9 Автосохранение черновиков

- В `ArticleEditorViewModel` запускать debounced flow (1 секунда) на изменении title/content/categoryId.
- Сохранять в Room через `SaveDraftUseCase`.
- При открытии редактора проверять:
  - если `articleId != null` — загружать черновик по `articleId`;
  - иначе — новый черновик.

### 3.10 Синхронизация черновиков

Создать `DraftSyncWorker`:

```kotlin
class DraftSyncWorker(
    context: Context,
    params: WorkerParameters,
    private val articlesRepository: ArticlesRepository
) : CoroutineWorker(context, params)
```

- Запускать при появлении сети (`Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED)`).
- Синхронизировать несинхронизированные черновики (помечать флагом `isSynced`).

### 3.11 Загрузка изображений

1. Использовать Activity Result API для выбора изображения из галереи.
2. Сжать изображение до max 1920px по длинной стороне и max 1 МБ.
3. Загрузить через `UploadsRepository.uploadImage`.
4. Вставить URL в контент статьи (`<img src="..." alt="...">`).

### 3.12 PDF-импорт

1. Использовать Activity Result API для выбора PDF.
2. Отправить на `POST /pdf-import`.
3. Полученный HTML вставить в редактор.
4. Предложить `suggestedTitle` для заголовка статьи.

### 3.13 ViewModel

`ArticleEditorViewModel`:

```kotlin
class ArticleEditorViewModel @Inject constructor(
    private val createArticle: CreateArticleUseCase,
    private val updateArticle: UpdateArticleUseCase,
    private val saveDraft: SaveDraftUseCase,
    private val getDraft: GetDraftUseCase,
    private val submitArticle: SubmitArticleUseCase,
    private val uploadImage: UploadImageUseCase,
    private val importPdf: ImportPdfUseCase,
    private val getCategories: GetCategoriesUseCase
) : ViewModel()
```

Состояние:

```kotlin
data class EditorUiState(
    val title: String = "",
    val content: String = "",
    val categoryId: String? = null,
    val categories: List<Category> = emptyList(),
    val isLoading: Boolean = false,
    val isSavingDraft: Boolean = false,
    val error: String? = null,
    val savedArticleId: String? = null,
    val isSubmitted: Boolean = false
)
```

### 3.14 Тестирование

- Unit-тест `ArticleEditorViewModelTest`:
  - создание статьи;
  - обновление статьи;
  - автосохранение черновика;
  - обработка ошибок.
- UI-тест создания статьи.

## Критерии приёмки

- [ ] Можно создать новую статью с заголовком, категорией и WYSIWYG-контентом.
- [ ] Можно отредактировать существующую статью.
- [ ] Загрузка изображений работает и URL вставляется в контент.
- [ ] Автосохранение черновиков в Room работает каждую секунду.
- [ ] MyArticlesScreen показывает статьи по статусам с возможностью редактирования/удаления.
- [ ] Кнопка "Отправить на модерацию" работает.
- [ ] PDF-импорт работает (опционально, если backend endpoint готов).
- [ ] Unit/UI тесты проходят.

## Примечания

- Если WYSIWYG окажется слишком сложным, предусмотреть fallback на Markdown-редактор.
- Все multipart-запросы должны корректно работать с JWT-interceptor.
- После успешной отправки на модерацию очищать локальный черновик.
