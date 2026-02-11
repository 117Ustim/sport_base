/**
 * Центральный экспорт всех сервисов с автоматическим retry
 */

import { clientsService as _clientsService } from './clientsService';
import { workoutsService as _workoutsService } from './workoutsService';
import { assignedWorkoutsService as _assignedWorkoutsService } from './assignedWorkoutsService';
import { workoutHistoryService as _workoutHistoryService } from './workoutHistoryService';
import { clientBaseService as _clientBaseService } from './clientBaseService';
import { categoriesService as _categoriesService } from './categoriesService';
import { authService as _authService } from './authService';
import { gymsService as _gymsService } from './gymsService';
import { exercisesService as _exercisesService } from './exercisesService';
import { statisticsService as _statisticsService } from './statisticsService';
import { retryOperation, getUserFriendlyErrorMessage, isOfflineError } from '../utils/retry';

/**
 * Методы которые НЕ нужно оборачивать в retry
 * (например, методы которые возвращают unsubscribe функции)
 */
const METHODS_TO_SKIP = [
  'onAuthStateChanged',
  'onAuthChange',
  'subscribeToConversations',
  'subscribeToMessages',
  'subscribeToUnreadCount'
];

/**
 * Обернуть метод сервиса для добавления retry логики и обработки ошибок
 */
function wrapServiceMethod(method, serviceName, methodName) {
  // Пропускаем методы которые возвращают unsubscribe функции
  if (METHODS_TO_SKIP.includes(methodName)) {
    console.log(`[wrapService] Skipping method: ${serviceName}.${methodName}`);
    return method;
  }
  
  return async function(...args) {
    try {
      // Выполняем с retry
      return await retryOperation(
        () => method.apply(this, args),
        {
          maxRetries: 3,
          initialDelay: 1000,
          onRetry: (attempt, maxRetries, delay, error) => {
            console.log(
              `[${serviceName}.${methodName}] Retry ${attempt}/${maxRetries} ` +
              `через ${delay}мс. Ошибка: ${error.message}`
            );
          }
        }
      );
    } catch (error) {
      // Добавляем понятное сообщение для пользователя
      const userMessage = getUserFriendlyErrorMessage(error);
      
      // Создаем новую ошибку с понятным сообщением
      const enhancedError = new Error(userMessage);
      enhancedError.originalError = error;
      enhancedError.isOffline = isOfflineError(error);
      enhancedError.serviceName = serviceName;
      enhancedError.methodName = methodName;
      
      throw enhancedError;
    }
  };
}

/**
 * Обернуть весь сервис для добавления retry логики
 */
function wrapService(service, serviceName) {
  // Если сервис - это класс (имеет методы в prototype), не оборачиваем
  // Такие сервисы как categoriesService уже работают корректно
  if (service.constructor && service.constructor.name !== 'Object') {
    console.log(`[wrapService] Skipping class-based service: ${serviceName}`);
    return service;
  }
  
  const wrappedService = {};
  
  for (const [key, value] of Object.entries(service)) {
    if (typeof value === 'function') {
      wrappedService[key] = wrapServiceMethod(value, serviceName, key);
    } else {
      wrappedService[key] = value;
    }
  }
  
  return wrappedService;
}

// ✅ Экспортируем сервисы с автоматическим retry
export const clientsService = wrapService(_clientsService, 'clientsService');
export const workoutsService = wrapService(_workoutsService, 'workoutsService');
export const assignedWorkoutsService = wrapService(_assignedWorkoutsService, 'assignedWorkoutsService');
export const workoutHistoryService = wrapService(_workoutHistoryService, 'workoutHistoryService');
export const clientBaseService = wrapService(_clientBaseService, 'clientBaseService');
export const categoriesService = wrapService(_categoriesService, 'categoriesService');
export const authService = wrapService(_authService, 'authService');
export const gymsService = wrapService(_gymsService, 'gymsService');
export const exercisesService = wrapService(_exercisesService, 'exercisesService');
export const statisticsService = wrapService(_statisticsService, 'statisticsService');

// Экспортируем утилиты для использования в компонентах
export { getUserFriendlyErrorMessage, isOfflineError } from '../utils/retry';
