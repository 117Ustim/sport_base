/**
 * Утилита для автоматического retry операций при сетевых ошибках
 * 
 * Использует exponential backoff для повторных попыток
 */

import { logError, logMessage } from '../../utils/sentry';

/**
 * Проверить является ли ошибка сетевой
 */
export function isNetworkError(error) {
  if (!error) return false;
  
  // Firestore error codes
  const networkErrorCodes = [
    'unavailable',
    'deadline-exceeded',
    'cancelled',
    'aborted'
  ];
  
  if (error.code && networkErrorCodes.includes(error.code)) {
    return true;
  }
  
  // Проверка по сообщению
  const errorMessage = error.message?.toLowerCase() || '';
  const networkKeywords = [
    'network',
    'connection',
    'timeout',
    'failed to fetch',
    'failed to get document'
  ];
  
  return networkKeywords.some(keyword => errorMessage.includes(keyword));
}

/**
 * Проверить является ли ошибка offline
 */
export function isOfflineError(error) {
  if (!error) return false;
  
  if (error.code === 'unavailable') {
    return true;
  }
  
  const errorMessage = error.message?.toLowerCase() || '';
  return (
    errorMessage.includes('failed to get document') ||
    errorMessage.includes('network request failed') ||
    errorMessage.includes('offline')
  );
}

/**
 * Выполнить операцию с автоматическим retry при сетевых ошибках
 * 
 * @param {Function} operation - Async функция для выполнения
 * @param {Object} options - Опции retry
 * @param {number} options.maxRetries - Максимальное количество попыток (по умолчанию 3)
 * @param {number} options.initialDelay - Начальная задержка в мс (по умолчанию 1000)
 * @param {number} options.maxDelay - Максимальная задержка в мс (по умолчанию 10000)
 * @param {Function} options.onRetry - Callback при каждой попытке
 * @returns {Promise} Результат операции
 */
export async function retryOperation(operation, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    onRetry = null
  } = options;
  
  let lastError = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Выполняем операцию
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Проверяем тип ошибки
      const isNetwork = isNetworkError(error);
      const isLastAttempt = attempt === maxRetries - 1;
      
      // Если не сетевая ошибка или последняя попытка - пробрасываем
      if (!isNetwork || isLastAttempt) {
        // Логируем критическую ошибку в Sentry
        if (isLastAttempt) {
          logError(error, {
            context: 'retry_exhausted',
            attempts: maxRetries,
            isNetworkError: isNetwork
          });
        }
        throw error;
      }
      
      // Вычисляем задержку (exponential backoff)
      const delay = Math.min(
        initialDelay * Math.pow(2, attempt),
        maxDelay
      );
      
      // Вызываем callback если есть
      if (onRetry) {
        onRetry(attempt + 1, maxRetries, delay, error);
      }
      
      console.warn(
        `[Retry] Попытка ${attempt + 1}/${maxRetries} не удалась. ` +
        `Повтор через ${delay}мс. Ошибка:`,
        error.message
      );
      
      // Логируем warning в Sentry при повторных попытках
      if (attempt > 0) {
        logMessage(
          `Retry attempt ${attempt + 1}/${maxRetries}`,
          'warning',
          {
            error: error.message,
            delay,
            isNetworkError: isNetwork
          }
        );
      }
      
      // Ждем перед следующей попыткой
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Если дошли сюда - все попытки исчерпаны
  throw lastError;
}

/**
 * Создать обертку для сервиса с автоматическим retry
 * 
 * @param {Object} service - Объект сервиса
 * @param {Object} options - Опции retry
 * @returns {Object} Обернутый сервис
 */
export function withRetry(service, options = {}) {
  const wrappedService = {};
  
  for (const [key, value] of Object.entries(service)) {
    if (typeof value === 'function') {
      // Оборачиваем только async функции
      wrappedService[key] = async function(...args) {
        return retryOperation(() => value.apply(service, args), options);
      };
    } else {
      wrappedService[key] = value;
    }
  }
  
  return wrappedService;
}

/**
 * Получить понятное сообщение об ошибке для пользователя
 */
export function getUserFriendlyErrorMessage(error) {
  if (!error) {
    return 'Произошла неизвестная ошибка';
  }
  
  // Offline ошибки
  if (isOfflineError(error)) {
    return 'Нет подключения к интернету. Проверьте соединение и попробуйте снова.';
  }
  
  // Сетевые ошибки
  if (isNetworkError(error)) {
    return 'Проблема с подключением к серверу. Попробуйте позже.';
  }
  
  // Firestore ошибки
  if (error.code) {
    switch (error.code) {
      case 'permission-denied':
        return 'У вас нет прав для выполнения этой операции.';
      case 'not-found':
        return 'Запрашиваемые данные не найдены.';
      case 'already-exists':
        return 'Такая запись уже существует.';
      case 'resource-exhausted':
        return 'Превышен лимит запросов. Попробуйте позже.';
      case 'unauthenticated':
        return 'Необходимо войти в систему.';
      case 'invalid-argument':
        return 'Некорректные данные. Проверьте введенную информацию.';
      default:
        return `Ошибка: ${error.code}`;
    }
  }
  
  // Возвращаем оригинальное сообщение
  return error.message || 'Произошла ошибка';
}
