# Задание для AI-агента: Этап 2 — Каталог, статьи и детальная статья

## Цель

Реализовать просмотр категорий, списка статей с пагинацией/поиском, детальную статью с HTML-контентом, YouTube-видео и комментариями.

## Контекст

- Предыдущий этап завершён: проект создан, DI настроен, авторизация работает.
- Необходимые endpoint уже существуют в backend:
  - `GET /categories`
  - `GET /articles`
  - `GET /articles/:id`
  - `GET /articles/:articleId/videos`
  - `GET /articles/:articleId/comments`
  - `POST /articles/:articleId/comments`
- Требования: см. `docs/android-app-spec.md`.

## Структура дополнений

```
android/app/src/main/java/ru/samoh/lessonsportal/
├── data/
│   ├── remote/
│   │   ├── api/
│   │   │   ├── ArticlesApi.kt
│   │   │   ├── CategoriesApi.kt
│   │   │   ├── CommentsApi.kt
│   │   │   └── VideosApi.kt
│   │   └── dto/
│   │       ├── ArticleDto.kt
│   │       ├── ArticleListResponse.kt
│   │       ├── CategoryDto.kt
│   │       ├── CommentDto.kt
│   │       ├── CreateCommentRequest.kt
│   │       └── VideoDto.kt
│   ├── local/
│   │   ├── dao/
│   │   │   ├── ArticleDao.kt
│   │   │   └── CategoryDao.kt
│   │   └── entity/
│   │       ├── ArticleEntity.kt
│   │       └── CategoryEntity.kt
│   └── repository/
│       ├── ArticlesRepositoryImpl.kt
│       ├── CategoriesRepositoryImpl.kt
│       ├── CommentsRepositoryImpl.kt
│       └── VideosRepositoryImpl.kt
├── domain/
│   ├── model/
│   │   ├── Article.kt
│   │   ├── ArticleListItem.kt
│   │   ├── Category.kt
│   │   ├── Comment.kt
│   │   ├── Video.kt
│   │   └── Author.kt
│   ├── repository/
│   │   ├── ArticlesRepository.kt
│   │   ├── CategoriesRepository.kt
│   │   ├── CommentsRepository.kt
│   │   └── VideosRepository.kt
│   └── usecase/
│       ├── GetCategoriesUseCase.kt
│       ├── GetArticlesUseCase.kt
│       ├── GetArticleDetailUseCase.kt
│       ├── GetArticleCommentsUseCase.kt
│       └── AddCommentUseCase.kt
├── presentation/
│   ├── catalog/
│   │   ├── CategoriesScreen.kt
│   │   ├── CategoriesViewModel.kt
│   │   ├── ArticlesScreen.kt
│   │   ├── ArticlesViewModel.kt
│   │   ├── ArticleDetailScreen.kt
│   │   └── ArticleDetailViewModel.kt
│   └── components/
│       ├── ArticleCard.kt
│       ├── CategoryCard.kt
│       ├── CommentItem.kt
│       ├── VideoPlayer.kt
│       ├── LoadingIndicator.kt
│       └── ErrorState.kt
└── navigation/
    ├── CatalogGraph.kt
    └── Screen.kt
```

## Задачи

### 2.1 Модели и DTO

Создать DTO, соответствующие ответам backend. Примеры:

```kotlin
@Serializable
data class ArticleDto(
    val id: String,
    val title: String,
    val slug: String,
    val content: String?,
    val status: String,
    val author: AuthorDto,
    val category: CategoryDto,
    val createdAt: String,
    val publishedAt: String?,
    val rejectionReason: String?
)

@Serializable
data class AuthorDto(
    val id: String,
    val displayName: String
)

@Serializable
data class CategoryDto(
    val id: String,
    val name: String,
    val slug: String
)

@Serializable
data class CommentDto(
    val id: String,
    val body: String,
    val author: AuthorDto,
    val createdAt: String
)

@Serializable
data class VideoDto(
    val id: String,
    val type: String,
    val youtubeUrl: String?
)
```

### 2.2 API-интерфейсы

```kotlin
interface CategoriesApi {
    @GET("categories")
    suspend fun getCategories(): List<CategoryDto>
}

interface ArticlesApi {
    @GET("articles")
    suspend fun getArticles(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("categoryId") categoryId: String? = null,
        @Query("search") search: String? = null
    ): List<ArticleDto>

    @GET("articles/{id}")
    suspend fun getArticle(@Path("id") id: String): ArticleDto
}

interface CommentsApi {
    @GET("articles/{articleId}/comments")
    suspend fun getComments(@Path("articleId") articleId: String): List<CommentDto>

    @POST("articles/{articleId}/comments")
    suspend fun addComment(
        @Path("articleId") articleId: String,
        @Body request: CreateCommentRequest
    ): CommentDto
}

interface VideosApi {
    @GET("articles/{articleId}/videos")
    suspend fun getVideos(@Path("articleId") articleId: String): List<VideoDto>
}
```

### 2.3 Локальное хранилище

1. Создать entity для кеша статей и категорий:

```kotlin
@Entity(tableName = "articles")
data class ArticleEntity(
    @PrimaryKey val id: String,
    val title: String,
    val content: String?,
    val authorName: String,
    val categoryName: String,
    val createdAt: String,
    val cachedAt: Long = System.currentTimeMillis()
)
```

2. Создать DAO:

```kotlin
@Dao
interface ArticleDao {
    @Query("SELECT * FROM articles ORDER BY cachedAt DESC LIMIT :limit OFFSET :offset")
    suspend fun getArticles(limit: Int, offset: Int): List<ArticleEntity>

    @Query("SELECT * FROM articles WHERE id = :id")
    suspend fun getArticle(id: String): ArticleEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertArticles(articles: List<ArticleEntity>)

    @Query("DELETE FROM articles")
    suspend fun clearAll()
}
```

3. Подключить DAO к DatabaseModule.

### 2.4 Репозитории

Реализовать:

- `CategoriesRepository.getCategories()` — сеть → сохранить в Room → отдать UI.
- `ArticlesRepository.getArticles(page, categoryId, search)` — Paging 3 Source.
- `ArticlesRepository.getArticle(id)` — сначала Room, потом сеть с обновлением кеша.
- `CommentsRepository.getComments(articleId)`.
- `CommentsRepository.addComment(articleId, body)`.
- `VideosRepository.getVideos(articleId)`.

### 2.5 Paging 3

Создать `ArticlesPagingSource`:

```kotlin
class ArticlesPagingSource(
    private val api: ArticlesApi,
    private val categoryId: String?,
    private val search: String?
) : PagingSource<Int, ArticleListItem>()
```

Использовать в `ArticlesViewModel`:

```kotlin
val articles: Flow<PagingData<ArticleListItem>> = Pager(
    config = PagingConfig(pageSize = 20),
    pagingSourceFactory = { ArticlesPagingSource(api, categoryId, search) }
).flow.cachedIn(viewModelScope)
```

### 2.6 UI: CategoriesScreen

- Сетка из 2 колонок (`LazyVerticalGrid`).
- Карточка категории: Material3 Card с названием.
- Pull-to-refresh.
- Обработка ошибок и пустого состояния.
- При нажатии — переход к ArticlesScreen с `categoryId`.

### 2.7 UI: ArticlesScreen

- SearchBar в TopAppBar.
- Chips для быстрого выбора категории (опционально, если уже пришли из категории — chips скрываются).
- LazyColumn с карточками статей.
- Paging LoadState (refresh/append loading, error).
- Pull-to-refresh.
- FAB "Новая статья" → CreateArticleScreen.

### 2.8 UI: ArticleCard

```kotlin
@Composable
fun ArticleCard(
    article: ArticleListItem,
    onClick: () -> Unit
)
```

- Заголовок (2 строки).
- Автор и дата публикации.
- Badge категории.
- elevation 2dp.

### 2.9 UI: ArticleDetailScreen

- TopAppBar с заголовком и кнопкой "Назад".
- `NestedScroll` + `LazyColumn`:
  - Заголовок H4.
  - Мета: автор, дата, категория.
  - WebView с HTML-контентом.
  - Блок видео (горизонтальный список превью YouTube).
  - Блок комментариев.
  - Поле добавления комментария (для авторизованных).

### 2.10 HTML-рендеринг

Использовать `AndroidView` + `WebView`:

```kotlin
@Composable
fun HtmlContent(html: String) {
    AndroidView(
        factory = { context ->
            WebView(context).apply {
                settings.javaScriptEnabled = false
                loadDataWithBaseURL(null, wrapHtml(html), "text/html", "UTF-8", null)
            }
        },
        update = { it.loadDataWithBaseURL(null, wrapHtml(html), "text/html", "UTF-8", null) }
    )
}
```

Создать `wrapHtml(html)` с базовыми CSS-стилями для светлой/тёмной темы.

### 2.11 YouTube-плеер

1. Извлечь `videoId` из `youtubeUrl` (поддержать `watch?v=`, `youtu.be/`).
2. Создать `VideoPlayer(videoId: String)` на основе WebView с YouTube IFrame API:

```html
<iframe width="100%" height="100%"
    src="https://www.youtube.com/embed/{videoId}"
    frameborder="0"
    allowfullscreen>
</iframe>
```

3. Соотношение сторон 16:9.

### 2.12 Комментарии

- `CommentItem`: автор, дата, текст.
- Поле ввода с кнопкой "Отправить".
- После отправки — обновить список.

### 2.13 Offline-кеш статей

- При успешной загрузке статьи сохранять в Room.
- При открытии статьи без сети — показывать закешированную версию с индикатором offline.
- Использовать `ConnectivityManager` для определения наличия сети.

### 2.14 Навигация

Расширить `MainGraph`:

```kotlin
sealed class Screen(val route: String) {
    object Categories : Screen("categories")
    object Articles : Screen("articles?categoryId={categoryId}")
    object ArticleDetail : Screen("articles/{articleId}")
}
```

### 2.15 Тестирование

- Unit-тесты `ArticlesViewModelTest`, `ArticleDetailViewModelTest`.
- UI-тест перехода Categories → Articles → ArticleDetail.

## Критерии приёмки

- [ ] CategoriesScreen загружает и отображает категории.
- [ ] ArticlesScreen поддерживает пагинацию, поиск, фильтр по категории.
- [ ] ArticleDetailScreen отображает HTML-контент, видео и комментарии.
- [ ] Добавление комментария работает.
- [ ] Статьи кешируются в Room и доступны офлайн.
- [ ] Paging 3 корректно обрабатывает refresh/append/empty/error.
- [ ] Unit/UI тесты проходят.

## Примечания

- Для дат использовать `java.time.Instant` / `DateTimeFormatter` с выводом "dd MMMM yyyy".
- Все строки в `strings.xml`.
- YouTube-видео открывать во встроенном WebView, не в браузере.
