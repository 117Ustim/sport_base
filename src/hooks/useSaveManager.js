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
  const [hasOtherChanges, setHasOtherChanges] = useState(false); // Флаг для других изменений (удаления, перестановки)

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
    console.log('markAsChanged called');
    console.log('Setting hasUnsavedChanges to true');
    console.log('Setting hasOtherChanges to true');
    setHasUnsavedChanges(true);
    setHasOtherChanges(true); // Отмечаем, что есть другие изменения (не только новые элементы)
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
    
    // НЕ сбрасываем hasUnsavedChanges - пусть пользователь сам решает
    // Возможно, он удалил новое упражнение, но есть другие изменения
  };

  /**
   * Сохранить все изменения
   */
  const saveChanges = async (currentData, originalData) => {
    console.log('saveChanges called, hasUnsavedChanges:', hasUnsavedChanges);
    console.log('currentData:', currentData);
    console.log('originalData:', originalData);
    
    if (!hasUnsavedChanges) {
      console.log('No unsaved changes, returning early');
      return;
    }

    setIsSaving(true);
    try {
      console.log('Calling onSave with currentData and originalData');
      // Вызываем функцию сохранения из компонента
      // Передаём актуальные данные
      await onSave(currentData, originalData);
      
      // Сбрасываем состояние после успешного сохранения
      setNewItems([]);
      setHasUnsavedChanges(false);
      setHasOtherChanges(false); // Сбрасываем флаг других изменений
      
      if (showNotification) {
        showNotification('Зміни успішно збережено', 'success');
      }
      console.log('Save completed successfully');
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
    setHasOtherChanges(false); // Сбрасываем флаг других изменений
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
