import { collection, addDoc, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../config';

const COLLECTION_NAME = 'exerciseHistory';

/**
 * Сервис для работы с историей изменений упражнений
 * Сохраняет каждое изменение веса в базе client_base
 */
export const exerciseHistoryService = {
  /**
   * Добавить запись в историю упражнений
   * @param {Object} entry - Данные записи
   * @returns {Promise<string>} ID созданной записи
   */
  async addHistoryEntry(entry) {
    try {
      const historyRef = collection(db, COLLECTION_NAME);
      
      // Очищаем от undefined значений
      const cleanEntry = {
        clientId: entry.clientId,
        exerciseName: entry.exerciseName,
        sets: entry.sets || 0,
        reps: entry.reps,
        previousWeight: entry.previousWeight,
        newWeight: entry.newWeight,
        previousReps: entry.previousReps || entry.reps,
        newReps: entry.newReps || entry.reps,
        weightChange: entry.weightChange,
        repsChange: entry.repsChange || 0,
        timestamp: entry.timestamp || new Date().toISOString(),
        trainingDate: entry.trainingDate || new Date().toISOString(),
        createdAt: Timestamp.now()
      };
      
      // Добавляем опциональные поля только если они определены
      if (entry.categoryId) {
        cleanEntry.categoryId = entry.categoryId;
      }
      if (entry.workoutId) {
        cleanEntry.workoutId = entry.workoutId;
      }
      if (entry.assignmentId) {
        cleanEntry.assignmentId = entry.assignmentId;
      }
      
      const docRef = await addDoc(historyRef, cleanEntry);
      
      return docRef.id;
    } catch (error) {
      console.error('Error adding exercise history entry:', error);
      throw error;
    }
  },

  /**
   * Получить историю упражнения для клиента
   * @param {string} clientId - ID клиента
   * @param {string} exerciseName - Название упражнения
   * @param {number} limitCount - Лимит записей (по умолчанию 50)
   * @returns {Promise<Array>} Массив записей истории
   */
  async getExerciseHistory(clientId, exerciseName, limitCount = 50) {
    try {
      const historyRef = collection(db, COLLECTION_NAME);
      const q = query(
        historyRef,
        where('clientId', '==', clientId),
        where('exerciseName', '==', exerciseName),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting exercise history:', error);
      throw error;
    }
  },

  /**
   * Получить всю историю клиента
   * @param {string} clientId - ID клиента
   * @param {string} startDate - Начальная дата (опционально)
   * @param {string} endDate - Конечная дата (опционально)
   * @param {number} limitCount - Лимит записей (по умолчанию 100)
   * @returns {Promise<Array>} Массив записей истории
   */
  async getClientHistory(clientId, startDate = null, endDate = null, limitCount = 100) {
    try {
      const historyRef = collection(db, COLLECTION_NAME);
      const q = query(
        historyRef,
        where('clientId', '==', clientId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      let history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Фильтрация по датам на клиенте
      if (startDate) {
        history = history.filter(entry => entry.trainingDate >= startDate);
      }
      if (endDate) {
        history = history.filter(entry => entry.trainingDate <= endDate);
      }

      return history;
    } catch (error) {
      console.error('Error getting client history:', error);
      throw error;
    }
  },

  /**
   * Получить статистику прогресса по упражнению
   * @param {string} clientId - ID клиента
   * @param {string} exerciseName - Название упражнения
   * @returns {Promise<Object>} Статистика прогресса
   */
  async getExerciseProgress(clientId, exerciseName) {
    try {
      const history = await this.getExerciseHistory(clientId, exerciseName);
      
      if (history.length === 0) {
        return {
          totalChanges: 0,
          totalWeightIncrease: 0,
          averageWeightIncrease: 0,
          firstWeight: 0,
          lastWeight: 0,
          progressPercentage: 0
        };
      }

      const totalWeightIncrease = history.reduce((sum, entry) => sum + entry.weightChange, 0);
      const firstWeight = history[history.length - 1].previousWeight;
      const lastWeight = history[0].newWeight;
      const progressPercentage = firstWeight > 0 
        ? ((lastWeight - firstWeight) / firstWeight) * 100 
        : 0;

      return {
        totalChanges: history.length,
        totalWeightIncrease,
        averageWeightIncrease: totalWeightIncrease / history.length,
        firstWeight,
        lastWeight,
        progressPercentage
      };
    } catch (error) {
      console.error('Error getting exercise progress:', error);
      throw error;
    }
  }
};
