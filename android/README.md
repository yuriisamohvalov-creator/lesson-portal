# Lessons Portal Android

Android-клиент портала на Kotlin и Jetpack Compose. Минимальная версия — Android 8.0 (API 26), target SDK — 34.

## Локальная сборка

Требуются JDK 17 и Android SDK 34.

```bash
cd android
./gradlew testDebugUnitTest assembleDebug assembleDebugAndroidTest
```

Debug-сборка обращается к `http://10.0.2.2:3001/api/`, поэтому backend на машине разработчика должен слушать порт 3001. Release использует `https://lessons.samoh.ru/api/`.

Unsigned release bundle для проверки R8:

```bash
./gradlew bundleRelease
```

## Архитектура

- `data` — Retrofit API, DTO, Room и реализации репозиториев;
- `domain` — модели, интерфейсы репозиториев и use-case'ы;
- `presentation` — Compose-экраны и ViewModel;
- `navigation` — авторизованный граф и четыре основных раздела;
- `worker` — синхронизация локальных черновиков.

Hilt отвечает за внедрение зависимостей, Paging 3 — за каталоги, EncryptedSharedPreferences — за refresh token, Room — за офлайн-кеш статей.

## Подписанный релиз

Keystore не хранится в Git. Для локальной подписанной сборки положите его в `android/keystore.jks` либо задайте `KEYSTORE_FILE`, затем экспортируйте:

```bash
export KEYSTORE_PASSWORD='...'
export KEY_ALIAS='lessons-portal'
export KEY_PASSWORD='...'
./gradlew bundleRelease
```

GitHub Actions использует secrets:

- `KEYSTORE_BASE64`;
- `KEYSTORE_PASSWORD`;
- `KEY_ALIAS`;
- `KEY_PASSWORD`.

Результат находится в `app/build/outputs/bundle/release/`.

## Релизные ворота

Перед публикацией необходимо запустить Compose UI-тесты на эмуляторе, smoke-тесты на Android 8/10/12/14, проверить тёмную тему и offline-режим, загрузить AAB в Google Play Internal Testing и изучить pre-launch report.
