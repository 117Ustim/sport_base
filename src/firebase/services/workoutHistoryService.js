import { 
  collection, 
  doc, 
  getDocs, 
  setDoc,
  getDoc,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../config';

export const workoutHistoryService = {
  // Вспомогательная функция для очистки exerciseData от пустых значений
  _cleanExerciseData(exerciseData) {
    if (!exerciseData || typeof exerciseData !== 'object') {
      return exerciseData;
    }
    
    const cleaned = {};
    for (const [key, value] of Object.entries(exerciseData)) {
      // Сохраняем только непустые значения
      if (value !== '' && value !== null && value !== undefined) {
        cleaned[key] = value;
      }
    }
    
    return Object.keys(cleaned).length > 0 ? cleaned : {};
  },

  // Очистить массив упражнений от пустых данных
  _cleanExercises(exercises) {
    if (!Array.isArray(exercises)) {
      return exercises;
    }
    
    return exercises.map(exercise => {
      if (exercise.exerciseData) {
        return {
          ...exercise,
          exerciseData: this._cleanExerciseData(exercise.exerciseData)
        };
      }
      return exercise;
    });
  },

  // Сохранить запись о выполненной тренировке
  async saveWorkoutSession(sessionData) {
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const sessionRef = doc(db, 'workoutHistory', sessionId);
      
      // Очищаем exercises от пустых значений в exerciseData
      const cleanedExercises = this._cleanExercises(sessionData.exercises);
      
      const data = {
        workoutId: sessionData.workoutId,
        clientId: sessionData.clientId,
        weekNumber: sessionData.weekNumber,
        dayKey: sessionData.dayKey, // monday, tuesday, etc.
        date: sessionData.date, // DD.MM.YYYY
        exercises: cleanedExercises, // Очищенный массив упражнений
        createdAt: new Date().toLocaleDateString('ru-RU', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }).replace(/\//g, '.')
      };
      
      await setDoc(sessionRef, data);
      
      return {
        id: sessionId,
        ...data
      };
    } catch (error) {
      console.error('Error saving workout session:', error);
      throw error;
    }
  },

  // Получить все записи тренировок для конкретной тренировки
  // ✅ ОПТИМИЗИРОВАНО: Добавлен limit для уменьшения нагрузки
  async getByWorkoutId(workoutId, limitCount = 50) {
    try {
      const historyRef = collection(db, 'workoutHistory');
      const q = query(
        historyRef,
        where('workoutId', '==', workoutId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      
      const sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return sessions;
    } catch (error) {
      console.error('Error getting workout history:', error);
      throw error;
    }
  },

  // Получить последнюю дату для конкретного дня тренировки
  // ✅ ОПТИМИЗИРОВАНО: Добавлен limit(1) - нужна только последняя запись
  async getLatestDateForDay(workoutId, weekNumber, dayKey) {
    try {
      const historyRef = collection(db, 'workoutHistory');
      const q = query(
        historyRef,
        where('workoutId', '==', workoutId),
        where('weekNumber', '==', weekNumber),
        where('dayKey', '==', dayKey),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const latestSession = snapshot.docs[0].data();
        return latestSession.date;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting latest date:', error);
      throw error;
    }
  },

  // Получить все даты для конкретного дня тренировки
  // ✅ ОПТИМИЗИРОВАНО: Добавлен limit для уменьшения нагрузки
  async getAllDatesForDay(workoutId, weekNumber, dayKey, limitCount = 30) {
    try {
      const historyRef = collection(db, 'workoutHistory');
      const q = query(
        historyRef,
        where('workoutId', '==', workoutId),
        where('weekNumber', '==', weekNumber),
        where('dayKey', '==', dayKey),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      
      const dates = snapshot.docs.map(doc => doc.data().date);
      
      return dates;
    } catch (error) {
      console.error('Error getting all dates:', error);
      throw error;
    }
  },

  // Получить историю тренировок клиента
  // ✅ ОПТИМИЗИРОВАНО: Добавлен limit для уменьшения нагрузки
  async getByClientId(clientId, limitCount = 50) {
    try {
      const historyRef = collection(db, 'workoutHistory');
      const q = query(
        historyRef,
        where('clientId', '==', clientId),
        orderBy('createdAt', 'desc'),
        limit(limitCount) // ✅ Ограничение количества
      );
      const snapshot = await getDocs(q);
      
      const sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return sessions;
    } catch (error) {
      console.error('Error getting client workout history:', error);
      throw error;
    }
  }
};
