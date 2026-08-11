--- docs/android-tasks/07-external-validation.md (原始)


+++ docs/android-tasks/07-external-validation.md (修改后)
# Внешние проверки Android-приложения (Этап 6)

Этот документ описывает пошаговую инструкцию по проведению внешних проверок Android-приложения после завершения локальной разработки Этапа 6.

## Предварительные требования

### Установленное ПО на рабочей машине

1. **JDK 17** (или выше)
   ```bash
   # Проверка версии
   java -version

   # Установка на Ubuntu/Debian
   sudo apt install openjdk-17-jdk

   # Установка на macOS (через Homebrew)
   brew install openjdk@17
   ```

2. **Android Studio** (последняя стабильная версия)
   - Скачать: https://developer.android.com/studio
   - При установке выбрать:
     - Android SDK
     - Android Virtual Device (AVD) Manager
     - Android SDK Build-Tools
     - Android SDK Platform-Tools

3. **Android SDK** (минимум API 26–34)
   - Открыть Android Studio → Tools → SDK Manager
   - Установить платформы:
     - Android 8.0 (API 26)
     - Android 10 (API 29)
     - Android 12 (API 31)
     - Android 14 (API 34)
   - Установить Build-Tools последней версии

4. **Git** (для работы с репозиторием)

5. **Node.js 18+** (опционально, для CI/CD тестирования)

---

## 1. Запуск UI-тестов на эмуляторе

### 1.1 Создание эмулятора

1. Открыть Android Studio → Tools → AVD Manager
2. Нажать **Create Virtual Device**
3. Выбрать устройство:
   - Pixel 6 (или аналогичное)
4. Выбрать системный образ:
   - Рекомендуется **Android 14 (API 34)** для основных тестов
   - Дополнительно создать эмуляторы для Android 8, 10, 12 (см. раздел 2)
5. Настроить параметры:
   - RAM: минимум 2048 MB
   - VM Heap: 512 MB
   - Internal Storage: 4096 MB
6. Finish

### 1.2 Запуск UI-тестов

```bash
cd android

# Запустить все UI-тесты на подключенном эмуляторе
./gradlew connectedAndroidTest

# Запустить конкретный тест-класс
./gradlew connectedAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=ru.samoh.lessonsportal.ui.tests.LoginScreenTest

# Запустить тесты и открыть отчёт
./gradlew connectedAndroidTest && \
  open app/build/reports/androidTests/connected/index.html
```

### 1.3 Отчёт по тестам

Отчёт будет доступен по пути:
```
android/app/build/reports/androidTests/connected/index.html
```

Открыть в браузере и проверить:
- Все тесты прошли (зелёные)
- Скриншоты при падениях (если есть)
- Логи тестов

---

## 2. Smoke-тесты на разных версиях Android

### 2.1 Подготовка эмуляторов

Создать 4 эмулятора в AVD Manager:

| Версия | API | Образ | Примечание |
|--------|-----|-------|------------|
| Android 8.0 | 26 | x86_64 | Минимальная поддерживаемая версия |
| Android 10 | 29 | x86_64 | Популярная версия |
| Android 12 | 31 | x86_64 | Средняя версия |
| Android 14 | 34 | x86_64 | Последняя стабильная |

### 2.2 Чек-лист smoke-тестов

Для каждой версии Android выполнить ручную проверку:

#### Базовый функционал

- [ ] Приложение запускается без крашей
- [ ] Экран загрузки отображается корректно
- [ ] Темная тема работает (переключить в настройках устройства)
- [ ] Ориентация экрана (портрет/ландшафт) не ломает UI

#### Авторизация

- [ ] Экран логина отображается
- [ ] Ввод неверных данных → показывается ошибка
- [ ] Успешный логин → переход на главный экран
- [ ] Logout → возврат на экран логина
- [ ] Сессия сохраняется после перезапуска приложения

#### Навигация

- [ ] Bottom navigation переключает экраны
- [ ] Возврат назад работает корректно
- [ ] Глубокие ссылки (если реализованы) открывают нужные экраны

#### Статьи

- [ ] Список статей загружается
- [ ] Pull-to-refresh обновляет список
- [ ] Skeleton отображается во время загрузки
- [ ] Empty state показывается при пустом списке
- [ ] Открытие статьи → контент отображается
- [ ] Комментарии загружаются и отображаются
- [ ] Добавление комментария работает

#### Курсы

- [ ] Список курсов загружается
- [ ] Фильтрация/сортировка работает (если есть)
- [ ] Детали курса отображаются

#### Профиль

- [ ] Данные пользователя загружаются
- [ ] Редактирование профиля работает
- [ ] Аватар загружается/обновляется

#### Создание/редактирование статьи

- [ ] Форма создания статьи открывается
- [ ] Сохранение черновика работает
- [ ] Публикация статьи работает
- [ ] Валидация полей показывает ошибки

#### Офлайн-режим

- [ ] Отключить сеть → появляется offline-banner
- [ ] Кэшированные данные отображаются
- [ ] При восстановлении сети banner исчезает

#### Обработка ошибок

- [ ] Network error → корректное сообщение
- [ ] 401 ошибка → редирект на логин
- [ ] 403 ошибка → сообщение о недостатке прав
- [ ] 500 ошибка → сообщение об ошибке сервера

### 2.3 Автоматизация smoke-тестов (опционально)

Создать скрипт для последовательного запуска на всех эмуляторах:

```bash
#!/bin/bash
# scripts/smoke-tests.sh

EMULATORS=("Pixel_6_API_26" "Pixel_6_API_29" "Pixel_6_API_31" "Pixel_6_API_34")

for emulator in "${EMULATORS[@]}"; do
  echo "🚀 Запуск эмулятора: $emulator"

  # Запуск эмулятора
  emulator -avd "$emulator" -no-boot-anim -no-window &
  EMULATOR_PID=$!

  # Ожидание загрузки
  adb wait-for-device
  sleep 30

  # Запуск тестов
  echo "🧪 Запуск тестов на $emulator"
  ./gradlew connectedAndroidTest

  # Остановка эмулятора
  kill $EMULATOR_PID

  echo "✅ Тесты на $emulator завершены"
done
```

---

## 3. Проверка на реальном устройстве

### 3.1 Подготовка устройства

1. Включить **Режим разработчика** на устройстве:
   - Настройки → О телефоне → 7 раз нажать на "Номер сборки"

2. Включить **USB Debugging**:
   - Настройки → Для разработчиков → Отладка по USB

3. Подключить устройство к компьютеру через USB

4. Проверить подключение:
   ```bash
   adb devices
   ```

   Устройство должно отображаться в списке.

### 3.2 Установка debug-версии

```bash
cd android

# Сборка debug APK
./gradlew assembleDebug

# Установка на устройство
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### 3.3 Ручное тестирование

Выполнить чек-лист из раздела 2.2 на реальном устройстве.

Особое внимание уделить:
- Производительности при скролле списков
- Работе камеры (если используется для аватара)
- Звуковым уведомлениям
- Работе в фоновом режиме
- Потреблению памяти (через Android Profiler)

### 3.4 Логирование на устройстве

```bash
# Просмотр логов в реальном времени
adb logcat | grep -i "lessonsportal"

# Сохранение логов в файл
adb logcat -d > logs/device-logs.txt

# Очистка логов
adb logcat -c
```

### 3.5 Проверка утечек памяти

1. Установить **LeakCanary** (уже подключён в debug build)
2. Использовать приложение интенсивно (открытие/закрытие экранов)
3. Проверить уведомления от LeakCanary
4. При обнаружении утечек — исправить и перепроверить

---

## 4. Настройка CI secrets для подписанной сборки

### 4.1 Создание release keystore

```bash
cd android

# Генерация ключа
keytool -genkey -v \
  -keystore lessons-portal.keystore \
  -alias lessons-portal \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Вам будут предложены:
# - Пароль от хранилища (KEYSTORE_PASSWORD)
# - Имя и фамилия
# - Название организации
# - Пароль для ключа (KEY_PASSWORD, можно нажать Enter для использования того же пароля)
```

**Важно:**
- Сохраните keystore в надёжном месте
- Никогда не коммитьте keystore в Git
- Запомните все пароли (восстановление невозможно)

### 4.2 Кодирование keystore для CI

```bash
# Кодирование в base64
base64 -w 0 lessons-portal.keystore > keystore.base64

# Копирование содержимого
cat keystore.base64 | pbcopy  # macOS
# или
cat keystore.base64 | xclip -selection clipboard  # Linux
```

### 4.3 Настройка secrets в GitHub

1. Перейти в репозиторий на GitHub
2. Settings → Secrets and variables → Actions
3. Добавить следующие secrets:

| Название | Значение |
|----------|----------|
| `KEYSTORE_BASE64` | Содержимое файла `keystore.base64` |
| `KEYSTORE_PASSWORD` | Пароль от хранилища ключей |
| `KEY_ALIAS` | Псевдоним ключа (обычно `lessons-portal`) |
| `KEY_PASSWORD` | Пароль от ключа |

### 4.4 Проверка конфигурации подписи

Убедиться, что в `android/app/build.gradle.kts` настроена подписанная сборка:

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
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("release")
        }
    }
}
```

---

## 5. Загрузка в Google Play Internal Testing

### 5.1 Подготовка аккаунта Google Play Console

1. Зарегистрировать аккаунт разработчика: https://play.google.com/console
2. Оплатить регистрационный взнос ($25 единоразово)
3. Принять соглашение разработчика

### 5.2 Создание приложения

1. Войти в Google Play Console
2. Нажать **Create app**
3. Заполнить информацию:
   - **Название**: Lessons Portal
   - **Язык по умолчанию**: Русский
   - **Приложение**: Бесплатное
   - **Пакет**: `ru.samoh.lessonsportal`

4. Подтвердить создание

### 5.3 Настройка Internal Testing

1. В меню слева выбрать **Testing** → **Internal testing**
2. Нажать **Create new release**
3. Загрузить AAB:

   ```bash
   cd android

   # Сборка signed release AAB (локально, если есть keystore)
   export KEYSTORE_PASSWORD=your_password
   export KEY_ALIAS=lessons-portal
   export KEY_PASSWORD=your_key_password

   ./gradlew bundleRelease

   # Файл будет расположен:
   # app/build/outputs/bundle/release/app-release.aab
   ```

4. Перетащить AAB в консоль Google Play
5. Нажать **Next**
6. Добавить примечания к релизу
7. Нажать **Save**

### 5.4 Добавление тестировщиков

1. Во вкладке **Internal testing** перейти на **Testers**
2. Создать список рассылки Google Group или добавить email-адреса вручную
3. Добавить email тестировщиков
4. Сохранить изменения

### 5.5 Копирование ссылки для тестировщиков

После сохранения появится ссылка вида:
```
https://play.google.com/apps/internaltest/XXXXXXXXXX
```

Отправить эту ссылку тестировщикам.

### 5.6 Проверка процесса установки

1. Открыть ссылку на тестирование с устройства
2. Нажать **Join** (Присоединиться)
3. Установить приложение из Google Play
4. Проверить работоспособность

---

## 6. Проверка Pre-Launch Report

Google Play автоматически генерирует отчёт после загрузки новой версии.

### 6.1 Доступ к отчёту

1. Google Play Console → Ваше приложение
2. **Quality** → **Pre-launch report**
3. Выбрать последнюю сборку

### 6.2 Что проверяется автоматически

- **Краши при запуске**
- **ANR (Application Not Responding)**
- **Проблемы с производительностью**
- **Совместимость с устройствами**
- **Доступность (accessibility)**
- **Безопасность данных**

### 6.3 Интерпретация результатов

#### Критические проблемы (требуют исправления)

- ❌ Краши на популярных устройствах
- ❌ ANR более 5% сессий
- ❌ Нарушение политик Google Play

#### Предупреждения (рекомендуется исправить)

- ⚠️ Проблемы доступности
- ⚠️ Медленная загрузка экранов
- ⚠️ Высокое потребление батареи

#### Информационные сообщения

- ℹ️ Рекомендации по оптимизации
- ℹ️ Статистика по устройствам

### 6.4 Действия при обнаружении проблем

1. Скачать подробный отчёт (PDF)
2. Изучить логи крашей
3. Воспроизвести проблему локально (если возможно)
4. Исправить код
5. Собрать новую версию
6. Загрузить в Internal Testing
7. Повторно проверить Pre-launch report

---

## 7. Финальный чек-лист перед Production

Перед выпуском в Production убедиться, что все пункты выполнены:

### Тестирование

- [ ] Unit-тесты: 100% passing
- [ ] UI-тесты: 100% passing
- [ ] Smoke-тесты на Android 8, 10, 12, 14: пройдены
- [ ] Тесты на реальном устройстве: пройдены
- [ ] LeakCanary: утечек нет
- [ ] Pre-launch report: критических ошибок нет

### Функциональность

- [ ] Светлая/тёмная тема: работают
- [ ] Pull-to-refresh: на всех списках
- [ ] Skeleton states: отображаются
- [ ] Empty states: отображаются
- [ ] Offline-banner: появляется
- [ ] Обработка ошибок: сообщения понятны
- [ ] Авторизация: сессия сохраняется
- [ ] Refresh токена: работает автоматически

### Производительность

- [ ] Размер AAB: < 50 МБ
- [ ] Время запуска: < 3 секунд
- [ ] Скролл списков: плавный (60 FPS)
- [ ] Память: нет утечек

### Безопасность

- [ ] Токены не логируются
- [ ] Keystore в секретах CI
- [ ] ProGuard/R8 включён
- [ ] Release подпись настроена

### Документация

- [ ] README обновлён
- [ ] Инструкция по сборке актуальна
- [ ] Список secrets задокументирован

### Google Play

- [ ] Internal Testing: работает
- [ ] Тестировщики добавлены
- [ ] Pre-launch report: проверен
- [ ] Store listing: заполнен

---

## 8. Команды для быстрой проверки

```bash
# 1. Запуск всех unit-тестов
./gradlew testDebugUnitTest

# 2. Сборка debug APK
./gradlew assembleDebug

# 3. Сборка release AAB (требуется keystore)
./gradlew bundleRelease

# 4. Запуск UI-тестов на эмуляторе
./gradlew connectedAndroidTest

# 5. Проверка размера AAB
bundletool get-size --total --bundle=app/build/outputs/bundle/release/app-release.aab

# 6. Установка APK на устройство
adb install -r app/build/outputs/apk/debug/app-debug.apk

# 7. Просмотр логов
adb logcat | grep -i "lessonsportal"

# 8. Проверка lint
./gradlew lint

# 9. Проверка форматирования кода
./gradlew ktlintCheck

# 10. Очистка сборки
./gradlew clean
```

---

## 9. Возможные проблемы и решения

### Проблема: Эмулятор не запускается

**Решение:**
- Увеличить RAM в настройках эмулятора
- Включить виртуализацию в BIOS
- Использовать x86_64 образы вместо ARM

### Проблема: Тесты падают с timeout

**Решение:**
- Увеличить timeout в настройках тестов
- Проверить производительность хост-машины
- Закрыть лишние приложения

### Проблема: Keystore не найден в CI

**Решение:**
- Проверить имя secret в GitHub
- Убедиться, что base64 корректно декодируется
- Проверить путь к файлу в workflow

### Проблема: AAB не загружается в Google Play

**Решение:**
- Проверить versionCode (должен увеличиваться)
- Убедиться, что пакет совпадает с зарегистрированным
- Проверить подпись приложения

### Проблема: Pre-launch report показывает краши

**Решение:**
- Скачать логи крашей
- Воспроизвести локально
- Исправить и выпустить патч

---

## 10. Дополнительные ресурсы

- [Android Developers Documentation](https://developer.android.com/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer/)
- [Android Testing Guide](https://developer.android.com/training/testing)
- [App Bundles Guide](https://developer.android.com/guide/app-bundle)
- [Pre-launch Report Documentation](https://support.google.com/googleplay/android-developer/answer/7377824)

---

**Дата обновления:** Декабрь 2025
**Статус этапа 6:** Локальная часть завершена, внешние проверки готовы к выполнению
