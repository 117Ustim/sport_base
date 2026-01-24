import { useState, useEffect } from 'react';

/**
 * Хук для управления сохранением изменений
 * @param {Function} onSave - Функция сохранения (async), принимает newItems
 * @param {Function} showNotification - Функция показа уведомлений
 * @returns {Object} - Состояние и методы управления сохранением
 */
export function useSaveManager({ onSave, showNotification }) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newItems, setNewItems] = useState([]); // Новые элементы для сохранения
  const [originalItems, setOriginalItems] = useState([]); // Оригинальные данные

  // Предупреждение при выходе со страницы
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'У вас є незбережені зміни. Ви впевнені, що хочете вийти?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  /**
   * Отметить, что есть несохраненные изменения
   */
  const markAsChanged = () => {
    setHasUnsavedChanges(true);
  };

  /**
   * Добавить новый элемент в список для сохранения
   */
  const addNewItem = (item) => {
    setNewItems(prev => [...prev, item]);
    markAsChanged();
  };

  /**
   * Удалить новый элемент из списка (если он еще не сохранен)
   */
  const removeNewItem = (itemId) => {
    setNewItems(prev => prev.filter(item => {
      // Поддержка разных полей ID
      const id = item.id || item.exercise_id;
      return id !== itemId;
    }));
    
    // Если больше нет новых элементов, сбрасываем флаг
    if (newItems.length === 1) {
      setHasUnsavedChanges(false);
    }
  };

  /**
   * Сохранить все изменения
   */
  const saveChanges = async () => {
    if (!hasUnsavedChanges) {
      return;
    }

    setIsSaving(true);
    try {
      // Вызываем функцию сохранения из компонента
      await onSave(newItems);
      
      // Сбрасываем состояние после успешного сохранения
      setNewItems([]);
      setHasUnsavedChanges(false);
      
      if (showNotification) {
        showNotification('Зміни успішно збережено', 'success');
      }
    } catch (error) {
      console.error('Помилка збереження:', error);
      if (showNotification) {
        showNotification('Помилка збереження змін', 'error');
      }
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Сбросить все несохраненные изменения
   */
  const resetChanges = () => {
    setNewItems([]);
    setHasUnsavedChanges(false);
  };

  /**
   * Установить оригинальные данные (для сравнения)
   */
  const setOriginalData = (data) => {
    setOriginalItems(data);
  };

  return {
    hasUnsavedChanges,
    isSaving,
    newItems,
    originalItems,
    setNewItems,
    addNewItem,
    removeNewItem,
    markAsChanged,
    saveChanges,
    resetChanges,
    setOriginalData
  };
}
