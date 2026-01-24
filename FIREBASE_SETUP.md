# Настройка Firebase индексов

## Способ 1: Через Firebase CLI (рекомендуется)

### Установка Firebase CLI
```bash
npm install -g firebase-tools
```

### Вход в аккаунт
```bash
firebase login
```

### Инициализация проекта (если еще не сделано)
```bash
firebase init
```
Выбери:
- Firestore
- Твой проект: calendar-new-599f8

### Деплой индексов
```bash
firebase deploy --only firestore:indexes
```

### Деплой правил безопасности
```bash
firebase deploy --only firestore:rules
```

## Способ 2: Через Firebase Console (вручную)

1. Открой [Firebase Console](https://console.firebase.google.com)
2. Выбери проект `calendar-new-599f8`
3. Перейди в **Firestore Database** → **Indexes**
4. Нажми **Create Index**
5. Создай следующие индексы:

### Индекс 1: для getLatestDateForDay
- Collection: `workoutHistory`
- Fields:
  - `workoutId` (Ascending)
  - `weekNumber` (Ascending)
  - `dayKey` (Ascending)
  - `createdAt` (Descending)

### Индекс 2: для getByWorkoutId
- Collection: `workoutHistory`
- Fields:
  - `workoutId` (Ascending)
  - `createdAt` (Descending)

### Индекс 3: для getByClientId
- Collection: `workoutHistory`
- Fields:
  - `clientId` (Ascending)
  - `createdAt` (Descending)

## Способ 3: Через ссылку из ошибки (самый простой)

Когда увидишь ошибку в консоли:
```
FirebaseError: The query requires an index. You can create it here: https://...
```

Просто кликни по ссылке - Firebase автоматически создаст нужный индекс!

## Проверка

После создания индексов подожди 1-2 минуты, затем перезагрузи страницу. Ошибки должны исчезнуть.
