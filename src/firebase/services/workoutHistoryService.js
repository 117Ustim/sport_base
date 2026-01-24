import { 
  collection, 
  doc, 
  getDocs, 
  setDoc,
  getDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from '../config';

export const workoutHistoryService = {
  // Сохранить запись о выполненной тренировке
  async saveWorkoutSession(sessionData) {
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const sessionRef = doc(db, 'workoutHistory', sessionId);
      
      const data = {
        workoutId: sessionData.workoutId,
        clientId: sessionData.clientId,
        weekNumber: sessionData.weekNumber,
        dayKey: sessionData.dayKey, // monday, tuesday, etc.
        date: sessionData.date, // DD.MM.YYYY
        exercises: sessionData.exercises, // Полный массив упражнений с данными
        createdAt: new Date().toISOString()
      };
      
      console.log('workoutHistoryService.saveWorkoutSession - saving:', data);
      
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
  async getByWorkoutId(workoutId) {
    try {
      const historyRef = collection(db, 'workoutHistory');
      const q = query(
        historyRef,
        where('workoutId', '==', workoutId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      
      const sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('workoutHistoryService.getByWorkoutId - loaded sessions:', sessions);
      
      return sessions;
    } catch (error) {
      console.error('Error getting workout history:', error);
      throw error;
    }
  },

  // Получить последнюю дату для конкретного дня тренировки
  async getLatestDateForDay(workoutId, weekNumber, dayKey) {
    try {
      const historyRef = collection(db, 'workoutHistory');
      const q = query(
        historyRef,
        where('workoutId', '==', workoutId),
        where('weekNumber', '==', weekNumber),
        where('dayKey', '==', dayKey),
        orderBy('createdAt', 'desc')
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
  async getAllDatesForDay(workoutId, weekNumber, dayKey) {
    try {
      const historyRef = collection(db, 'workoutHistory');
      const q = query(
        historyRef,
        where('workoutId', '==', workoutId),
        where('weekNumber', '==', weekNumber),
        where('dayKey', '==', dayKey),
        orderBy('createdAt', 'desc')
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
  async getByClientId(clientId) {
    try {
      const historyRef = collection(db, 'workoutHistory');
      const q = query(
        historyRef,
        where('clientId', '==', clientId),
        orderBy('createdAt', 'desc')
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
