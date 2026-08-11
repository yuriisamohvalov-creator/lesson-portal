--- docs/android-tasks/07-06-ci-secrets-setup.md (原始)


+++ docs/android-tasks/07-06-ci-secrets-setup.md (修改后)
# Этап 7.6: Настройка CI secrets для подписанной сборки

## Цель этапа

Настроить секреты GitHub Actions для автоматической подписи release-сборок приложения.

## Предварительные требования

- [ ] Репозиторий размещён на GitHub
- [ ] GitHub Actions включены в репозитории
- [ ] Есть доступ к настройкам репозитория (Admin права)
- [ ] Установлен JDK 17 и keytool

---

## Шаг 1: Создание release keystore

### Генерация ключа подписи

```bash
cd android

# Генерация нового keystore
keytool -genkey -v \
  -keystore lessons-portal.keystore \
  -alias lessons-portal \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

### Вводимые данные

При генерации вам будут предложены следующие данные:

```
Enter keystore password: ********
Re-enter password for confirmation: ********

What is your first and last name?
  [Your Name]

What is the name of your organization?
  [Your Organization]

What is the name of your organizational unit?
  [Your Unit]

What is the name of your city or locality?
  [Your City]

What is the name of your state or province?
  [Your State]

What is the two-letter country code for this unit?
  [RU]

Is CN=Your Name, OU=Your Unit, O=Your Organization, L=Your City, ST=Your State, C=RU correct?
  [yes]
```

**Важно:**
- **Пароль от хранилища (Keystore Password)**: Запомните или сохраните в надёжном месте
- **Пароль от ключа (Key Password)**: Можно нажать Enter для использования того же пароля
- **Срок действия**: 10000 дней (~27 лет) — достаточно для всего жизненного цикла приложения
- **Псевдоним (Alias)**: `lessons-portal` — используйте это значение в CI

### Проверка созданного ключа

```bash
# Просмотр информации о ключе
keytool -list -v \
  -keystore lessons-portal.keystore \
  -alias lessons-portal

# Введите пароль при запросе
```

**Ожидаемый вывод:**
```
Alias name: lessons-portal
Creation date: Dec 15, 2024
Entry type: PrivateKeyEntry
Certificate chain length: 1
Certificate[1]:
Owner: CN=Your Name, OU=Your Unit, O=Your Organization, L=Your City, ST=Your State, C=RU
Issuer: CN=Your Name, OU=Your Unit, O=Your Organization, L=Your City, ST=Your State, C=RU
Serial number: 1234567890
Valid from: Sun Dec 15 00:00:00 MSK 2024 until: Sat Nov 22 00:00:00 MSK 2052
```

---

## Шаг 2: Кодирование keystore для CI

### Конвертация в Base64

```bash
# macOS
base64 -w 0 lessons-portal.keystore > keystore.base64

# Linux
base64 -w 0 lessons-portal.keystore > keystore.base64

# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("lessons-portal.keystore")) | Out-File -Encoding ASCII keystore.base64
```

### Копирование содержимого

```bash
# macOS - копирование в буфер обмена
cat keystore.base64 | pbcopy

# Linux - копирование в буфер обмена (требуется xclip)
cat keystore.base64 | xclip -selection clipboard

# Windows - содержимое файла уже в keystore.base64
cat keystore.base64
```

**Важно:**
- Файл `keystore.base64` содержит одну длинную строку без переносов
- Не добавляйте пробелы или переносы строк при копировании
- Сохраните оригинальный `.keystore` файл в надёжном месте

---

## Шаг 3: Настройка secrets в GitHub

### Переход к настройкам секретов

1. Открыть репозиторий на GitHub
2. Перейти во вкладку **Settings**
3. В левом меню выбрать **Secrets and variables** → **Actions**
4. Нажать кнопку **New repository secret**

### Добавление секретов

Добавить следующие 4 секрета:

#### Secret 1: KEYSTORE_BASE64

| Поле | Значение |
|------|----------|
| **Name** | `KEYSTORE_BASE64` |
| **Value** | Содержимое файла `keystore.base64` (длинная base64 строка) |
| **Description** | Release keystore в base64 формате |

#### Secret 2: KEYSTORE_PASSWORD

| Поле | Значение |
|------|----------|
| **Name** | `KEYSTORE_PASSWORD` |
| **Value** | Пароль от хранилища ключей (который вы ввели при генерации) |
| **Description** | Пароль от release keystore |

#### Secret 3: KEY_ALIAS

| Поле | Значение |
|------|----------|
| **Name** | `KEY_ALIAS` |
| **Value** | `lessons-portal` |
| **Description** | Псевдоним ключа в хранилище |

#### Secret 4: KEY_PASSWORD

| Поле | Значение |
|------|----------|
| **Name** | `KEY_PASSWORD` |
| **Value** | Пароль от ключа (если отличается от KEYSTORE_PASSWORD) |
| **Description** | Пароль от ключа подписи |

### Проверка добавленных секретов

После добавления вы увидите список:

```
NAME                LAST UPDATED
KEYSTORE_BASE64     Updated 2 minutes ago
KEYSTORE_PASSWORD   Updated 2 minutes ago
KEY_ALIAS           Updated 2 minutes ago
KEY_PASSWORD        Updated 2 minutes ago
```

---

## Шаг 4: Проверка конфигурации в build.gradle.kts

Убедиться, что в файле `android/app/build.gradle.kts` настроена подписанная сборка:

```kotlin
android {
    // ... другие настройки

    signingConfigs {
        create("release") {
            storeFile = file("../keystore.jks")
            storePassword = System.getenv("KEYSTORE_PASSWORD")
            keyAlias = System.getenv("KEY_ALIAS")
            keyPassword = System.getenv("KEY_PASSWORD")
        }
    }

    buildTypes {
        getByName("debug") {
            isDebuggable = true
            applicationIdSuffix = ".debug"
        }

        getByName("release") {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("release")
        }
    }
}
```

**Важно:**
- `storeFile` указывает на путь `../keystore.jks` относительно директории `android/app/`
- Пароли читаются из переменных окружения через `System.getenv()`

---

## Шаг 5: Настройка GitHub Actions workflow

### Создание/обновление workflow файла

Файл: `.github/workflows/android-release.yml`

```yaml
name: Android Release Build

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Decode Keystore
        run: |
          echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > android/keystore.jks

      - name: Build Release AAB
        run: |
          cd android
          chmod +x gradlew
          ./gradlew bundleRelease \
            -PKEYSTORE_PASSWORD="${{ secrets.KEYSTORE_PASSWORD }}" \
            -PKEY_ALIAS="${{ secrets.KEY_ALIAS }}" \
            -PKEY_PASSWORD="${{ secrets.KEY_PASSWORD }}"
        env:
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}

      - name: Upload AAB Artifact
        uses: actions/upload-artifact@v4
        with:
          name: app-release
          path: android/app/build/outputs/bundle/release/app-release.aab
          retention-days: 30

      - name: Upload Mapping Files
        uses: actions/upload-artifact@v4
        with:
          name: mapping-files
          path: android/app/build/outputs/mapping/release/
          retention-days: 30
```

### Альтернативный вариант с direct Gradle properties

```yaml
# В шаге сборки использовать:
- name: Build Release AAB
  run: |
    cd android
    chmod +x gradlew
    ./gradlew bundleRelease \
      -Pandroid.injected.signing.store.file=../keystore.jks \
      -Pandroid.injected.signing.store.password=${{ secrets.KEYSTORE_PASSWORD }} \
      -Pandroid.injected.signing.key.alias=${{ secrets.KEY_ALIAS }} \
      -Pandroid.injected.signing.key.password=${{ secrets.KEY_PASSWORD }}
```

---

## Шаг 6: Тестирование подписанной сборки

### Локальное тестирование с переменными окружения

```bash
cd android

# Экспорт переменных
export KEYSTORE_PASSWORD=your_password
export KEY_ALIAS=lessons-portal
export KEY_PASSWORD=your_key_password

# Сборка release AAB
./gradlew bundleRelease

# Проверка файла
ls -lh app/build/outputs/bundle/release/app-release.aab

# Ожидаемый размер: ~4-6 MB (после R8 и shrinking)
```

### Проверка подписи AAB

```bash
# Использовать apksigner из Android SDK Build Tools
$ANDROID_HOME/build-tools/34.0.0/apksigner verify --print-certs \
  app/build/outputs/bundle/release/app-release.aab

# Ожидаемый вывод:
# Signer #1 certificate DN: CN=Your Name, OU=Your Unit, O=Your Organization, L=Your City, ST=Your State, C=RU
# Verification successful
```

### Проверка через jarsigner

```bash
# Извлечь APK из AAB (требуется bundletool)
bundletool build-apks \
  --bundle=app/build/outputs/bundle/release/app-release.aab \
  --output=app.apks \
  --mode=universal

# Распаковать APK
unzip -p app.apks universal.apk | jarsigner -verify -certs -verbose -

# Проверить подпись
```

---

## Шаг 7: Запуск CI сборки

### Триггер через тег

```bash
# Создать и отправить тег
git tag v1.0.0
git push origin v1.0.0
```

### Триггер через UI

1. Перейти в репозиторий на GitHub
2. Вкладка **Actions**
3. Выбрать workflow **Android Release Build**
4. Нажать **Run workflow**
5. Выбрать ветку (обычно `main` или `master`)
6. Нажать **Run workflow**

### Мониторинг выполнения

1. Следить за прогрессом в реальном времени
2. Проверить логи каждого шага
3. Убедиться, что шаг **Build Release AAB** завершён успешно
4. Скачать артефакт из шага **Upload AAB Artifact**

---

## Чек-лист завершения настройки

- [ ] Keystore сгенерирован с правильными параметрами
- [ ] Keystore закодирован в base64
- [ ] Все 4 секрета добавлены в GitHub
- [ ] `build.gradle.kts` настроен для чтения секретов
- [ ] GitHub Actions workflow создан
- [ ] Локальная сборка с подписью работает
- [ ] Подпись проверена через apksigner
- [ ] CI сборка запускается успешно
- [ ] AAB артефакт скачивается из Actions
- [ ] Оригинальный keystore сохранён в надёжном месте

---

## Безопасность и лучшие практики

### Хранение keystore

✅ **Делайте:**
- Храните keystore в зашифрованном хранилище паролей
- Создавайте резервные копии в нескольких местах
- Используйте надёжные пароли (минимум 12 символов)
- Документируйте процесс восстановления доступа

❌ **Не делайте:**
- Не коммитьте keystore в Git
- Не передавайте keystore по незащищённым каналам
- Не используйте слабые пароли
- Не храните пароли в текстовых файлах

### Rotation ключей

Если ключ скомпрометирован:
1. Сгенерировать новый keystore
2. Обновить секреты в GitHub
3. Для Google Play потребуется сброс ключа upload key
4. Сообщить пользователям о новой подписи (при обновлении)

### Доступ к секретам

Ограничьте доступ:
- Только администраторы репозитория могут управлять секретами
- Используйте environment secrets для production
- Включите двухфакторную аутентификацию для всех участников

---

## Возможные проблемы и решения

### Проблема: Сборка падает с ошибкой подписи

**Ошибка:**
```
Execution failed for task ':app:validateSigningRelease'.
> Keystore file '/home/runner/work/.../keystore.jks' does not exist
```

**Решение:**
1. Проверить, что шаг **Decode Keystore** выполняется перед сборкой
2. Убедиться, что путь совпадает с указанным в `build.gradle.kts`
3. Проверить, что secret `KEYSTORE_BASE64` не пустой

### Проблема: Неправильный пароль

**Ошибка:**
```
java.security.UnrecoverableKeyException: Cannot recover key
```

**Решение:**
1. Проверить правильность пароля локально
2. Обновить secret в GitHub
3. Убедиться, что нет лишних пробелов в значении

### Проблема: AAB не принимается Google Play

**Ошибка:**
```
You need to use the same signing key as previous releases
```

**Решение:**
- Использовать тот же keystore для всех релизов
- Если ключ утерян, требуется процедура сброса ключа в Google Play Console
- Это долгий процесс — берегите keystore!

### Проблема: Base64 строка слишком длинная

**Решение:**
- GitHub поддерживает секреты до 64 KB
- Если keystore больше, рассмотреть альтернативы:
  - Использовать меньший размер ключа (2048 вместо 4096)
  - Хранить keystore в encrypted artifact
  - Использовать внешнее хранилище секретов (AWS Secrets Manager, etc.)

---

## Следующий этап

После настройки CI secrets перейти к **Этапу 7.7: Загрузка в Google Play Internal Testing**.

## Ресурсы

- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Android App Signing](https://developer.android.com/studio/publish/app-signing)
- [Keytool Documentation](https://docs.oracle.com/javase/10/tools/keytool.htm)
- [APK Signature Scheme](https://developer.android.com/about/versions/nougat/android-7.0#apk_signature_scheme_v2)