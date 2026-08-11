--- docs/android-tasks/07-README.md (原始)


+++ docs/android-tasks/07-README.md (修改后)
# Внешние проверки Android-приложения (Этап 7)

## Обзор

Этот документ содержит навигацию по поэтапной документации для проведения внешних проверок Android-приложения Lessons Portal после завершения локальной разработки.

## Структура этапов

| № | Этап | Файл | Описание | Время |
|---|------|------|----------|-------|
| 7.1 | Настройка окружения | [07-01-setup-environment.md](./07-01-setup-environment.md) | Установка JDK, Android Studio, SDK, Git, Node.js | 30-60 мин |
| 7.2 | Создание эмуляторов | [07-02-setup-emulators.md](./07-02-setup-emulators.md) | Настройка AVD для Android 8, 10, 12, 14 | 30-45 мин |
| 7.3 | UI-тесты на эмуляторе | [07-03-run-ui-tests.md](./07-03-run-ui-tests.md) | Запуск instrumented тестов и анализ отчётов | 15-30 мин |
| 7.4 | Smoke-тесты | [07-04-smoke-tests.md](./07-04-smoke-tests.md) | Ручное тестирование на 4 версиях Android | 2-3 часа |
| 7.5 | Тесты на реальном устройстве | [07-05-test-on-device.md](./07-05-test-on-device.md) | Проверка на физическом устройстве | 1-2 часа |
| 7.6 | CI secrets | [07-06-ci-secrets-setup.md](./07-06-ci-secrets-setup.md) | Настройка подписи release сборок в GitHub Actions | 30-45 мин |
| 7.7 | Google Play Internal Testing | [07-07-google-play-internal-testing.md](./07-07-google-play-internal-testing.md) | Загрузка в Internal Testing трек | 30-60 мин |
| 7.8 | Pre-Launch Report | [07-08-pre-launch-report.md](./07-08-pre-launch-report.md) | Анализ автоматического отчёта Google Play | 30-60 мин |
| 7.9 | Финальный чек-лист | [07-09-final-checklist.md](./07-09-final-checklist.md) | Полная проверка перед Production релизом | 1-2 часа |

**Общее время:** 6-10 часов (можно разбить на несколько дней)

---

## Быстрый старт

### Минимальный путь (только обязательные этапы)

Если время ограничено, выполните эти этапы:

1. **7.1** — Настройка окружения ⚡ Обязательно
2. **7.2** — Создание эмулятора API 34 ⚡ Обязательно
3. **7.3** — Запуск UI-тестов ⚡ Обязательно
4. **7.6** — Настройка CI secrets ⚡ Обязательно
5. **7.7** — Загрузка в Internal Testing ⚡ Обязательно
6. **7.9** — Финальный чек-лист ⚡ Обязательно

### Полный путь (рекомендуется)

Выполнить все 9 этапов последовательно для максимальной уверенности в качестве.

---

## Детали этапов

### 7.1 Настройка окружения

**Что делаем:**
- Устанавливаем JDK 17
- Устанавливаем Android Studio
- Настраиваем Android SDK (API 26, 29, 31, 34)
- Устанавливаем Git и Node.js
- Проверяем сборку проекта

**Результат:**
- ✅ Окружение готово к разработке
- ✅ Проект собирается без ошибок

**Команда проверки:**
```bash
cd android
./gradlew assembleDebug
```

---

### 7.2 Создание эмуляторов

**Что делаем:**
- Создаём 4 эмулятора через AVD Manager
- Настраиваем параметры (RAM, CPU, Storage)
- Оптимизируем производительность

**Эмуляторы:**
- Pixel 6 API 26 (Android 8.0) — минимальная версия
- Pixel 6 API 29 (Android 10) — популярная версия
- Pixel 6 API 31 (Android 12) — средняя версия
- Pixel 6 API 34 (Android 14) — основная для разработки

**Результат:**
- ✅ 4 эмулятора готовы к тестированию

---

### 7.3 UI-тесты на эмуляторе

**Что делаем:**
- Запускаем эмулятор API 34
- Выполняем `connectedAndroidTest`
- Анализируем HTML отчёт

**Команды:**
```bash
emulator -avd Pixel_6_API_34 &
./gradlew connectedAndroidTest
open app/build/reports/androidTests/connected/index.html
```

**Результат:**
- ✅ Все UI-тесты прошли
- ✅ Отчёт сохранён

---

### 7.4 Smoke-тесты

**Что делаем:**
- Запускаем все 4 эмулятора
- Проходим чек-лист из 50+ пунктов
- Заполняем матрицу тестирования

**Основные проверяемые функции:**
- Авторизация и сессия
- Статьи (список, просмотр, комментарии, создание)
- Курсы (список, детали)
- Профиль (просмотр, редактирование, аватар)
- Офлайн-режим
- Обработка ошибок

**Результат:**
- ✅ Матрица тестирования заполнена
- ✅ Критические проблемы выявлены и исправлены

---

### 7.5 Тесты на реальном устройстве

**Что делаем:**
- Включаем Developer Mode и USB Debugging
- Подключаем устройство
- Устанавливаем debug APK
- Проверяем производительность, память, камеру

**Команды:**
```bash
adb devices
./gradlew installDebug
adb logcat | grep -i "lessonsportal"
```

**Результат:**
- ✅ Приложение работает на реальном устройстве
- ✅ Нет утечек памяти (LeakCanary чист)
- ✅ Производительность в норме

---

### 7.6 CI secrets

**Что делаем:**
- Генерируем release keystore через keytool
- Кодируем в base64
- Добавляем 4 секрета в GitHub
- Настраиваем workflow для подписанной сборки

**Секреты:**
- `KEYSTORE_BASE64` — закодированный keystore
- `KEYSTORE_PASSWORD` — пароль хранилища
- `KEY_ALIAS` — псевдоним ключа
- `KEY_PASSWORD` — пароль ключа

**Результат:**
- ✅ CI собирает подписанный AAB
- ✅ Keystore сохранён в надёжном месте

---

### 7.7 Google Play Internal Testing

**Что делаем:**
- Регистрируем аккаунт разработчика ($25)
- Создаем приложение в Console
- Загружаем AAB в Internal Testing
- Добавляем тестировщиков
- Получаем ссылку для участия

**Результат:**
- ✅ Internal Testing настроен
- ✅ Тестировщики могут установить приложение

---

### 7.8 Pre-Launch Report

**Что делаем:**
- Открываем отчёт в Google Play Console
- Анализируем краши, совместимость, производительность
- Исправляем критические проблемы
- Сохраняем PDF отчёт

**Разделы отчёта:**
- Краши при запуске
- Проблемы совместимости
- Производительность
- Доступность
- Безопасность данных

**Результат:**
- ✅ Критические проблемы исправлены
- ✅ Отчёт задокументирован

---

### 7.9 Финальный чек-лист

**Что делаем:**
- Проходим чек-лист из 7 частей
- Выполняем финальные команды проверки
- Готовим план релиза

**Части чек-листа:**
1. Тестирование (unit, UI, smoke)
2. Функциональность (все фичи)
3. Производительность (время запуска, память, FPS)
4. Безопасность (токены, разрешения, ProGuard)
5. Документация (README, changelog, код)
6. Google Play (настройки, активы, рейтинг)
7. CI/CD (workflows, ветки, теги)

**Результат:**
- ✅ Готовность к Production релизу подтверждена

---

## Общие команды

### Сборка и тесты

```bash
cd android

# Очистка
./gradlew clean

# Unit-тесты
./gradlew testDebugUnitTest

# UI-тесты на эмуляторе
./gradlew connectedAndroidTest

# Debug APK
./gradlew assembleDebug

# Release AAB
./gradlew bundleRelease

# Lint проверка
./gradlew lint

# Форматирование
./gradlew ktlintCheck
```

### ADB команды

```bash
# Список устройств
adb devices

# Установка APK
adb install -r app-debug.apk

# Логи
adb logcat | grep -i "lessonsportal"

# Скриншот
adb shell screencap -p /sdcard/screen.png
adb pull /sdcard/screen.png

# Время запуска
adb shell am start -W ru.samoh.lessonsportal/.ui.MainActivity
```

---

## Чек-лист готовности

Перед началом этапа 7 убедитесь:

- [ ] Локальная разработка Этапа 6 завершена
- [ ] Все unit-тесты проходят локально
- [ ] Код отформатирован (ktlint)
- [ ] Нет критических TODO
- [ ] Ветка актуальна (main/master)

---

## Роли и ответственность

| Роль | Задачи |
|------|--------|
| **Developer** | Этапы 7.1-7.3, 7.6 |
| **QA Engineer** | Этапы 7.4-7.5, 7.8 |
| **DevOps/Lead** | Этапы 7.6-7.7, 7.9 |
| **Product Manager** | Этап 7.7 (настройка Google Play), 7.9 (релиз) |

---

## Таймлайн

### День 1: Подготовка и автотесты
- 7.1 Настройка окружения (30 мин)
- 7.2 Создание эмуляторов (30 мин)
- 7.3 UI-тесты (30 мин)
- 7.6 CI secrets (30 мин)

### День 2: Ручное тестирование
- 7.4 Smoke-тесты (2-3 часа)
- 7.5 Тесты на устройстве (1-2 часа)

### День 3: Публикация и проверка
- 7.7 Google Play Internal Testing (30-60 мин)
- 7.8 Pre-Launch Report (30-60 мин)
- 7.9 Финальный чек-лист (1-2 часа)

---

## Контакты

При возникновении проблем обращайтесь:

- Технические вопросы: [Tech Lead]
- QA вопросы: [QA Lead]
- Google Play: [DevOps/PM]

---

## Ресурсы

### Официальная документация

- [Android Developers](https://developer.android.com/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer/)
- [Android Testing Guide](https://developer.android.com/training/testing)

### Инструменты

- [Android Studio](https://developer.android.com/studio)
- [Firebase Test Lab](https://firebase.google.com/docs/test-lab)
- [Fastlane](https://fastlane.tools/)

### Сообщества

- [Stack Overflow - Android](https://stackoverflow.com/questions/tagged/android)
- [Reddit r/androiddev](https://www.reddit.com/r/androiddev/)
- [Kotlin Slack](https://kotlinlang.slack.com/)

---

**Дата обновления:** Декабрь 2024
**Статус:** Готово к использованию
**Версия документации:** 1.0.0