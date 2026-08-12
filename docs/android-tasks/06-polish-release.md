# Задание для AI-агента: Этап 6 — Полировка, CI/CD и релиз

## Цель

Довести приложение до production-ready состояния: обработка ошибок, темы, производительность, тесты, CI/CD, подпись и публикация в Google Play.

## Контекст

- Этапы 1–5 завершены: все основные функции реализованы.
- Проект находится в `android/` текущего репозитория.
- Требования: см. `docs/android-app-spec.md`.

## Задачи

### 6.1 Обработка ошибок и UX

1. Создать централизованный `ErrorHandler`:
   - сетевая ошибка → "Проверьте подключение к интернету";
   - 401 после неудачного refresh → "Сессия истекла, войдите снова" и редирект на LoginScreen;
   - 403 → "Недостаточно прав";
   - 500 → "Ошибка сервера, попробуйте позже";
   - валидация → конкретное сообщение.
2. Добавить `SnackbarHost` в MainActivity.
3. Добавить pull-to-refresh на все экраны со списками.
4. Добавить skeleton-загрузку для:
   - списка статей;
   - списка курсов;
   - детальной статьи.
5. Добавить empty state для пустых списков с иконкой и текстом.
6. Добавить индикатор offline-режима (Banner) на экраны, поддерживающие offline.

### 6.2 Темы и визуальная полировка

1. Настроить светлую и тёмную тему на Material3.
2. Создать `Color.kt`, `Theme.kt`, `Type.kt`.
3. Убедиться, что все экраны корректно выглядят в тёмной теме.
4. Добавить анимации переходов между экранами (опционально).
5. Унифицировать отступы и типографику через `Dimens` object.

### 6.3 Производительность

1. Проверить все `LazyColumn`/`LazyRow` на использование keys.
2. Добавить `remember`/`derivedStateOf` где необходимо.
3. Убедиться, что WebView для HTML не пересоздаётся при scroll.
4. Настроить Coil cache (memory + disk).
5. Проверить отсутствие утечек памяти через LeakCanary (debug build).
6. Добавить StrictMode в debug builds для поиска дисковых/сетевых операций в main thread.

### 6.4 Логирование

1. Подключить Timber.
2. Заменить все `Log.*` на Timber.
3. В продакшене отключать debug-логирование.
4. Логировать только нечувствительные события (никогда не логировать токены/пароли).

### 6.5 Тестирование

#### Unit-тесты

Добавить/расширить тесты для:

- `AuthViewModel` — логин, регистрация, refresh, logout.
- `ArticlesViewModel` — загрузка, пагинация, ошибки.
- `ArticleDetailViewModel` — загрузка, комментарии, видео.
- `ArticleEditorViewModel` — создание, обновление, черновики.
- `CoursesViewModel` — загрузка курсов.
- `ProfileViewModel` — профиль, обновление.
- `ModerationViewModel` — approve/reject.
- `AdminViewModel` — пользователи, категории.

Использовать:

- JUnit 4 + Mockito-Kotlin или MockK.
- Turbine для тестирования Flow.
- Coroutines Test.

#### UI-тесты

- Авторизация.
- Переход по bottom navigation.
- Открытие статьи.
- Создание черновика.
- Добавление комментария.

Использовать Compose Testing + Hilt testing.

### 6.6 ProGuard / R8

1. Настроить `proguard-rules.pro`:
   - сохранить DTO для Kotlin Serialization (`@Serializable`);
   - сохранить Retrofit модели;
   - сохранить Room entity;
   - сохранить Hilt компоненты.
2. Включить `minifyEnabled true` для release builds.
3. Протестировать release build на реальном устройстве.

### 6.7 CI/CD

Создать `.github/workflows/android.yml`:

```yaml
name: Android CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
      - name: Grant execute permission for gradlew
        run: chmod +x android/gradlew
      - name: Run unit tests
        working-directory: android
        run: ./gradlew testDebugUnitTest
      - name: Build debug APK
        run: ./gradlew assembleDebug

  release:
    if: github.ref == 'refs/heads/main'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
      - name: Decode keystore
        run: echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > android/keystore.jks
      - name: Build release AAB
        working-directory: android
        run: ./gradlew bundleRelease
        env:
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
      - name: Upload AAB to artifact
        uses: actions/upload-artifact@v4
        with:
          name: release-aab
          path: android/app/build/outputs/bundle/release/*.aab
```

Требования к secrets:

- `KEYSTORE_BASE64` — base64-encoded release keystore.
- `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`.

### 6.8 Подпись приложения

1. Создать release keystore:

```bash
keytool -genkey -v -keystore lessons-portal.keystore -alias lessons-portal -keyalg RSA -keysize 2048 -validity 10000
```

2. Настроить `app/build.gradle.kts`:

```kotlin
android {
    signingConfigs {
        create("release") {
            storeFile = file("../keystore.jks")
            storePassword = System.getenv("KEYSTORE_PASSWORD")
            keyAlias = System.getenv("KEY_ALIAS")
            keyPassword = System.getenv("KEY_PASSWORD")
        }
    }
    buildTypes {
        getByName("release") {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName("release")
        }
    }
}
```

3. Хранить keystore в secrets CI, не коммитить в репозиторий.

### 6.9 Google Play Console

1. Создать аккаунт разработчика Google Play (если ещё нет).
2. Создать приложение:
   - название;
   - язык по умолчанию (русский);
   - пакет: `ru.samoh.lessonsportal`.
3. Заполнить store listing:
   - короткое и полное описание;
   - скриншоты для телефонов и планшетов;
   - иконка 512x512;
   - feature graphic 1024x500.
4. Загрузить AAB в Internal Testing.
5. Пройти тестирование Closed Testing.
6. Выпустить в Open Testing → Production.

### 6.10 App Bundle и размер

1. Собрать release AAB.
2. Проверить размер APK по ABI через Bundle Tool.
3. Если размер > 50 МБ — оптимизировать (R8, ресурсы, Coil cache config).

### 6.11 Документация

1. Создать `android/README.md` с:
   - инструкцией по сборке;
   - описанием структуры;
   - списком secrets для CI.
2. Обновить основной `README.md` проекта — добавить раздел "Android приложение".

### 6.12 Финальная проверка

Перед релизом проверить:

- [ ] Все unit-тесты проходят.
- [ ] Все UI-тесты проходят.
- [ ] Release build собирается без ошибок.
- [ ] Приложение работает на Android 8, 10, 12, 14.
- [ ] Тёмная тема корректна.
- [ ] Офлайн-режим работает.
- [ ] Авторизация не теряется после перезапуска.
- [ ] Автоматический refresh токена работает.
- [ ] Google Play pre-launch report не показывает критических ошибок.

## Критерии приёмки

- [ ] Приложение имеет светлую/тёмную тему Material3.
- [ ] Все списки поддерживают pull-to-refresh и empty state.
- [ ] Unit/UI тесты проходят.
- [ ] Release build с minifyEnabled собирается.
- [ ] CI/CD pipeline запускает тесты и собирает AAB.
- [ ] AAB загружен в Google Play Internal Testing.
- [ ] Документация обновлена.

## Примечания

- Push-уведомления отложены по согласованию, но оставить место для интеграции FCM в будущем.
- Deeplinks отложены по согласованию.
- Для планшетов адаптивность уже реализована на предыдущих этапах.
