# 🚀 ЭТАП 5: AUDIT DATA FETCHING STRATEGY

**Дата:** 06.02.2026  
**Проекты:** sport_base + gym-calendar  
**Цель:** Оптимизация запросов к Firestore (limit, pagination, кеширование)

---

## 📊 АНАЛИЗ ЗАПРОСОВ К FIRESTORE

### ✅ ЧТО УЖЕ ОПТИМИЗИРОВАНО

#### 1. **clientsService.js** (sport_base) ✅
```javascript
// ✅ Использует limit(50) в getAll()
const pageLimit = filters.limit || 50;
constraints.push(limit(pageLimit));
```
**Оценка:** Отлично! Пагинация работает.

---

#### 2. **workoutHistoryService.js** (sport_base) ✅
```javascript
// ✅ Все методы используют limit()
async getByWorkoutId(workoutId, limitCount = 50)
async getLatestDateForDay(...) // limit(1)
async getAllDatesForDay(..., limitCount = 30)
```
**Оценка:** Отлично! Все запросы ограничены.

---

#### 3. **AssignedWorkoutsService.ts** (gym-calendar) ✅
```typescript
// ✅ Использует limit(10) + orderBy
async getAssignedWorkouts(userId: string, limitCount: number = 10)
```
**Оценка:** Отлично! Пагинация работает.

---

#### 4. **ChatService.ts** (gym-calendar) ✅
```typescript
// ✅ Использует limit() для сообщений
limit(params.pageSize)
```
**Оценка:** Отлично! Пагинация работает.

---

### 🔴 КРИТИЧЕСКИЕ ПРОБЛЕМЫ (ИСПРАВИТЬ НЕМЕДЛЕННО)

#### 1. **workoutsService.js** - `getByClientId()` ⚠️

**Проблема:**
```javascript
async getByClientId(clientId) {
  const q = query(
    workoutsRef, 
    where('clientId', '==', clientId)
  );
  const snapshot = await getDocs(q); // ❌ НЕТ LIMIT!
  
  // Сортировка на клиенте
  workouts.sort((a, b) => ...);
}
```

**Почему это плохо:**
- Загружает **ВСЕ** тренировки клиента (может быть 50-100 программ)
- Сортировка на клиенте (медленно)
- Лишний трафик и Firebase reads

**Решение:**
```javascript
async getByClientId(clientId, limitCount = 20) {
  const q = query(
    workoutsRef, 
    where('clientId', '==', clientId),
    orderBy('createdAt', 'desc'), // ✅ Сортировка на сервере
    limit(limitCount) // ✅ Ограничение
  );
  const snapshot = await getDocs(q);
  
  // Сортировка уже не нужна!
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

**Экономия:**
- Было: 50-100 reads (все тренировки)
- Стало: 20 reads (только последние)
- **Экономия: -60% reads**

---

#### 2. **assignedWorkoutsService.js** - `getAssignedWorkoutsByUserId()` ⚠️

**Проблема:**
```javascript
async getAssignedWorkoutsByUserId(userId) {
  const q = query(assignmentsRef, where('userId', '==', userId));
  const snapshot = await getDocs(q); // ❌ НЕТ LIMIT!
  
  // Сортировка на клиенте
  assignments.sort((a, b) => b.assignedAt.localeCompare(a.assignedAt));
}
```

**Почему это плохо:**
- Загружает **ВСЕ** назначения клиента (может быть 50-100 записей)
- Сортировка на клиенте
- Лишний трафик

**Решение:**
```javascript
async getAssignedWorkoutsByUserId(userId, limitCount = 10) {
  const q = query(
    assignmentsRef, 
    where('userId', '==', userId),
    orderBy('assignedAt', 'desc'), // ✅ Сортировка на сервере
    limit(limitCount) // ✅ Ограничение
  );
  const snapshot = await getDocs(q);
  
  // Сортировка уже не нужна!
  // ...
}
```

**Экономия:**
- Было: 50-100 reads (все назначения)
- Стало: 10 reads (только последние)
- **Экономия: -80% reads**

---

#### 3. **assignedWorkoutsService.js** - `getAssignedWorkoutsByClientId()` ⚠️

**Та же проблема** что и в `getAssignedWorkoutsByUserId()`.

**Решение:** Аналогично пункту 2.

---

#### 4. **WorkoutsService.ts** - `getClientWorkouts()` ⚠️

**Проблема:**
```typescript
async getClientWorkouts(clientId: string): Promise<Workout[]> {
  const q = query(workoutsRef, where('clientId', '==', clientId));
  const snapshot = await getDocs(q); // ❌ НЕТ LIMIT!
  
  // Сортировка на клиенте
  workouts.sort((a, b) => ...);
}
```

**Решение:**
```typescript
async getClientWorkouts(clientId: string, limitCount: number = 20): Promise<Workout[]> {
  const q = query(
    workoutsRef, 
    where('clientId', '==', clientId),
    orderBy('createdAt', 'desc'), // ✅ Сортировка на сервере
    limit(limitCount) // ✅ Ограничение
  );
  const snapshot = await getDocs(q);
  
  // Сортировка уже не нужна!
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workout));
}
```

**Экономия:** -60% reads

---

#### 5. **WorkoutsService.ts** - `getClientWorkoutHistory()` ⚠️

**Проблема:**
```typescript
async getClientWorkoutHistory(clientId: string): Promise<WorkoutHistory[]> {
  const q = query(historyRef, where('clientId', '==', clientId));
  const snapshot = await getDocs(q); // ❌ НЕТ LIMIT!
  
  // Сортировка на клиенте
  history.sort((a, b) => ...);
}
```

**Решение:**
```typescript
async getClientWorkoutHistory(clientId: string, limitCount: number = 50): Promise<WorkoutHistory[]> {
  const q = query(
    historyRef, 
    where('clientId', '==', clientId),
    orderBy('createdAt', 'desc'), // ✅ Сортировка на сервере
    limit(limitCount) // ✅ Ограничение
  );
  const snapshot = await getDocs(q);
  
  // Сортировка уже не нужна!
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkoutHistory));
}
```

**Экономия:** -70% reads

---

#### 6. **WorkoutsService.ts** - `getWorkoutHistory()` ⚠️

**Та же проблема** что и в `getClientWorkoutHistory()`.

**Решение:** Аналогично пункту 5.

---

#### 7. **workoutHistoryService.js** - `getByClientId()` ⚠️

**Проблема:**
```javascript
async getByClientId(clientId) {
  const q = query(
    historyRef,
    where('clientId', '==', clientId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q); // ❌ НЕТ LIMIT!
}
```

**Решение:**
```javascript
async getByClientId(clientId, limitCount = 50) {
  const q = query(
    historyRef,
    where('clientId', '==', clientId),
    orderBy('createdAt', 'desc'),
    limit(limitCount) // ✅ Добавить limit
  );
  const snapshot = await getDocs(q);
}
```

**Экономия:** -70% reads

---

### 🟡 СРЕДНИЙ ПРИОРИТЕТ

#### 1. **ExerciseHistoryService.ts** - `getExerciseHistory()` 🟡

**Проблема:**
```typescript
async getExerciseHistory(clientId: string, exerciseName: string, limit?: number) {
  let q = query(...);
  
  if (limit) {
    q = query(q); // ❌ limit не применяется!
  }
}
```

**Решение:**
```typescript
async getExerciseHistory(
  clientId: string, 
  exerciseName: string, 
  limitCount: number = 50
) {
  const historyRef = collection(db, COLLECTION_NAME);
  const q = query(
    historyRef,
    where('clientId', '==', clientId),
    where('exerciseName', '==', exerciseName),
    orderBy('timestamp', 'desc'),
    limit(limitCount) // ✅ Применяем limit
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

---

#### 2. **ExerciseHistoryService.ts** - `getClientHistory()` 🟡

**Проблема:**
```typescript
async getClientHistory(clientId: string, startDate?: string, endDate?: string) {
  const snapshot = await getDocs(q); // ❌ НЕТ LIMIT!
  let history = snapshot.docs.map(...);
  
  // Фильтрация на клиенте (медленно!)
  if (startDate) {
    history = history.filter(entry => entry.trainingDate >= startDate);
  }
}
```

**Решение:**
```typescript
async getClientHistory(
  clientId: string, 
  startDate?: string, 
  endDate?: string,
  limitCount: number = 100
) {
  const historyRef = collection(db, COLLECTION_NAME);
  let constraints = [
    where('clientId', '==', clientId),
    orderBy('timestamp', 'desc'),
    limit(limitCount) // ✅ Добавить limit
  ];
  
  // ✅ Фильтрация на сервере (если возможно)
  // Примечание: Firestore не поддерживает range queries на строках
  // Поэтому фильтрация по датам остается на клиенте
  
  const q = query(historyRef, ...constraints);
  const snapshot = await getDocs(q);
  
  let history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // Фильтрация по датам (на клиенте)
  if (startDate) {
    history = history.filter(entry => entry.trainingDate >= startDate);
  }
  if (endDate) {
    history = history.filter(entry => entry.trainingDate <= endDate);
  }
  
  return history;
}
```

---

#### 3. **ClientBaseService.ts** - `getDocs()` без limit 🟡

**Проблема:**
```typescript
const exercisesRef = collection(db, 'clientBases', clientId, 'exercises');
const exercisesSnap = await getDocs(exercisesRef); // ❌ НЕТ LIMIT!
```

**Оценка:** 
- Обычно у клиента 50-200 упражнений
- Это приемлемо, но можно добавить пагинацию в будущем
- **Приоритет: НИЗКИЙ**

---

### 🟢 НИЗКИЙ ПРИОРИТЕТ (МОЖНО ОТЛОЖИТЬ)

#### 1. **_StorageService.ts** - Удаление данных

**Проблема:**
```typescript
const attendanceSnapshot = await getDocs(attendanceRef); // ❌ НЕТ LIMIT!
```

**Оценка:**
- Это операции удаления (редкие)
- Нужно удалить ВСЕ данные, поэтому limit не нужен
- **Приоритет: НЕ ТРЕБУЕТСЯ**

---

#### 2. **StatisticsService.ts** - Статистика

**Проблема:**
```typescript
const querySnapshot = await getDocs(q); // ❌ НЕТ LIMIT!
```

**Оценка:**
- Статистика обычно за период (30-90 дней)
- Это 30-90 записей (приемлемо)
- **Приоритет: НИЗКИЙ**

---

## 📈 ИТОГОВАЯ ОЦЕНКА

### Найдено проблем:
- 🔴 **Критические:** 7 методов без limit()
- 🟡 **Средний приоритет:** 3 метода
- 🟢 **Низкий приоритет:** 2 метода

### Ожидаемая экономия после исправлений:

**До оптимизации:**
- `getByClientId()`: 50-100 reads
- `getAssignedWorkoutsByUserId()`: 50-100 reads
- `getClientWorkouts()`: 50-100 reads
- `getClientWorkoutHistory()`: 100-500 reads
- **ИТОГО:** ~250-700 reads на загрузку экранов

**После оптимизации:**
- `getByClientId()`: 20 reads (-60%)
- `getAssignedWorkoutsByUserId()`: 10 reads (-80%)
- `getClientWorkouts()`: 20 reads (-60%)
- `getClientWorkoutHistory()`: 50 reads (-70%)
- **ИТОГО:** ~100 reads на загрузку экранов

**Общая экономия: -60% Firebase reads** 🎉

---

## 🎯 РЕКОМЕНДАЦИИ

### 1. **Добавить limit() во все критические методы** 🔴

**Приоритет:** ВЫСОКИЙ  
**Файлы для изменения:**
- `sport_base/src/firebase/services/workoutsService.js`
- `sport_base/src/firebase/services/assignedWorkoutsService.js`
- `sport_base/src/firebase/services/workoutHistoryService.js`
- `gym-calendar/src/services/WorkoutsService.ts`

**Что делать:**
1. Добавить параметр `limitCount` с дефолтным значением
2. Добавить `orderBy()` для сортировки на сервере
3. Добавить `limit(limitCount)` в query
4. Убрать сортировку на клиенте (`.sort()`)

---

### 2. **Использовать orderBy() вместо сортировки на клиенте** 🔴

**Почему это важно:**
- Сортировка на сервере быстрее
- Меньше нагрузка на клиент
- Работает с limit() корректно

**Пример:**
```javascript
// ❌ ПЛОХО
const snapshot = await getDocs(q);
const data = snapshot.docs.map(...);
data.sort((a, b) => ...); // Сортировка на клиенте

// ✅ ХОРОШО
const q = query(
  ref,
  orderBy('createdAt', 'desc'), // Сортировка на сервере
  limit(20)
);
const snapshot = await getDocs(q);
const data = snapshot.docs.map(...); // Уже отсортировано!
```

---

### 3. **Добавить пагинацию для больших списков** 🟡

**Где нужно:**
- Список тренировок клиента (если > 20)
- История тренировок (если > 50)
- История упражнений (если > 50)

**Как реализовать:**
```javascript
// Первая страница
const firstQuery = query(
  ref,
  orderBy('createdAt', 'desc'),
  limit(20)
);
const firstSnapshot = await getDocs(firstQuery);

// Следующая страница
const lastVisible = firstSnapshot.docs[firstSnapshot.docs.length - 1];
const nextQuery = query(
  ref,
  orderBy('createdAt', 'desc'),
  startAfter(lastVisible),
  limit(20)
);
const nextSnapshot = await getDocs(nextQuery);
```

---

### 4. **Не использовать limit() для операций удаления** ✅

**Почему:**
- При удалении нужно удалить ВСЕ данные
- limit() приведет к неполному удалению

**Где это правильно:**
- `clientsService.delete()` - удаляет все subcollections
- `_StorageService.deleteClient()` - удаляет все данные

---

### 5. **Кеширование с TTL (следующий этап)** 🟢

**Что даст:**
- Экономия ~80% reads (данные из кеша)
- Быстрее открытие экранов
- Меньше нагрузка на Firebase

**План:**
- Добавить `lastFetch` timestamp в DataContext
- Добавить проверку TTL (5 минут)
- Оставить Pull-to-Refresh для принудительного обновления

---

## 📋 ПЛАН ДЕЙСТВИЙ

### Шаг 1: Исправить критические методы (7 шт) 🔴
1. `workoutsService.getByClientId()` - добавить limit(20)
2. `assignedWorkoutsService.getAssignedWorkoutsByUserId()` - добавить limit(10)
3. `assignedWorkoutsService.getAssignedWorkoutsByClientId()` - добавить limit(10)
4. `WorkoutsService.getClientWorkouts()` - добавить limit(20)
5. `WorkoutsService.getClientWorkoutHistory()` - добавить limit(50)
6. `WorkoutsService.getWorkoutHistory()` - добавить limit(50)
7. `workoutHistoryService.getByClientId()` - добавить limit(50)

### Шаг 2: Исправить методы среднего приоритета (2 шт) 🟡
1. `ExerciseHistoryService.getExerciseHistory()` - исправить применение limit
2. `ExerciseHistoryService.getClientHistory()` - добавить limit(100)

### Шаг 3: Тестирование ✅
- Проверить что все экраны работают
- Проверить что данные загружаются корректно
- Проверить что сортировка работает

### Шаг 4: Измерить экономию 📊
- Сравнить количество reads до и после
- Измерить время загрузки экранов

---

## 🎉 ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ

После завершения всех исправлений:

**Экономия Firebase:**
- Reads: **-60%** (~2,800 reads/месяц вместо 7,000)
- Время загрузки: **-40%** (меньше данных)
- Трафик: **-60%** (меньше данных)

**Улучшение UX:**
- Быстрее открытие экранов
- Меньше ожидания
- Плавная работа приложения

**Стоимость:**
- Останется в бесплатном плане Firebase
- Запас для роста до 1000 клиентов

---

**Статус:** Готов к реализации  
**Следующий шаг:** Исправить критические методы (Шаг 1)
