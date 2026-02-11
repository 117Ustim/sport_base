import { useState, useCallback } from 'react';

/**
 * Хук для optimistic updates
 * Мгновенно обновляет UI, затем выполняет запрос в фоне
 * При ошибке откатывает изменения
 * 
 * @returns {Object} { executeOptimistic, isLoading, error }
 */
export const useOptimisticUpdate = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Выполняет optimistic update
   * 
   * @param {Object} params
   * @param {Function} params.optimisticUpdate - Функция для мгновенного обновления UI
   * @param {Function} params.apiCall - Асинхронная функция API запроса
   * @param {Function} params.rollback - Функция отката при ошибке
   * @param {Function} params.onSuccess - Callback при успехе (опционально)
   * @param {Function} params.onError - Callback при ошибке (опционально)
   */
  const executeOptimistic = useCallback(async ({
    optimisticUpdate,
    apiCall,
    rollback,
    onSuccess,
    onError
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Мгновенно обновляем UI (optimistic)
      if (optimisticUpdate) {
        optimisticUpdate();
      }

      // 2. Выполняем реальный API запрос в фоне
      const result = await apiCall();

      // 3. Успех - вызываем callback
      if (onSuccess) {
        onSuccess(result);
      }

      setIsLoading(false);
      return { success: true, data: result };

    } catch (err) {
      console.error('❌ Optimistic update failed:', err);
      
      // 4. Ошибка - откатываем UI изменения
      if (rollback) {
        rollback();
      }

      // 5. Вызываем error callback
      if (onError) {
        onError(err);
      }

      setError(err);
      setIsLoading(false);
      return { success: false, error: err };
    }
  }, []);

  return {
    executeOptimistic,
    isLoading,
    error
  };
};
