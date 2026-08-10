# Задание для AI-агента: Этап 1 — Каркас приложения и авторизация

## Цель

Создать Android-проект Kotlin + Jetpack Compose, настроить DI, сеть, навигацию и реализовать полноценную авторизацию через JWT.

## Контекст

- Проект располагается в папке `android/` текущего репозитория `lessons-portal`.
- Backend: `https://lessons.samoh.ru/api`.
- Авторизация: JWT access + refresh. Refresh-токен будет приниматься endpoint `/auth/refresh` в теле запроса для мобильных клиентов.
- Требования: см. `docs/android-app-spec.md`.

## Технический стек

- Kotlin 1.9+
- Jetpack Compose (BOM 2024.02+)
- Hilt 2.50+
- Retrofit 2.9+ + OkHttp 4.12+
- Kotlin Serialization 1.6+
- Room 2.6+
- Navigation Compose 2.7+
- Material3
- Coil 2.6+
- Timber 5.0+

## Структура проекта

Создать папку `android/` в корне репозитория со следующей структурой:

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
│       │   │   │       └── NetworkModule.kt
│       │   │   ├── data/
│       │   │   │   ├── local/
│       │   │   │   │   ├── LessonsPortalDatabase.kt
│       │   │   │   │   ├── dao/
│       │   │   │   │   │   └── DraftArticleDao.kt
│       │   │   │   │   └── entity/
│       │   │   │   │       └── DraftArticleEntity.kt
│       │   │   │   ├── remote/
│       │   │   │   │   ├── api/
│       │   │   │   │   │   ├── AuthApi.kt
│       │   │   │   │   │   └── UserApi.kt
│       │   │   │   │   ├── dto/
│       │   │   │   │   │   ├── LoginRequest.kt
│       │   │   │   │   │   ├── RegisterRequest.kt
│       │   │   │   │   │   ├── TokenResponse.kt
│       │   │   │   │   │   └── UserDto.kt
│       │   │   │   │   └── interceptor/
│       │   │   │   │       └── AuthInterceptor.kt
│       │   │   │   ├── repository/
│       │   │   │   │   ├── AuthRepositoryImpl.kt
│       │   │   │   │   └── UserRepositoryImpl.kt
│       │   │   │   └── datastore/
│       │   │   │       └── TokenDataStore.kt
│       │   │   ├── domain/
│       │   │   │   ├── model/
│       │   │   │   │   ├── User.kt
│       │   │   │   │   ├── UserRole.kt
│       │   │   │   │   └── AuthTokens.kt
│       │   │   │   ├── repository/
│       │   │   │   │   ├── AuthRepository.kt
│       │   │   │   │   └── UserRepository.kt
│       │   │   │   └── usecase/
│       │   │   │       ├── LoginUseCase.kt
│       │   │   │       ├── RegisterUseCase.kt
│       │   │   │       ├── LogoutUseCase.kt
│       │   │   │       └── GetCurrentUserUseCase.kt
│       │   │   ├── presentation/
│       │   │   │   ├── auth/
│       │   │   │   │   ├── AuthViewModel.kt
│       │   │   │   │   ├── LoginScreen.kt
│       │   │   │   │   └── RegisterScreen.kt
│       │   │   │   └── main/
│       │   │   │       └── MainActivity.kt
│       │   │   └── navigation/
│       │   │       ├── AppNavigation.kt
│       │   │       ├── AuthGraph.kt
│       │   │       └── MainGraph.kt
│       │   └── res/
│       │       ├── values/
│       │       │   ├── colors.xml
│       │       │   ├── strings.xml
│       │       │   └── themes.xml
│       │       └── xml/
│       │           └── network_security_config.xml
│       └── test/
│           └── java/ru/samoh/lessonsportal/
│               └── presentation/
│                   └── auth/
│                       └── AuthViewModelTest.kt
├── build.gradle.kts
├── settings.gradle.kts
└── gradle/
    └── libs.versions.toml
```

## Задачи

### 1.1 Создание проекта

1. Инициализировать Android-проект в `android/` с пустым Compose-шаблоном.
2. Настроить `build.gradle.kts` (project level и app level):
   - подключить Hilt plugin;
   - подключить Kotlin Serialization;
   - подключить ksp для Room;
   - настроить minSdk = 26, targetSdk = 34, compileSdk = 34.
3. Создать `gradle/libs.versions.toml` с версиями всех библиотек.
4. Настроить `AndroidManifest.xml`:
   - INTERNET permission;
   - application name = `LessonsPortalApplication`;
   - конфигурация сети для cleartext — только для dev, для prod использовать HTTPS.

### 1.2 DI-модули

1. `AppModule`: предоставить `Application`, `CoroutineScope(@ApplicationScope)`.
2. `DatabaseModule`: создать Room-базу `LessonsPortalDatabase` с entity `DraftArticleEntity`.
3. `NetworkModule`:
   - создать OkHttpClient с логгером (только debug);
   - базовый URL брать из `BuildConfig.API_BASE_URL`;
   - Retrofit с Kotlin Serialization converter;
   - singleton-экземпляры API-интерфейсов.

### 1.3 Хранение токенов

Реализовать `TokenDataStore` на основе `EncryptedSharedPreferences`:

```kotlin
interface TokenDataStore {
    suspend fun saveTokens(accessToken: String, refreshToken: String)
    suspend fun getAccessToken(): String?
    suspend fun getRefreshToken(): String?
    suspend fun clearTokens()
    fun observeAccessToken(): Flow<String?>
}
```

### 1.4 API интерфейсы

Создать DTO и API:

```kotlin
@Serializable
data class LoginRequest(val email: String, val password: String)

@Serializable
data class RegisterRequest(val email: String, val password: String, val displayName: String)

@Serializable
data class TokenResponse(
    val accessToken: String,
    val refreshToken: String,
    val user: UserDto
)

@Serializable
data class RefreshRequest(val refreshToken: String)

interface AuthApi {
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): TokenResponse

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): TokenResponse

    @POST("auth/refresh")
    suspend fun refresh(@Body request: RefreshRequest): TokenResponse

    @POST("auth/logout")
    suspend fun logout()
}
```

### 1.5 AuthInterceptor

Реализовать OkHttp Interceptor, который:

1. Добавляет `Authorization: Bearer <accessToken>` к запросам, если токен есть.
2. При 401 делает синхронный вызов `/auth/refresh` с refresh-токеном.
3. Сохраняет новые токены и повторяет исходный запрос.
4. Если refresh не удался — очищает токены и выбрасывает ошибку авторизации.

Использовать `runBlocking` только внутри interceptor для синхронного refresh.

### 1.6 Репозитории

Реализовать:

- `AuthRepository.login(email, password)`
- `AuthRepository.register(email, password, displayName)`
- `AuthRepository.refreshTokens()`
- `AuthRepository.logout()`
- `UserRepository.getCurrentUser()` — `GET /users/me`
- `UserRepository.updateProfile(displayName)` — `PATCH /users/me`

Все методы возвращают `Result<T>` или обёртку `Resource<T>`.

### 1.7 UseCase

Создать:

- `LoginUseCase`
- `RegisterUseCase`
- `LogoutUseCase`
- `GetCurrentUserUseCase`

### 1.8 UI: LoginScreen

- Email и Password поля с валидацией.
- Кнопка "Войти" с индикатором загрузки.
- Ссылка "Создать аккаунт".
- Отображение ошибок через Snackbar.

### 1.9 UI: RegisterScreen

- Email, Password, Confirm Password, Display Name.
- Валидация:
  - email формат;
  - пароль ≥ 8 символов;
  - пароли совпадают;
  - имя не пустое.
- Кнопка "Зарегистрироваться".

### 1.10 UI: MainActivity и навигация

1. `MainActivity` с `setContent { LessonsPortalTheme { AppNavigation(...) } }`.
2. `AppNavigation` проверяет наличие access-токена:
   - если токен есть — `MainGraph`;
   - если нет — `AuthGraph`.
3. `AuthGraph`: LoginScreen → RegisterScreen.
4. `MainGraph`: заглушка `MainScreen` с текстом "Главный экран".

### 1.11 ViewModel и состояния

Создать `AuthViewModel` с `StateFlow<AuthUiState>`:

```kotlin
sealed class AuthUiState {
    object Idle : AuthUiState()
    object Loading : AuthUiState()
    data class Error(val message: String) : AuthUiState()
    object Authenticated : AuthUiState()
}
```

### 1.12 Тестирование

- Unit-тест `AuthViewModelTest`:
  - успешный логин переводит в `Authenticated`;
  - ошибка логина показывает `Error`;
  - валидация email/пароля.

## Критерии приёмки

- [ ] Проект собирается (`./gradlew assembleDebug`).
- [ ] LoginScreen и RegisterScreen отображаются корректно.
- [ ] Успешный логин сохраняет токены и переводит на главный экран.
- [ ] При 401 происходит автоматический refresh токена.
- [ ] Room-база создана, DAO для черновиков есть.
- [ ] Unit-тесты проходят.

## Примечания

- Backend endpoint `/auth/refresh` будет доработан для приёма refresh-токена в теле. В этом задании используем `RefreshRequest`.
- Все строки в `res/values/strings.xml`.
- Тема приложения на Material3.
