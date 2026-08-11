--- docs/android-tasks/07-02-setup-emulators.md (原始)


+++ docs/android-tasks/07-02-setup-emulators.md (修改后)
# Этап 7.2: Создание и настройка эмуляторов

## Цель этапа

Создать виртуальные устройства (эмуляторы) для тестирования приложения на разных версиях Android.

## Необходимые эмуляторы

Для полноценного тестирования необходимо создать 4 эмулятора:

| № | Версия Android | API Level | Образ | Приоритет |
|---|----------------|-----------|-------|-----------|
| 1 | Android 8.0 (Oreo) | 26 | x86_64 | Обязательный |
| 2 | Android 10 (Q) | 29 | x86_64 | Обязательный |
| 3 | Android 12 (S) | 31 | x86_64 | Обязательный |
| 4 | Android 14 (Upside Down Cake) | 34 | x86_64 | Основной для разработки |

---

## Способ 1: Создание через AVD Manager (GUI)

### Шаг 1: Открытие AVD Manager

1. Запустить Android Studio
2. Перейти: **Tools** → **Device Manager** (или **AVD Manager** в старых версиях)
3. Нажать кнопку **Create Device**

### Шаг 2: Выбор устройства

**Рекомендуемые устройства:**

| Устройство | Размер экрана | Разрешение | Плотность |
|------------|---------------|------------|-----------|
| Pixel 6 | 6.4" | 1080 x 2400 | 411 dpi |
| Pixel 7 | 6.3" | 1080 x 2400 | 411 dpi |
| Pixel Tablet | 10.95" | 1800 x 2880 | 320 dpi |

**Выбрать Pixel 6** → Нажать **Next**

### Шаг 3: Выбор системного образа

**Для каждого эмулятора выбрать соответствующий образ:**

#### Эмулятор 1: Android 8.0 (API 26)
- Выбрать вкладку **x86 Images**
- Найти **API Level 26**
- Нажать **Download** (если не загружен)
- После загрузки нажать **Next**

#### Эмулятор 2: Android 10 (API 29)
- Выбрать вкладку **x86 Images**
- Найти **API Level 29**
- Нажать **Download** (если не загружен)
- После загрузки нажать **Next**

#### Эмулятор 3: Android 12 (API 31)
- Выбрать вкладку **x86 Images**
- Найти **API Level 31**
- Нажать **Download** (если не загружен)
- После загрузки нажать **Next**

#### Эмулятор 4: Android 14 (API 34)
- Выбрать вкладку **x86 Images**
- Найти **API Level 34**
- Нажать **Download** (если не загружен)
- После загрузки нажать **Next**

**Важно:** Выбирать образы с пометкой **Google Play** или **Google APIs** для доступа к сервисам Google.

### Шаг 4: Настройка параметров эмулятора

**Конфигурация для всех эмуляторов:**

```
Device name: Pixel_6_API_<XX>
AVD Name: Pixel_6_API_<XX>
Device type: Phone/Tablet
Orientation: Portrait
```

**Advanced Settings:**

1. Раскрыть **Advanced Settings**
2. Настроить параметры:

| Параметр | Значение | Обоснование |
|----------|----------|-------------|
| RAM | 2048 MB | Достаточно для большинства тестов |
| VM Heap | 512 MB | Стандартное значение |
| Internal Storage | 4096 MB | Место для приложения и данных |
| SD Card | Не использовать | Не требуется для тестов |

3. **Emulated Performance:**
   - Graphics: **Automatic** или **Hardware - GLES 2.0**
   - Multi-Core CPU: **2** (или больше, если позволяет хост)

4. **Boot option:**
   - Cold boot (для чистой загрузки каждый раз)
   - Или Quick boot (для быстрого запуска после первого холодного старта)

5. Нажать **Finish**

### Шаг 5: Повторить для всех версий

Повторить шаги 1-4 для каждой версии Android (API 26, 29, 31, 34).

---

## Способ 2: Создание через командную строку

### Шаг 1: Просмотр доступных устройств

```bash
avdmanager list device
```

### Шаг 2: Просмотр доступных образов

```bash
sdkmanager --list | grep "system-images"
```

### Шаг 3: Установка системных образов (если не установлены)

```bash
# Android 8.0 (API 26)
sdkmanager "system-images;android-26;google_apis;x86_64"

# Android 10 (API 29)
sdkmanager "system-images;android-29;google_apis;x86_64"

# Android 12 (API 31)
sdkmanager "system-images;android-31;google_apis;x86_64"

# Android 14 (API 34)
sdkmanager "system-images;android-34;google_apis;x86_64"
```

### Шаг 4: Создание эмуляторов

```bash
# Эмулятор Android 8.0 (API 26)
avdmanager create avd \
  --name "Pixel_6_API_26" \
  --device "pixel_6" \
  --package "system-images;android-26;google_apis;x86_64" \
  --abi "x86_64"

# Эмулятор Android 10 (API 29)
avdmanager create avd \
  --name "Pixel_6_API_29" \
  --device "pixel_6" \
  --package "system-images;android-29;google_apis;x86_64" \
  --abi "x86_64"

# Эмулятор Android 12 (API 31)
avdmanager create avd \
  --name "Pixel_6_API_31" \
  --device "pixel_6" \
  --package "system-images;android-31;google_apis;x86_64" \
  --abi "x86_64"

# Эмулятор Android 14 (API 34)
avdmanager create avd \
  --name "Pixel_6_API_34" \
  --device "pixel_6" \
  --package "system-images;android-34;google_apis;x86_64" \
  --abi "x86_64"
```

### Шаг 5: Настройка конфигурации эмулятора

Отредактировать файл конфигурации для каждого эмулятора:

```bash
# Путь к конфигам
cd ~/.android/avd/

# Редактирование config.ini для каждого эмулятора
nano Pixel_6_API_34.avd/config.ini
```

**Добавить/изменить параметры:**

```ini
hw.ramSize=2048
vm.heapSize=512
disk.dataPartition.size=4096M
hw.gpu.enabled=yes
hw.gpu.mode=auto
hw.cpu.ncore=2
```

---

## Запуск эмуляторов

### Через Android Studio

1. Открыть **Device Manager**
2. Найти нужный эмулятор в списке
3. Нажать кнопку **Play** (▶) рядом с эмулятором

### Через командную строку

```bash
# Запуск конкретного эмулятора
emulator -avd Pixel_6_API_34

# Запуск с дополнительными параметрами
emulator -avd Pixel_6_API_34 -no-boot-anim -no-window

# Запуск в фоновом режиме
emulator -avd Pixel_6_API_34 &
```

### Проверка запуска

```bash
# Список запущенных эмуляторов
adb devices

# Ожидаемый вывод:
# List of devices attached
# emulator-5554    device
```

---

## Оптимизация производительности эмуляторов

### Включение аппаратной виртуализации

**Проверка поддержки виртуализации:**

```bash
# macOS
sysctl -a | grep machdep.cpu.features | grep VMX

# Linux
egrep -c '(vmx|svm)' /proc/cpuinfo

# Windows
Диспетчер задач → Производительность → CPU → Виртуализация
```

**Если виртуализация отключена:**
1. Перезагрузить компьютер
2. Войти в BIOS/UEFI (обычно F2, F10, Del при загрузке)
3. Найти настройку Virtualization Technology (VT-x/AMD-V)
4. Включить (Enabled)
5. Сохранить и выйти

### Использование快照 (Snapshots)

**Создание snapshot:**
1. Запустить эмулятор
2. Дождаться полной загрузки
3. Нажать меню эмулятора (⋮)
4. Выбрать **Snapshots**
5. Нажать **Take Snapshot**
6. Дать имя (например, "Clean Install")

**Восстановление snapshot:**
1. Меню эмулятора (⋮)
2. **Snapshots**
3. Выбрать сохранённый snapshot
4. Нажать **Run**

Это ускорит последующие запуски эмулятора.

### Настройка графики

Для лучшей производительности:

```ini
# В config.ini эмулятора
hw.gpu.enabled=yes
hw.gpu.mode=host
renderer=OpenGL
```

---

## Чек-лист создания эмуляторов

- [ ] Эмулятор Pixel_6_API_26 создан и запускается
- [ ] Эмулятор Pixel_6_API_29 создан и запускается
- [ ] Эмулятор Pixel_6_API_31 создан и запускается
- [ ] Эмулятор Pixel_6_API_34 создан и запускается
- [ ] Все эмуляторы имеют минимум 2GB RAM
- [ ] Аппаратная виртуализация включена
- [ ] Графический ускоритель настроен
- [ ] Snapshot создан для основного эмулятора (API 34)

---

## Возможные проблемы и решения

### Проблема: Эмулятор не запускается (ошибка VT-x)

**Решение:**
1. Проверить поддержку виртуализации (см. выше)
2. Включить виртуализацию в BIOS
3. Для Windows: отключить Hyper-V
   ```powershell
   bcdedit /set hypervisorlaunchtype off
   ```
4. Перезагрузить компьютер

### Проблема: Эмулятор работает медленно

**Решение:**
- Увеличить RAM до 4096 MB в настройках эмулятора
- Увеличить количество CPU cores до 4
- Использовать snapshot для быстрого запуска
- Закрыть лишние приложения на хост-машине
- Использовать образы x86_64 вместо ARM

### Проблема: Недостаточно места на диске

**Решение:**
```bash
# Очистка кэша эмуляторов
cd ~/.android/avd/
rm -rf *.avd/snapshots/*

# Удаление неиспользуемых эмуляторов
avdmanager delete avd --name <имя_эмулятора>
```

### Проблема: Black screen при запуске

**Решение:**
1. Изменить настройки графики эмулятора:
   - Open GL ES -> Open GL ES 2.0
2. Холодная перезагрузка:
   - Меню эмулятора (⋮) → Device → Now cold boot now
3. Пересоздать эмулятор с другими настройками графики

---

## Следующий этап

После создания эмуляторов перейти к **Этапу 7.3: Запуск UI-тестов на эмуляторе**.

## Ресурсы

- [Android Emulator Documentation](https://developer.android.com/studio/run/emulator)
- [Command-line Guide](https://developer.android.com/studio/run/emulator-commandline)
- [AVD Manager Guide](https://developer.android.com/studio/run/managing-avds)