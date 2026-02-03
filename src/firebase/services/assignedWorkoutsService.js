import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc,
  query,
  where,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../config';

const COLLECTION_NAME = 'assignedWorkouts';

export const assignedWorkoutsService = {
  /**
   * Отправить неделю тренировок клиенту (ОПТИМИЗИРОВАНО)
   * @param {string} clientId - ID клиента
   * @param {string} userId - Firebase Auth UID клиента
   * @param {object} weekData - Данные недели тренировок
   * @param {string} workoutName - Название тренировки
   * @param {string} workoutId - ID тренировки
   */
  async assignWeekToClient(clientId, userId, weekData, workoutName, workoutId) {
    try {
      console.log('📤 Отправляем данные недели:', weekData);
      console.log('📅 Даты в weekData:', weekData.dates);
      console.log('🆔 userId:', userId);
      console.log('🆔 clientId:', clientId);

      // 1. Сначала переносим ВСЕ старые тренировки в историю и удаляем их из активных
      // Это гарантирует, что у клиента будет только одна активная программа (Вариант А)
      console.log('🧹 Очистка старых тренировок перед назначением новой...');
      await this.deleteAllAssignmentsForUser(userId);
      
      // Генерируем уникальный ID для назначения
      const assignmentId = `${clientId}_${workoutId}_week${weekData.weekNumber}_${Date.now()}`;
      const assignmentRef = doc(db, COLLECTION_NAME, assignmentId);
      
      const assignmentData = {
        clientId,
        userId,
        workoutId,
        workoutName,
        weekNumber: weekData.weekNumber,
        weekData: weekData, // Сохраняем weekData с датами!
        assignedAt: new Date().toLocaleDateString('ru-RU', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).replace(/\//g, '.'),
        status: 'new' // new, viewed, completed
      };
      
      console.log('💾 Сохраняем в Firebase assignedWorkouts с ID:', assignmentId);
      console.log('💾 Данные для сохранения:', JSON.stringify(assignmentData, null, 2));
      
      await setDoc(assignmentRef, assignmentData);
      
      console.log('✅ УСПЕШНО сохранено в Firebase! Старые тренировки убраны в историю.');
      
      return { id: assignmentId, ...assignmentData };
    } catch (error) {
      console.error('Error assigning workout to client:', error);
      throw error;
    }
  },

  /**
   * Получить все назначенные тренировки для клиента по userId (С WEEKDATA)
   * @param {string} userId - Firebase Auth UID клиента
   */
  async getAssignedWorkoutsByUserId(userId) {
    try {
      console.log('🔍 Клиент запрашивает тренировки для userId:', userId);
      const assignmentsRef = collection(db, COLLECTION_NAME);
      const q = query(assignmentsRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);
      
      console.log('📊 Найдено записей в assignedWorkouts:', snapshot.docs.length);
      
      const assignments = [];
      
      // Для каждого назначения проверяем есть ли weekData
      for (const docSnapshot of snapshot.docs) {
        const assignment = {
          id: docSnapshot.id,
          ...docSnapshot.data()
        };
        
        console.log('📦 Assignment:', assignment.id, 'weekData есть?', !!assignment.weekData);
        
        // Если weekData уже есть в assignment (новый формат) - используем его
        if (assignment.weekData) {
          console.log('✅ weekData найден в assignment, даты:', assignment.weekData.dates);
          assignments.push(assignment);
          continue;
        }
        
        // Если нет - пытаемся получить из workouts (старый формат)
        try {
          const workoutRef = doc(db, 'workouts', assignment.workoutId);
          const workoutSnap = await getDoc(workoutRef);
          
          if (workoutSnap.exists()) {
            const workout = workoutSnap.data();
            const week = workout.weeks?.find(w => w.weekNumber === assignment.weekNumber);
            
            if (week) {
              console.log('🔍 weekData получен из workouts, даты:', week.dates);
              assignment.weekData = week;
            }
          }
        } catch (error) {
          console.error(`Error loading weekData for assignment ${assignment.id}:`, error);
        }
        
        assignments.push(assignment);
      }
      
      // Сортируем по дате назначения (новые первыми)
      assignments.sort((a, b) => {
        return b.assignedAt.localeCompare(a.assignedAt);
      });
      
      console.log('🔍 Отправляем клиенту assignments:', assignments.length);
      return assignments;
    } catch (error) {
      console.error('Error getting assigned workouts:', error);
      throw error;
    }
  },

  /**
   * Получить все назначенные тренировки для клиента по clientId (С WEEKDATA)
   * @param {string} clientId - ID клиента
   */
  async getAssignedWorkoutsByClientId(clientId) {
    try {
      console.log('🔍 Админ запрашивает тренировки для clientId:', clientId);
      const assignmentsRef = collection(db, COLLECTION_NAME);
      const q = query(assignmentsRef, where('clientId', '==', clientId));
      const snapshot = await getDocs(q);
      
      console.log('📊 Найдено записей в assignedWorkouts:', snapshot.docs.length);
      
      const assignments = [];
      
      // Для каждого назначения проверяем есть ли weekData
      for (const docSnapshot of snapshot.docs) {
        const assignment = {
          id: docSnapshot.id,
          ...docSnapshot.data()
        };
        
        console.log('📦 Assignment:', assignment.id, 'weekData есть?', !!assignment.weekData);
        
        // Если weekData уже есть в assignment (новый формат) - используем его
        if (assignment.weekData) {
          console.log('✅ weekData найден в assignment, даты:', assignment.weekData.dates);
          assignments.push(assignment);
          continue;
        }
        
        // Если нет - пытаемся получить из workouts (старый формат)
        try {
          const workoutRef = doc(db, 'workouts', assignment.workoutId);
          const workoutSnap = await getDoc(workoutRef);
          
          if (workoutSnap.exists()) {
            const workout = workoutSnap.data();
            const week = workout.weeks?.find(w => w.weekNumber === assignment.weekNumber);
            
            if (week) {
              console.log('🔍 weekData получен из workouts, даты:', week.dates);
              assignment.weekData = week;
            }
          }
        } catch (error) {
          console.error(`Error loading weekData for assignment ${assignment.id}:`, error);
        }
        
        assignments.push(assignment);
      }
      
      // Сортируем по дате назначения (новые первыми)
      assignments.sort((a, b) => {
        return b.assignedAt.localeCompare(a.assignedAt);
      });
      
      console.log('🔍 Отправляем админу assignments:', assignments.length);
      return assignments;
    } catch (error) {
      console.error('Error getting assigned workouts by clientId:', error);
      throw error;
    }
  },

  /**
   * Проверить была ли отправлена конкретная неделя тренировки
   * @param {string} clientId - ID клиента
   * @param {string} workoutId - ID тренировки
   * @param {number} weekNumber - Номер недели
   */
  async isWeekAssigned(clientId, workoutId, weekNumber) {
    try {
      const assignmentsRef = collection(db, COLLECTION_NAME);
      const q = query(
        assignmentsRef, 
        where('clientId', '==', clientId),
        where('workoutId', '==', workoutId),
        where('weekNumber', '==', weekNumber)
      );
      const snapshot = await getDocs(q);
      
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking if week is assigned:', error);
      throw error;
    }
  },

  /**
   * Обновить статус назначенной тренировки
   * @param {string} assignmentId - ID назначения
   * @param {string} status - Новый статус (new, viewed, completed)
   */
  async updateStatus(assignmentId, status) {
    try {
      const assignmentRef = doc(db, COLLECTION_NAME, assignmentId);
      await setDoc(assignmentRef, { status }, { merge: true });
      return true;
    } catch (error) {
      console.error('Error updating assignment status:', error);
      throw error;
    }
  },

  /**
   * Удалить назначенную тренировку
   * @param {string} assignmentId - ID назначения
   */
  async deleteAssignment(assignmentId) {
    try {
      const assignmentRef = doc(db, COLLECTION_NAME, assignmentId);
      await deleteDoc(assignmentRef);
      return true;
    } catch (error) {
      console.error('Error deleting assignment:', error);
      throw error;
    }
  },

  /**
   * Удалить все назначенные тренировки для клиента (с сохранением в историю)
   * @param {string} userId - Firebase Auth UID клиента
   */
  async deleteAllAssignmentsForUser(userId) {
    try {
      const assignmentsRef = collection(db, COLLECTION_NAME);
      const q = query(assignmentsRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);
      
      // Сохраняем в историю перед удалением
      const historyPromises = snapshot.docs.map(async (docSnapshot) => {
        const assignment = docSnapshot.data();
        
        // Создаем запись в истории
        const historyId = `history_${assignment.clientId}_${assignment.workoutId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const historyRef = doc(db, 'assignmentHistory', historyId);
        
        const historyData = {
          ...assignment,
          originalAssignmentId: docSnapshot.id,
          completedAt: new Date().toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }).replace(/\//g, '.'),
          status: 'replaced' // replaced, completed, cancelled
        };
        
        return setDoc(historyRef, historyData);
      });
      
      // Ждем сохранения истории
      await Promise.all(historyPromises);
      console.log('📚 Сохранено в историю:', historyPromises.length, 'назначений');
      
      // Удаляем все найденные документы
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      return true;
    } catch (error) {
      console.error('Error deleting all assignments for user:', error);
      throw error;
    }
  },

  /**
   * Получить историю назначений для клиента
   * @param {string} userId - Firebase Auth UID клиента
   */
  async getAssignmentHistory(userId) {
    try {
      const historyRef = collection(db, 'assignmentHistory');
      const q = query(historyRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);
      
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Сортируем по дате завершения (новые первыми)
      history.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
      
      return history;
    } catch (error) {
      console.error('Error getting assignment history:', error);
      throw error;
    }
  }
};
