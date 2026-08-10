# Lessons Portal Android

Android-клиент размещён в отдельном Gradle-проекте и требует JDK 17+ и Android SDK 34.

## Проверка

```bash
./gradlew testDebugUnitTest assembleDebug
```

Debug-сборка обращается к backend эмулятора по `http://10.0.2.2:3001/api/`.
Release-сборка использует `https://lessons.samoh.ru/api/`. Cleartext разрешён только в debug manifest.

## Текущий объём

- Compose + Material 3;
- Hilt;
- Retrofit, Kotlin Serialization и OkHttp;
- зашифрованное хранение access/refresh токенов;
- отдельный Retrofit-клиент для refresh без рекурсивного authenticator;
- Room-каркас для локальных черновиков;
- Login/Register и переключение auth/main navigation.
- каталог категорий и пагинируемый поиск статей;
- детальная статья с безопасным HTML WebView, YouTube и комментариями;
- Room-кеш категорий, списка и просмотренных статей с offline fallback.
- Markdown-редактор статей с HTML preview, изображениями и PDF-импортом;
- локальные черновики с автосохранением и WorkManager-синхронизацией;
- раздел «Мои статьи» и отправка материалов на модерацию.
