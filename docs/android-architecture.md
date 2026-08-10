# Архитектурная схема Android-приложения Lessons Portal

Документ описывает архитектуру, структуру проекта и ключевые технические решения для Android-приложения. Используется как руководство при разработке и при написании заданий для AI-агента.

## 1. Общие принципы

- **Clean Architecture**: разделение на слои `Data`, `Domain`, `Presentation`.
- **MVVM**: каждый экран имеет ViewModel, которая предоставляет UI-state через `StateFlow`.
- **Dependency Injection**: Hilt.
- **Reactive**: Kotlin Coroutines + Flow.
- **Offline-first**: критичные данные кешируются в Room; сеть — источник истины при наличии подключения.
- **Single source of truth**: UI получает данные из репозитория, который управляет кешем и сетью.

## 2. Технологический стек

| Назначение | Библиотека |
|------------|-----------|
| Язык | Kotlin 1.9+ |
| UI | Jetpack Compose (BOM 2024.02+) |
| Архитектура | MVVM + Clean Architecture |
| DI | Hilt 2.50+ |
| Сеть | Retrofit 2.9+, OkHttp 4.12+, Kotlin Serialization 1.6+ |
| Локальная БД | Room 2.6+ |
| Пагинация | Paging 3 |
| Навигация | Jetpack Navigation Compose |
| Изображения | Coil 2.6+ |
| Логирование | Timber 5.0+ |
| Background | WorkManager 2.9+ |
| Тестирование | JUnit 4/5, MockK, Turbine, Compose UI Test |

## 3. Структура проекта

```
android/
├── app/
│   ├── build.gradle.kts
│   ├── proguard-rules.pro
│   └── src/
│       ├── main/
│       │   ├── AndroidManifest.xml
│       │   ├── java/ru/samoh/lessonsportal/
│       │   │   ├── app/
│       │   │   │   ├── LessonsPortalApplication.kt
│       │   │   │   └── di/
│       │   │   │       ├── AppModule.kt
│       │   │   │       ├── DatabaseModule.kt
│       │   │   │       ├── NetworkModule.kt
│       │   │   │       └── RepositoryModule.kt
│       │   │   ├── data/
│       │   │   │   ├── local/
│       │   │   │   │   ├── LessonsPortalDatabase.kt
│       │   │   │   │   ├── dao/
│       │   │   │   │   │   ├── ArticleDao.kt
│       │   │   │   │   │   ├── CategoryDao.kt
│       │   │   │   │   │   └── DraftArticleDao.kt
│       │   │   │   │   └── entity/
│       │   │   │   │       ├── ArticleEntity.kt
│       │   │   │   │       ├── CategoryEntity.kt
│       │   │   │   │       └── DraftArticleEntity.kt
│       │   │   │   ├── remote/
│       │   │   │   │   ├── api/
│       │   │   │   │   │   ├── AuthApi.kt
│       │   │   │   │   │   ├── UserApi.kt
│       │   │   │   │   │   ├── ArticlesApi.kt
│       │   │   │   │   │   ├── CategoriesApi.kt
│       │   │   │   │   │   ├── CommentsApi.kt
│       │   │   │   │   │   ├── VideosApi.kt
│       │   │   │   │   │   ├── CoursesApi.kt
│       │   │   │   │   │   ├── ModerationApi.kt
│       │   │   │   │   │   ├── UploadsApi.kt
│       │   │   │   │   │   └── PdfImportApi.kt
│       │   │   │   │   ├── dto/
│       │   │   │   │   │   └── (все *Dto.kt)
│       │   │   │   │   └── interceptor/
│       │   │   │   │       └── AuthInterceptor.kt
│       │   │   │   ├── repository/
│       │   │   │   │   ├── AuthRepositoryImpl.kt
│       │   │   │   │   ├── UserRepositoryImpl.kt
│       │   │   │   │   ├── ArticlesRepositoryImpl.kt
│       │   │   │   │   └── ...
│       │   │   │   └── datastore/
│       │   │   │       └── TokenDataStore.kt
│       │   │   ├── domain/
│       │   │   │   ├── model/
│       │   │   │   │   ├── User.kt
│       │   │   │   │   ├── Article.kt
│       │   │   │   │   ├── Category.kt
│       │   │   │   │   ├── Course.kt
│       │   │   │   │   ├── Comment.kt
│       │   │   │   │   └── Video.kt
│       │   │   │   ├── repository/
│       │   │   │   │   ├── AuthRepository.kt
│       │   │   │   │   ├── UserRepository.kt
│       │   │   │   │   ├── ArticlesRepository.kt
│       │   │   │   │   └── ...
│       │   │   │   └── usecase/
│       │   │   │       ├── auth/
│       │   │   │       ├── articles/
│       │   │   │       └── ...
│       │   │   ├── presentation/
│       │   │   │   ├── auth/
│       │   │   │   ├── catalog/
│       │   │   │   ├── articles/
│       │   │   │   ├── editor/
│       │   │   │   ├── courses/
│       │   │   │   ├── profile/
│       │   │   │   ├── moderation/
│       │   │   │   ├── admin/
│       │   │   │   ├── components/
│       │   │   │   └── main/
│       │   │   ├── navigation/
│       │   │   │   ├── AppNavigation.kt
│       │   │   │   ├── Screen.kt
│       │   │   │   ├── AuthGraph.kt
│       │   │   │   └── MainGraph.kt
│       │   │   └── worker/
│       │   │       └── DraftSyncWorker.kt
│       │   └── res/
│       └── test/
├── build.gradle.kts
├── settings.gradle.kts
└── gradle/libs.versions.toml
```

## 4. Слои архитектуры

### 4.1 Domain

Самый внутренний слой. Не зависит от Android SDK, Retrofit, Room.

- **Models**: POJO/Kotlin data classes (`User`, `Article`, `Category` и т.д.).
- **Repository interfaces**: контракты для работы с данными.
- **Use cases**: бизнес-операции (один use case — одна операция).

Пример модели:

```kotlin
data class Article(
    val id: String,
    val title: String,
    val slug: String,
    val content: String?,
    val status: ArticleStatus,
    val author: Author,
    val category: Category,
    val createdAt: Instant,
    val publishedAt: Instant?,
    val rejectionReason: String?,
    val videos: List<Video> = emptyList(),
    val coverUrl: String? = null,
    val hasVideo: Boolean = false,
)

enum class ArticleStatus { DRAFT, PENDING, PUBLISHED, REJECTED }
```

Пример use case:

```kotlin
class GetArticlesUseCase @Inject constructor(
    private val repository: ArticlesRepository
) {
    operator fun invoke(
        categoryId: String? = null,
        search: String? = null
    ): Flow<PagingData<ArticleListItem>> = repository.getArticles(categoryId, search)
}
```

### 4.2 Data

Внешний слой. Реализует repository interfaces и работает с источниками данных.

#### 4.2.1 Remote

- Retrofit API-интерфейсы.
- DTO для сериализации (Kotlin Serialization).
- AuthInterceptor для JWT и refresh.

#### 4.2.2 Local

- Room Database, Entity, DAO.
- TokenDataStore на основе EncryptedSharedPreferences.

#### 4.2.3 Repository

Repository объединяет remote и local источники:

```kotlin
class ArticlesRepositoryImpl @Inject constructor(
    private val articlesApi: ArticlesApi,
    private val articleDao: ArticleDao,
    private val networkMonitor: NetworkMonitor,
) : ArticlesRepository {

    override fun getArticles(
        categoryId: String?,
        search: String?
    ): Flow<PagingData<ArticleListItem>> {
        return Pager(
            config = PagingConfig(pageSize = 20),
            pagingSourceFactory = {
                ArticlesPagingSource(articlesApi, categoryId, search)
            }
        ).flow
    }

    override suspend fun getArticle(id: String): Result<Article> {
        return if (networkMonitor.isOnline()) {
            try {
                val dto = articlesApi.getArticle(id)
                val article = dto.toDomain()
                articleDao.insertArticle(article.toEntity())
                Result.success(article)
            } catch (e: Exception) {
                // fallback на локальный кеш
                getLocalArticle(id)
            }
        } else {
            getLocalArticle(id)
        }
    }

    private suspend fun getLocalArticle(id: String): Result<Article> {
        val entity = articleDao.getArticle(id)
        return if (entity != null) {
            Result.success(entity.toDomain())
        } else {
            Result.failure(OfflineException())
        }
    }
}
```

### 4.3 Presentation

- **UI (Compose)**: экраны, компоненты, тема.
- **ViewModel**: управляет состоянием экрана, вызывает use cases.
- **Navigation**: Jetpack Navigation Compose.

Пример ViewModel:

```kotlin
@HiltViewModel
class ArticleDetailViewModel @Inject constructor(
    private val getArticleDetail: GetArticleDetailUseCase,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {

    private val articleId: String = checkNotNull(savedStateHandle["articleId"])

    private val _uiState = MutableStateFlow(ArticleDetailUiState())
    val uiState: StateFlow<ArticleDetailUiState> = _uiState.asStateFlow()

    init {
        loadArticle()
    }

    private fun loadArticle() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            getArticleDetail(articleId)
                .onSuccess { article ->
                    _uiState.update { it.copy(isLoading = false, article = article) }
                }
                .onFailure { error ->
                    _uiState.update { it.copy(isLoading = false, error = error.message) }
                }
        }
    }
}
```

## 5. Навигация

### 5.1 Граф навигации

```
AppNavigation
├── AuthGraph (если не авторизован)
│   ├── LoginScreen
│   └── RegisterScreen
└── MainGraph (если авторизован)
    └── BottomNavHost
        ├── catalog_graph
        │   ├── CategoriesScreen
        │   ├── ArticlesScreen
        │   ├── ArticleDetailScreen
        │   └── CreateArticleScreen
        ├── courses_graph
        │   ├── CoursesScreen
        │   ├── CourseDetailScreen
        │   └── ArticleDetailScreen
        ├── my_articles_graph
        │   ├── MyArticlesScreen
        │   ├── ArticleDetailScreen
        │   └── CreateArticleScreen
        └── profile_graph
            ├── ProfileScreen
            ├── EditProfileScreen
            ├── ModerationScreen
            └── AdminScreen
```

### 5.2 Определение экранов

```kotlin
sealed class Screen(val route: String) {
    object Login : Screen("login")
    object Register : Screen("register")
    object Categories : Screen("categories")
    object Articles : Screen("articles?categoryId={categoryId}") {
        fun createRoute(categoryId: String? = null) =
            "articles?categoryId=${categoryId ?: "null"}"
    }
    object ArticleDetail : Screen("articles/{articleId}") {
        fun createRoute(articleId: String) = "articles/$articleId"
    }
    object CreateArticle : Screen("articles/create?articleId={articleId}") {
        fun createRoute(articleId: String? = null) =
            "articles/create?articleId=${articleId ?: "null"}"
    }
    object Courses : Screen("courses")
    object CourseDetail : Screen("courses/{courseId}") {
        fun createRoute(courseId: String) = "courses/$courseId"
    }
    object MyArticles : Screen("my_articles")
    object Profile : Screen("profile")
    object EditProfile : Screen("profile/edit")
    object Moderation : Screen("moderation")
    object Admin : Screen("admin")
}
```

## 6. DI (Hilt)

### 6.1 Модули

- `AppModule`: Application, CoroutineScope, NetworkMonitor.
- `DatabaseModule`: Room Database, DAO.
- `NetworkModule`: OkHttpClient, Retrofit, API-интерфейсы.
- `RepositoryModule`: binds interface → implementation.

### 6.2 Пример NetworkModule

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideBaseUrl(): String = BuildConfig.API_BASE_URL

    @Provides
    @Singleton
    fun provideAuthInterceptor(tokenDataStore: TokenDataStore): AuthInterceptor {
        return AuthInterceptor(tokenDataStore)
    }

    @Provides
    @Singleton
    fun provideOkHttpClient(
        authInterceptor: AuthInterceptor,
    ): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .apply {
                if (BuildConfig.DEBUG) {
                    addInterceptor(HttpLoggingInterceptor().apply {
                        level = HttpLoggingInterceptor.Level.BODY
                    })
                }
            }
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(baseUrl: String, client: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
    }

    @Provides
    @Singleton
    fun provideArticlesApi(retrofit: Retrofit): ArticlesApi = retrofit.create()
}
```

## 7. Авторизация и сеть

### 7.1 Хранение токенов

```kotlin
interface TokenDataStore {
    suspend fun saveTokens(accessToken: String, refreshToken: String)
    suspend fun getAccessToken(): String?
    suspend fun getRefreshToken(): String?
    suspend fun clearTokens()
    fun observeAccessToken(): Flow<String?>
}
```

Реализация на `EncryptedSharedPreferences`.

### 7.2 AuthInterceptor

```kotlin
class AuthInterceptor @Inject constructor(
    private val tokenDataStore: TokenDataStore,
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val accessToken = runBlocking { tokenDataStore.getAccessToken() }

        val authenticatedRequest = accessToken?.let {
            request.newBuilder()
                .header("Authorization", "Bearer $it")
                .build()
        } ?: request

        val response = chain.proceed(authenticatedRequest)

        if (response.code == 401) {
            response.close()
            return refreshTokenAndRetry(chain, authenticatedRequest)
        }

        return response
    }

    private fun refreshTokenAndRetry(
        chain: Interceptor.Chain,
        request: Request,
    ): Response {
        val refreshToken = runBlocking { tokenDataStore.getRefreshToken() } ?: throw UnauthorizedException()

        val refreshResponse = runBlocking {
            chain.proceed(
                Request.Builder()
                    .url("${BuildConfig.API_BASE_URL}/auth/refresh")
                    .post(
                        Json.encodeToString(RefreshRequest(refreshToken))
                            .toRequestBody("application/json".toMediaType())
                    )
                    .build()
            )
        }

        if (!refreshResponse.isSuccessful) {
            runBlocking { tokenDataStore.clearTokens() }
            throw UnauthorizedException()
        }

        val newAccessToken = parseAccessToken(refreshResponse)
        runBlocking { tokenDataStore.saveTokens(newAccessToken, refreshToken) }

        val newRequest = request.newBuilder()
            .header("Authorization", "Bearer $newAccessToken")
            .build()

        return chain.proceed(newRequest)
    }
}
```

## 8. Локальное хранилище

### 8.1 Room Database

```kotlin
@Database(
    entities = [
        ArticleEntity::class,
        CategoryEntity::class,
        DraftArticleEntity::class,
    ],
    version = 1,
)
abstract class LessonsPortalDatabase : RoomDatabase() {
    abstract fun articleDao(): ArticleDao
    abstract fun categoryDao(): CategoryDao
    abstract fun draftArticleDao(): DraftArticleDao
}
```

### 8.2 Entity

```kotlin
@Entity(tableName = "articles")
data class ArticleEntity(
    @PrimaryKey val id: String,
    val title: String,
    val content: String?,
    val authorName: String,
    val categoryName: String,
    val status: String,
    val createdAt: String,
    val cachedAt: Long = System.currentTimeMillis(),
)
```

## 9. Управление состоянием UI

### 9.1 Общий паттерн

Каждый экран имеет:

- `data class XxxUiState` — неизменяемое состояние.
- `ViewModel` с `StateFlow<XxxUiState>`.
- Compose-функцию, которая подписывается на `uiState`.

### 9.2 Пример UI-state

```kotlin
data class ArticlesUiState(
    val searchQuery: String = "",
    val selectedCategory: Category? = null,
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null,
)
```

### 9.3 Обработка side-эффектов

Для одноразовых событий (навигация, снекбар) использовать `Channel`:

```kotlin
class ArticlesViewModel : ViewModel() {
    private val _events = Channel<ArticlesEvent>()
    val events = _events.receiveAsFlow()

    fun onArticleClick(articleId: String) {
        viewModelScope.launch {
            _events.send(ArticlesEvent.NavigateToArticle(articleId))
        }
    }
}
```

## 10. Тема и UI

### 10.1 Material3

```kotlin
@Composable
fun LessonsPortalTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content,
    )
}
```

### 10.2 Адаптивность

- Использовать `WindowSizeClass` для определения телефон/планшет.
- На планшетах использовать two-pane layout (например, список статей слева, детальная статья справа).

## 11. Безопасность

- Токены — только в `EncryptedSharedPreferences`.
- Пароль никогда не логируется.
- SSL-pinning — опционально для prod.
- Cleartext traffic разрешён только для dev (`android:usesCleartextTraffic="true"` в debug-манифесте).

## 12. Фоновые задачи

### 12.1 Синхронизация черновиков

```kotlin
class DraftSyncWorker(
    context: Context,
    params: WorkerParameters,
    private val articlesRepository: ArticlesRepository,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        // Синхронизировать несинхронизированные черновики
        return Result.success()
    }
}
```

Запуск при появлении сети:

```kotlin
val constraints = Constraints.Builder()
    .setRequiredNetworkType(NetworkType.CONNECTED)
    .build()

val request = OneTimeWorkRequestBuilder<DraftSyncWorker>()
    .setConstraints(constraints)
    .build()

WorkManager.getInstance(context).enqueue(request)
```

## 13. Тестирование

### 13.1 Unit-тесты ViewModel

- Использовать `StandardTestDispatcher`/`UnconfinedTestDispatcher`.
- Мокать репозитории через MockK.
- Проверять переходы состояний через Turbine.

### 13.2 UI-тесты

- Compose Test: проверка навигации, ввода текста, отображения списков.

### 13.3 Интеграционные тесты

- Retrofit MockWebServer для проверки API и AuthInterceptor.

## 14. Соглашения по коду

- Все API-интерфейсы возвращают DTO, маппинг в domain model делается в repository.
- Все строки UI — в `res/values/strings.xml`.
- Все размеры/цвета — в `MaterialTheme` или `res/values`.
- `suspend`-функции репозитория возвращают `Result<T>`.
- Flow используется для потоковых данных (списки, кеш, токены).
