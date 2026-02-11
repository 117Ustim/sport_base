# 🚀 ЭТАП 6: AUDIT ERROR HANDLING & RACE CONDITIONS

**Дата:** 06.02.2026  
**Проекты:** sport_base + gym-calendar  
**Цель:** Проверка обработки ошибок и race conditions

---

## 📊 АНАЛИЗ ОБРАБОТКИ ОШИБОК

### ✅ ЧТО РАБОТАЕТ ХОРОШО

#### 1. **Все сервисы используют try-catch** ✅
```javascript
// Пример из workoutsService.js
async getByClientId(clientId, limitCount = 20) {
  try {
    // ... код
    return workouts;
  } catch (error) {
    console.error('Error getting workouts:', error);
    throw error; // ✅ Пробрасываем ошибку дальше
  }
}
```

**Оценка:** Отлично! Все async методы обернуты в try-catch.

---

#### 2. **StatisticsService использует increment()** ✅
```typescript
// ✅ ПРАВИЛЬНО: Атомарное обновление
async incrementDailyStats(gymId, date, changes) {
  if (!statsSnap.exists()) {
    await setDoc(statsRef, { /* начальные значения */ });
  } else {
    const updates = {};
    if (changes.trainedTotal !== undefined) {
      updates.trainedTotal = increment(changes.trainedTotal); // ✅ Атомарно!
    }
    await updateDoc(statsRef, updates);
  }
}
```

**Оценка:** Отлично! Нет race conditions при одновременных отметках посещений.

---

#### 3. **CreateWorkout.jsx использует cleanup** ✅
```javascript
useEffect(() => {
  let isActive = true; // ✅ Флаг для cleanup

  const loadData = async () => {
    // ...
    if (!isActive) return; // ✅ Проверка перед setState
    setExercises(exercisesData);
  };

  loadData();

  return () => {
    isActive = false; // ✅ Cleanup
  };
}, [deps]);
```

**Оценка:** Отлично! Нет memory leaks.

---

### 🔴 КРИТИЧЕСКИЕ ПРОБЛЕМЫ

#### 1. **clientsService.update() - Race Condition** 🔴

**Проблема:**
```javascript
async update(id, clientData) {
  try {
    // 1. Читаем текущие данные
    const docSnap = await getDoc(docRef);
    let existingProfile = {};
    
    if (docSnap.exists()) {
      existingProfile = docSnap.data().profile || {};
    }
    
    // 2. Обновляем данные
    const updatedProfile = {
      ...existingProfile, // ⚠️ RACE CONDITION!
      name: sanitizedData.name,
      // ...
    };
    
    // 3. Сохраняем
    await setDoc(docRef, { profile: updatedProfile }, { merge: true });
  }
}
```

**Почему это плохо:**
- Если 2 пользователя одновременно обновляют клиента:
  1. Пользователь A читает данные (capacity = 10)
  2. Пользователь B читает данные (capacity = 10)
  3. Пользователь A обновляет capacity = 11
  4. Пользователь B обновляет capacity = 11 (перезаписывает изменения A!)
- **Результат:** Потеря данных

**Решение:**
```javascript
async update(id, clientData) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    
    // ✅ Используем merge: true без предварительного чтения
    const updatedProfile = {
      name: sanitizedData.name,
      surname: sanitizedData.surname,
      // ... только обновляемые поля
      updatedAt: new Date().toISOString()
    };
    
    // ✅ Firestore сам сделает merge атомарно
    await updateDoc(docRef, {
      'profile.name': sanitizedData.name,
      'profile.surname': sanitizedData.surname,
      // ...
      'profile.updatedAt': new Date().toISOString()
    });
  }
}
```

**Приоритет:** 🔴 ВЫСОКИЙ (может привести к потере данных)

---

#### 2. **clientsService.delete() - Нет транзакций** 🔴

**Проблема:**
```javascript
async delete(id) {
  try {
    // 1. Удаляем attendance
    await Promise.all(deleteAttendancePromises);
    
    // 2. Удаляем основной документ
    await deleteDoc(docRef);
    
    // 3. Удаляем clientBases
    await Promise.all(deleteExercisesPromises);
    
    // ⚠️ Если ошибка на шаге 3 - данные частично удалены!
  }
}
```

**Почему это плохо:**
- Если ошибка происходит в середине процесса:
  - Часть данных удалена
  - Часть данных осталась
  - **Результат:** Несогласованное состояние БД

**Решение:**
```javascript
// ❌ Firestore не поддерживает транзакции для удаления subcollections
// ✅ Используем Cloud Functions для атомарного удаления

// Альтернатива: Добавить флаг isDeleted вместо физического удаления
async softDelete(id) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      'profile.isDeleted': true,
      'profile.deletedAt': new Date().toISOString()
    });
    
    // Физическое удаление делаем в Cloud Function (фоновая задача)
  }
}
```

**Приоритет:** 🟡 СРЕДНИЙ (редкая операция, но критична)

---

#### 3. **Нет retry логики для сетевых ошибок** 🔴

**Проблема:**
```javascript
async getByClientId(clientId) {
  try {
    const snapshot = await getDocs(q);
    return workouts;
  } catch (error) {
    console.error('Error getting workouts:', error);
    throw error; // ❌ Просто пробрасываем ошибку
  }
}
```

**Почему это плохо:**
- Если временная сетевая ошибка:
  - Пользователь видит ошибку
  - Нужно вручную обновлять страницу
  - **Результат:** Плохой UX

**Решение:**
```javascript
// Создать утилиту для retry
async function retryOperation(operation, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      // Проверяем тип ошибки
      const isNetworkError = 
        error.code === 'unavailable' || 
        error.code === 'deadline-exceeded' ||
        error.message.includes('network');
      
      if (!isNetworkError || i === maxRetries - 1) {
        throw error; // Не сетевая ошибка или последняя попытка
      }
      
      // Ждем перед следующей попыткой (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
}

// Использование
async getByClientId(clientId) {
  try {
    return await retryOperation(async () => {
      const snapshot = await getDocs(q);
      return workouts;
    });
  } catch (error) {
    console.error('Error getting workouts:', error);
    throw error;
  }
}
```

**Приоритет:** 🟡 СРЕДНИЙ (улучшит UX)

---

#### 4. **Нет обработки offline режима** 🟡

**Проблема:**
```javascript
// Нет проверки на offline
async create(clientData) {
  try {
    await setDoc(docRef, newClientData);
    return { id: newId };
  } catch (error) {
    console.error('Error creating client:', error);
    throw error; // ❌ Пользователь не знает что offline
  }
}
```

**Почему это плохо:**
- Если пользователь offline:
  - Видит непонятную ошибку
  - Не знает что нужно подключиться к интернету
  - **Результат:** Плохой UX

**Решение:**
```javascript
// Проверка на offline
function isOfflineError(error) {
  return (
    error.code === 'unavailable' ||
    error.message.includes('Failed to get document') ||
    error.message.includes('network')
  );
}

async create(clientData) {
  try {
    await setDoc(docRef, newClientData);
    return { id: newId };
  } catch (error) {
    if (isOfflineError(error)) {
      throw new Error('Нет подключения к интернету. Проверьте соединение.');
    }
    console.error('Error creating client:', error);
    throw error;
  }
}
```

**Приоритет:** 🟡 СРЕДНИЙ (улучшит UX)

---

### 🟢 НИЗКИЙ ПРИОРИТЕТ

#### 1. **Нет Error Boundaries в React компонентах** 🟢

**Проблема:**
- Если ошибка в компоненте → весь UI ломается
- Пользователь видит белый экран

**Решение:**
```javascript
// Создать ErrorBoundary компонент
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h2>Что-то пошло не так</h2>
          <button onClick={() => window.location.reload()}>
            Обновить страницу
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Использование
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

**Приоритет:** 🟢 НИЗКИЙ (nice to have)

---

#### 2. **Нет логирования ошибок в сервис** 🟢

**Проблема:**
- Ошибки только в console.error
- Нет централизованного логирования
- Сложно отслеживать проблемы в продакшене

**Решение:**
```javascript
// Интеграция с Sentry или Firebase Crashlytics
import * as Sentry from '@sentry/react';

async getByClientId(clientId) {
  try {
    const snapshot = await getDocs(q);
    return workouts;
  } catch (error) {
    console.error('Error getting workouts:', error);
    
    // ✅ Отправляем в Sentry
    Sentry.captureException(error, {
      tags: {
        service: 'workoutsService',
        method: 'getByClientId'
      },
      extra: {
        clientId
      }
    });
    
    throw error;
  }
}
```

**Приоритет:** 🟢 НИЗКИЙ (для продакшена)

---

## 🎯 RACE CONDITIONS

### ✅ ЧТО РАБОТАЕТ ХОРОШО

#### 1. **StatisticsService.incrementDailyStats()** ✅
```typescript
// ✅ Использует increment() - атомарная операция
updates.trainedTotal = increment(changes.trainedTotal);
```

**Оценка:** Отлично! Нет race conditions.

---

#### 2. **CreateWorkout.jsx - useEffect cleanup** ✅
```javascript
// ✅ Флаг isActive предотвращает setState после unmount
let isActive = true;
// ...
if (!isActive) return;
setExercises(exercisesData);
```

**Оценка:** Отлично! Нет memory leaks.

---

### 🔴 НАЙДЕННЫЕ RACE CONDITIONS

#### 1. **clientsService.update()** 🔴
**Описание:** Read-Modify-Write без транзакции  
**Риск:** Потеря данных при одновременном обновлении  
**Приоритет:** 🔴 ВЫСОКИЙ

---

#### 2. **assignedWorkoutsService.assignWeekToClient()** 🟡
**Проблема:**
```javascript
// 1. Удаляем старые тренировки
await this.deleteAllAssignmentsForUser(userId);

// 2. Создаем новую тренировку
await setDoc(assignmentRef, assignmentData);

// ⚠️ Если между шагами 1 и 2 другой процесс создаст тренировку - она будет потеряна
```

**Решение:**
```javascript
// ✅ Использовать batch для атомарности
const batch = writeBatch(db);

// Удаляем старые
oldAssignments.forEach(doc => {
  batch.delete(doc.ref);
});

// Создаем новую
batch.set(assignmentRef, assignmentData);

// Выполняем атомарно
await batch.commit();
```

**Приоритет:** 🟡 СРЕДНИЙ (редкая ситуация)

---

## 📈 ИТОГОВАЯ ОЦЕНКА

### Найдено проблем:
- 🔴 **Критические:** 3 проблемы
  1. clientsService.update() - race condition
  2. clientsService.delete() - нет транзакций
  3. Нет retry логики для сетевых ошибок
  
- 🟡 **Средний приоритет:** 2 проблемы
  1. Нет обработки offline режима
  2. assignWeekToClient() - race condition
  
- 🟢 **Низкий приоритет:** 2 проблемы
  1. Нет Error Boundaries
  2. Нет централизованного логирования

---

## 🎯 РЕКОМЕНДАЦИИ

### 1. **Исправить clientsService.update()** 🔴

**Приоритет:** ВЫСОКИЙ  
**Что делать:**
- Использовать `updateDoc()` вместо read-modify-write
- Обновлять только нужные поля
- Не читать документ перед обновлением

**Файл:** `sport_base/src/firebase/services/clientsService.js`

---

### 2. **Добавить retry логику** 🔴

**Приоритет:** ВЫСОКИЙ  
**Что делать:**
- Создать утилиту `retryOperation()`
- Использовать exponential backoff
- Retry только для сетевых ошибок

**Файл:** `sport_base/src/firebase/utils/retry.js` (новый)

---

### 3. **Улучшить обработку ошибок** 🟡

**Приоритет:** СРЕДНИЙ  
**Что делать:**
- Добавить проверку на offline
- Показывать понятные сообщения пользователю
- Различать типы ошибок (сеть, валидация, сервер)

**Файлы:** Все сервисы

---

### 4. **Использовать batch для атомарности** 🟡

**Приоритет:** СРЕДНИЙ  
**Что делать:**
- Использовать `writeBatch()` для связанных операций
- Гарантировать атомарность удаления + создания

**Файл:** `sport_base/src/firebase/services/assignedWorkoutsService.js`

---

### 5. **Добавить Error Boundaries** 🟢

**Приоритет:** НИЗКИЙ  
**Что делать:**
- Создать ErrorBoundary компонент
- Обернуть App в ErrorBoundary
- Показывать fallback UI при ошибках

**Файл:** `sport_base/src/components/ErrorBoundary.jsx` (новый)

---

## 📋 ПЛАН ДЕЙСТВИЙ

### Шаг 1: Исправить критические проблемы (3 шт) 🔴
1. Исправить `clientsService.update()` - использовать updateDoc
2. Создать утилиту `retryOperation()` для retry логики
3. Добавить retry во все сервисы

### Шаг 2: Исправить проблемы среднего приоритета (2 шт) 🟡
1. Добавить проверку на offline во все сервисы
2. Использовать batch в `assignWeekToClient()`

### Шаг 3: Улучшения (опционально) 🟢
1. Добавить ErrorBoundary компоненты
2. Интегрировать Sentry для логирования

---

## 🎉 ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ

После завершения всех исправлений:

**Надежность:**
- Нет race conditions при одновременных операциях
- Нет потери данных
- Атомарные операции

**UX:**
- Автоматический retry при сетевых ошибках
- Понятные сообщения об ошибках
- Работа в offline режиме (частично)

**Мониторинг:**
- Централизованное логирование ошибок
- Отслеживание проблем в продакшене
- Быстрое реагирование на баги

---

**Статус:** Готов к реализации  
**Следующий шаг:** Исправить критические проблемы (Шаг 1)
