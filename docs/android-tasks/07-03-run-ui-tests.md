--- docs/android-tasks/07-03-run-ui-tests.md (原始)


+++ docs/android-tasks/07-03-run-ui-tests.md (修改后)
# Этап 7.3: Запуск UI-тестов на эмуляторе

## Цель этапа

Запустить инструментальные UI-тесты (androidTest) на эмуляторе и проанализировать результаты.

## Предварительные требования

- [ ] Окружение настроено (Этап 7.1)
- [ ] Эмуляторы созданы (Этап 7.2)
- [ ] Эмулятор запущен и готов к работе
- [ ] Проект собран без ошибок

---

## Подготовка эмулятора

### Шаг 1: Запуск эмулятора

**Через Android Studio:**
1. Tools → Device Manager
2. Выбрать **Pixel_6_API_34** (основной эмулятор)
3. Нажать **Play** (▶)

**Через командную строку:**
```bash
emulator -avd Pixel_6_API_34
```

### Шаг 2: Ожидание полной загрузки

Дождаться появления главного экрана эмулятора.

**Признаки готовности:**
- Главный экран Android отображается
- Значок батареи в статус-баре показывает заряд
- Время и дата актуальны
- Нет системных уведомлений об ошибках

### Шаг 3: Проверка подключения

```bash
adb devices
```

**Ожидаемый вывод:**
```
List of devices attached
emulator-5554    device
```

Если устройство не отображается:
```bash
# Перезапуск adb сервера
adb kill-server
adb start-server
adb devices
```

---

## Запуск UI-тестов

### Базовый запуск всех тестов

```bash
cd android

# Запуск всех instrumented тестов на подключенном устройстве/эмуляторе
./gradlew connectedAndroidTest
```

**Время выполнения:** 5-15 минут в зависимости от количества тестов и производительности хоста.

### Запуск конкретного тест-класса

```bash
# Запуск тестов авторизации
./gradlew connectedAndroidTest \
  -Pandroid.testInstrumentationRunnerArguments.class=ru.samoh.lessonsportal.ui.tests.LoginScreenTest

# Запуск тестов статей
./gradlew connectedAndroidTest \
  -Pandroid.testInstrumentationRunnerArguments.class=ru.samoh.lessonsportal.ui.tests.ArticleListTest

# Запуск тестов навигации
./gradlew connectedAndroidTest \
  -Pandroid.testInstrumentationRunnerArguments.class=ru.samoh.lessonsportal.ui.tests.NavigationTest
```

### Запуск конкретного теста

```bash
# Запуск одного метода теста
./gradlew connectedAndroidTest \
  -Pandroid.testInstrumentationRunnerArguments.class=ru.samoh.lessonsportal.ui.tests.LoginScreenTest#testLoginWithValidCredentials
```

### Запуск на конкретном устройстве

Если подключено несколько устройств/эмуляторов:

```bash
# Получить серийный номер устройства
adb devices

# Запустить тесты на конкретном устройстве
adb -s emulator-5554 shell am instrument -w ru.samoh.lessonsportal.test/androidx.test.runner.AndroidJUnitRunner
```

Или через Gradle:
```bash
./gradlew connectedAndroidTest \
  -Pandroid.testInstrumentationRunnerArguments.notAnnotation=androidx.test.uiautomator.test.SkipOnEmulator
```

---

## Мониторинг выполнения тестов

### Вывод в консоли

Во время выполнения тестов в консоли отображается:

```
> Task :app:connectedAndroidTest

Running tests on emulator-5554 (Pixel 6 API 34)

ru.samoh.lessonsportal.ui.tests.LoginScreenTest:
  ✓ testLoginWithValidCredentials (3.2s)
  ✓ testLoginWithInvalidCredentials (1.8s)
  ✓ testLogout (2.1s)

ru.samoh.lessonsportal.ui.tests.ArticleListTest:
  ✓ testArticleListLoads (4.5s)
  ✓ testPullToRefresh (3.2s)
  ⚠ testEmptyState (failed - screenshot captured)

BUILD SUCCESSFUL in 2m 34s
```

### Отслеживание прогресса в Android Studio

1. Открыть **Run** окно (View → Tool Windows → Run)
2. Наблюдать за прогрессом выполнения
3. Просматривать логи в реальном времени

### Просмотр логов приложения

В отдельном терминале:

```bash
# Логи приложения
adb logcat | grep -i "lessonsportal"

# Логи с фильтрацией по тегу
adb logcat -s "LessonsPortal:*"

# Сохранение логов в файл
adb logcat > test-logs.txt
```

---

## Анализ результатов

### Расположение отчётов

После завершения тестов отчёты доступны по пути:

```
android/app/build/reports/androidTests/connected/index.html
```

### Открытие отчёта

**macOS:**
```bash
open app/build/reports/androidTests/connected/index.html
```

**Linux:**
```bash
xdg-open app/build/reports/androidTests/connected/index.html
```

**Windows:**
```cmd
start app\build\reports\androidTests\connected\index.html
```

Или открыть файл вручную в браузере.

### Структура отчёта

Отчёт содержит:

1. **Сводка (Summary)**
   - Общее количество тестов
   - Количество успешных/неуспешных
   - Время выполнения

2. **Классы тестов (Test Classes)**
   - Список всех тест-классов
   - Статус каждого класса

3. **Детали тестов (Test Details)**
   - Имя каждого теста
   - Статус (Passed/Failed)
   - Время выполнения
   - Скриншоты при падении
   - Stack trace ошибки

4. **Скриншоты (Screenshots)**
   - Автоматически сделанные скриншоты при падениях
   - Путь: `app/build/outputs/androidTest-results/connected/screenshots/`

### Интерпретация результатов

#### ✅ Успешный тест (Passed)

```
✓ testLoginWithValidCredentials
Duration: 3.2s
```

Тест выполнен успешно, приложение ведёт себя как ожидалось.

#### ❌ Неуспешный тест (Failed)

```
✗ testEmptyState
Duration: 2.1s
Error: androidx.test.espresso.AssertionError
  Expected: view with text "No articles"
  Actual: null
Screenshot: /screenshots/emulator-5554/testEmptyState.png
```

**Действия:**
1. Открыть скриншот
2. Изучить stack trace
3. Воспроизвести проблему локально
4. Исправить код или тест
5. Перезапустить тест

#### ⚠️ Пропущенный тест (Skipped)

```
⚠ testOnOldDevice
Reason: Skipped on API 34
```

Тест не выполнялся по определённой причине (например, предназначен для старой версии Android).

---

## Повторный запуск упавших тестов

### Запуск только упавших тестов

```bash
# После первого прогона можно запустить только неудачные тесты
./gradlew connectedAndroidTest \
  -Pandroid.testInstrumentationRunnerArguments.class=ru.samoh.lessonsportal.ui.tests.ArticleListTest#testEmptyState
```

### Запуск с очисткой данных приложения

```bash
# Очистить данные приложения перед тестами
adb shell pm clear ru.samoh.lessonsportal

# Затем запустить тесты
./gradlew connectedAndroidTest
```

### Запуск с переустановкой приложения

```bash
# Полная переустановка
adb uninstall ru.samoh.lessonsportal
adb uninstall ru.samoh.lessonsportal.test

# Сборка и установка заново
./gradlew clean assembleDebug assembleAndroidTest

# Запуск тестов
./gradlew connectedAndroidTest
```

---

## Тестирование на разных версиях Android

### Последовательный запуск на всех эмуляторах

```bash
#!/bin/bash
# scripts/run-tests-all-emulators.sh

EMULATORS=("Pixel_6_API_26" "Pixel_6_API_29" "Pixel_6_API_31" "Pixel_6_API_34")

for emulator in "${EMULATORS[@]}"; do
  echo "🚀 Запуск эмулятора: $emulator"

  # Запуск эмулятора в фоне
  emulator -avd "$emulator" -no-boot-anim &
  EMULATOR_PID=$!

  # Ожидание загрузки
  adb wait-for-device
  echo "⏳ Ожидание загрузки системы..."
  sleep 30

  # Проверка готовности
  until [ "$(adb shell getprop sys.boot_completed 2>/dev/null)" = "1" ]; do
    sleep 5
  done

  echo "🧪 Запуск тестов на $emulator"
  ./gradlew connectedAndroidTest

  # Результаты
  echo "✅ Тесты на $emulator завершены"
  echo ""

  # Остановка эмулятора
  kill $EMULATOR_PID
  sleep 5
done

echo "🎉 Все тесты завершены"
```

**Использование:**
```bash
chmod +x scripts/run-tests-all-emulators.sh
./scripts/run-tests-all-emulators.sh
```

### Параллельный запуск на нескольких эмуляторах

```bash
# Запустить все эмуляторы
emulator -avd Pixel_6_API_26 -no-boot-anim &
emulator -avd Pixel_6_API_29 -no-boot-anim &
emulator -avd Pixel_6_API_31 -no-boot-anim &
emulator -avd Pixel_6_API_34 -no-boot-anim &

# Дождаться загрузки всех
sleep 60

# Запустить тесты (Gradle автоматически распределит по устройствам)
./gradlew connectedAndroidTest

# Остановить эмуляторы
pkill -f "emulator.*Pixel_6"
```

---

## Чек-лист UI-тестирования

- [ ] Эмулятор запущен и подключен
- [ ] Все unit-тесты проходят локально
- [ ] Запущены все UI-тесты через `connectedAndroidTest`
- [ ] Отчёт открыт в браузере
- [ ] Все тесты прошли успешно (зелёные)
- [ ] Скриншоты проверены (если есть падения)
- [ ] Логи проанализированы
- [ ] Тесты запущены на всех 4 эмуляторах (API 26, 29, 31, 34)
- [ ] Результаты задокументированы

---

## Возможные проблемы и решения

### Проблема: Timeout при запуске тестов

**Симптомы:**
```
android.util.SuiteRunException: Test running failed: Instrumentation run failed due to Process crashed
```

**Решение:**
```bash
# Увеличить timeout в build.gradle.kts
android {
    defaultConfig {
        testInstrumentationRunnerArguments["clearPackageData"] = "true"
    }
}

# Или увеличить в команде
./gradlew connectedAndroidTest \
  -Dorg.gradle.jvmargs="-Xmx4096m"
```

### Проблема: Tests fail immediately

**Симптомы:**
```
java.lang.RuntimeException: Unable to resolve activity for Intent
```

**Решение:**
1. Проверить manifest приложения
2. Убедиться, что тестовая Activity экспортирована
3. Пересобрать проект:
   ```bash
   ./gradlew clean assembleDebug assembleAndroidTest
   ```

### Проблема: Emulator disconnected

**Симптомы:**
```
adb: device offline
```

**Решение:**
```bash
# Перезапуск adb
adb kill-server
adb start-server

# Перезапуск эмулятора
# Меню эмулятора (⋮) → File → Cold Boot Now
```

### Проблема: Недостаточно памяти

**Симптомы:**
```
OutOfMemoryError during test execution
```

**Решение:**
```bash
# Увеличить heap для Gradle
export GRADLE_OPTS="-Xmx4096m -XX:MaxMetaspaceSize=1024m"

# Уменьшить параллелизм
./gradlew connectedAndroidTest --max-workers=1
```

### Проблема: Ложные падения из-за анимаций

**Решение:**
Отключить анимации на эмуляторе:
```bash
adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0
```

---

## Следующий этап

После успешного запуска UI-тестов перейти к **Этапу 7.4: Smoke-тесты на разных версиях Android**.

## Ресурсы

- [Android Testing Guide](https://developer.android.com/training/testing)
- [Espresso Documentation](https://developer.android.com/training/testing/espresso)
- [UI Automator](https://developer.android.com/training/testing/ui-automator)