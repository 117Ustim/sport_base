# 🚀 Tauri Desktop App - Инструкция

## ✅ Что сделано:

1. **Установлен Rust** (rustc 1.94.0)
2. **Установлен Tauri CLI** v1.6.3
3. **Создана структура** `src-tauri/`
4. **Настроен конфиг** для macOS

---

## 📦 Команды для работы:

### 1. Запуск в dev режиме (разработка)
```bash
npm run tauri:dev
```
Это запустит:
- React dev server на `http://localhost:3000`
- Desktop окно с приложением

### 2. Сборка .app для macOS
```bash
npm run tauri:build
```
Создаст готовое приложение в:
```
src-tauri/target/release/bundle/macos/Sport Base.app
```

### 3. Обычный браузерный режим (как раньше)
```bash
npm start
```

---

## 🎯 Что изменилось в проекте:

### Добавлено:
- `src-tauri/` - папка с Tauri конфигом
- `package.json` - добавлены 3 скрипта (tauri, tauri:dev, tauri:build)

### НЕ изменилось:
- `src/` - весь React код работает БЕЗ ИЗМЕНЕНИЙ
- `public/` - статика не тронута
- Firebase, роутинг, стили - все работает как было

---

## 📱 Настройки приложения:

**Файл:** `src-tauri/tauri.conf.json`

- **Название:** Sport Base
- **Размер окна:** 1400x900 (минимум 800x600)
- **Identifier:** com.sportbase.app
- **Категория:** Productivity

---

## 🔧 Как запустить собранное приложение:

После `npm run tauri:build`:

1. Найди файл: `src-tauri/target/release/bundle/macos/Sport Base.app`
2. Перетащи его в папку `Applications`
3. Запусти двойным кликом

**Если macOS блокирует:**
```bash
xattr -cr "/Applications/Sport Base.app"
```

Или: Правый клик → Открыть → Открыть

---

## 💡 Преимущества Tauri:

- ✅ Размер: ~5-10 MB (vs 150+ MB у Electron)
- ✅ Память: в 3-4 раза меньше чем Electron
- ✅ Нативный вид macOS приложения
- ✅ Не нужен платный Apple аккаунт
- ✅ Весь React код работает без изменений

---

## 🐛 Troubleshooting:

### Ошибка "command not found: tauri"
```bash
source "$HOME/.cargo/env"
npm run tauri:dev
```

### Ошибка при сборке
```bash
# Очистить кеш
cd src-tauri
cargo clean
cd ..
npm run tauri:build
```

### Приложение не запускается
Проверь что `.env` файл заполнен (Firebase credentials)

---

## 📚 Документация:

- Tauri: https://tauri.app/
- Конфиг: https://tauri.app/v1/api/config/
