--- docs/android-tasks/07-01-setup-environment.md (原始)


+++ docs/android-tasks/07-01-setup-environment.md (修改后)
# Этап 7.1: Настройка окружения для внешних проверок

## Цель этапа

Подготовить рабочее окружение для проведения внешних проверок Android-приложения Lessons Portal.

## Предварительные требования

### 1. Установка JDK 17

**Проверка текущей версии:**
```bash
java -version
```

**Установка на Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install openjdk-17-jdk
```

**Установка на macOS (через Homebrew):**
```bash
brew install openjdk@17
```

**Установка на Windows:**
1. Скачать с https://adoptium.net/
2. Установить и добавить в PATH

**Верификация:**
```bash
java -version
# Ожидаемый вывод: openjdk version "17.x.x"
```

---

### 2. Установка Android Studio

**Шаги установки:**

1. Перейти на https://developer.android.com/studio
2. Скачать последнюю стабильную версию
3. Запустить установщик
4. При установке выбрать компоненты:
   - ✅ Android SDK
   - ✅ Android Virtual Device (AVD) Manager
   - ✅ Android SDK Build-Tools
   - ✅ Android SDK Platform-Tools
   - ✅ Android Emulator

**После установки:**
1. Запустить Android Studio
2. Принять лицензионное соглашение
3. Дождаться загрузки компонентов SDK

---

### 3. Настройка Android SDK

**Открыть SDK Manager:**
- Android Studio → Tools → SDK Manager

**Установить платформы:**

| Версия Android | API Level | Статус |
|----------------|-----------|--------|
| Android 8.0 (Oreo) | 26 | Обязательна |
| Android 10 (Q) | 29 | Обязательна |
| Android 12 (S) | 31 | Обязательна |
| Android 14 (Upside Down Cake) | 34 | Обязательна |

**Установить Build-Tools:**
- Выбрать последнюю версию (например, 34.0.0)

**Установить дополнительные компоненты:**
- Android SDK Command-line Tools
- Android SDK Platform-Tools
- Android Emulator

**Верификация:**
```bash
adb version
# Ожидаемый вывод: Android Debug Bridge version x.x.x

sdkmanager --list
# Показать доступные пакеты SDK
```

---

### 4. Установка Git

**Ubuntu/Debian:**
```bash
sudo apt install git
```

**macOS:**
```bash
git --version
# Если не установлен, установить через Xcode Command Line Tools
xcode-select --install
```

**Windows:**
- Скачать с https://git-scm.com/download/win

**Верификация:**
```bash
git --version
```

---

### 5. Установка Node.js 18+ (опционально)

Требуется для CI/CD тестирования и работы с некоторыми скриптами.

**Установка через nvm (рекомендуется):**

```bash
# Установка nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Перезагрузить терминал или выполнить:
source ~/.bashrc  # или ~/.zshrc

# Установка Node.js 18
nvm install 18
nvm use 18

# Верификация
node --version  # v18.x.x
npm --version   # 9.x.x или выше
```

---

### 6. Проверка переменных окружения

**Добавить в ~/.bashrc или ~/.zshrc:**

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/emulator
```

**Применить изменения:**
```bash
source ~/.bashrc  # или source ~/.zshrc
```

**Верификация:**
```bash
echo $ANDROID_HOME
adb devices
emulator -list-avds
```

---

### 7. Клонирование репозитория

```bash
cd ~/projects  # или ваша рабочая директория
git clone <repository-url> lessons-portal
cd lessons-portal/android
```

---

### 8. Первая сборка проекта

```bash
cd android

# Синхронизация зависимостей
./gradlew dependencies

# Сборка debug версии
./gradlew assembleDebug

# Проверка успешности сборки
ls -lh app/build/outputs/apk/debug/app-debug.apk
# Ожидаемый размер: ~13 MB
```

---

### 9. Чек-лист готовности окружения

- [ ] JDK 17 установлен и настроен
- [ ] Android Studio установлена
- [ ] SDK платформы 26, 29, 31, 34 загружены
- [ ] Build-Tools последней версии установлены
- [ ] Переменные окружения настроены
- [ ] Git установлен
- [ ] Node.js 18+ установлен (опционально)
- [ ] Проект собирается без ошибок
- [ ] Debug APK успешно создан

---

### 10. Возможные проблемы и решения

#### Проблема: JAVA_HOME не настроен

**Решение:**
```bash
# Найти путь к JDK
/usr/libexec/java_home -V  # macOS

# Добавить в ~/.bashrc или ~/.zshrc
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export PATH=$JAVA_HOME/bin:$PATH
```

#### Проблема: Недостаточно места для SDK

**Решение:**
- Освободить минимум 10 GB дискового пространства
- Переместить SDK на другой диск при необходимости

#### Проблема: Ошибки при загрузке компонентов SDK

**Решение:**
- Проверить интернет-соединение
- Использовать зеркало SDK (для некоторых регионов)
- Запустить SDK Manager от имени администратора

---

## Следующий этап

После успешной настройки окружения перейти к **Этапу 7.2: Создание и настройка эмуляторов**.

## Ресурсы

- [Официальная документация Android](https://developer.android.com/studio/install)
- [Настройка JDK](https://www.oracle.com/java/technologies/downloads/)
- [Git Installation](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)