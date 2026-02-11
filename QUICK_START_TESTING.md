# 🚀 Быстрый старт: Тестирование

## Запуск тестов

```bash
# Запустить все тесты (один раз)
npm test -- --watchAll=false

# Запустить в watch режиме (автоматически перезапускаются)
npm test

# Запустить с покрытием кода
npm test -- --coverage --watchAll=false
```

## Создание нового теста

### 1. Создайте файл теста рядом с тестируемым файлом:

```
src/
├── myFile.js
└── __tests__/
    └── myFile.test.js
```

### 2. Базовая структура теста:

```javascript
// src/myModule/__tests__/myFunction.test.js
import { myFunction } from '../myFunction';

describe('myFunction', () => {
  it('should do something', () => {
    const result = myFunction(input);
    expect(result).toBe(expected);
  });
});
```

### 3. Тестирование хуков:

```javascript
import { renderHook, waitFor } from '@testing-library/react';
import { useMyHook } from '../useMyHook';

describe('useMyHook', () => {
  it('should return data', async () => {
    const { result } = renderHook(() => useMyHook());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.data).toBeDefined();
  });
});
```

### 4. Тестирование компонентов:

```javascript
import { render, screen } from '@testing-library/react';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## Полезные команды

```bash
# Запустить только один тест
npm test -- myFile.test.js --watchAll=false

# Запустить тесты с подробным выводом
npm test -- --verbose --watchAll=false

# Обновить snapshots
npm test -- -u --watchAll=false
```

## Что тестировать в первую очередь?

1. ✅ **Сервисы** - бизнес-логика, работа с API
2. ✅ **Хуки** - кастомные хуки с логикой
3. ✅ **Утилиты** - чистые функции
4. ⏳ **Компоненты** - критичные UI компоненты
5. ⏳ **Формы** - валидация и отправка данных

## Примеры

Смотри готовые примеры в:
- `src/hooks/__tests__/useExercises.test.js`
- `src/constants/__tests__/constants.test.js`
- `src/firebase/services/__tests__/authService.test.js`
