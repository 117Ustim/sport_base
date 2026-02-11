import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc,
  query,
  where,
  deleteDoc,
  orderBy,
  limit,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config';

const COLLECTION_NAME = 'assignedWorkouts';

export const assignedWorkoutsService = {
  /**
   * Отправить неделю тренировок клиенту
   * ✅ Сохраняет полные данные недели (включая упражнения с весами)
   * ✅ ИСПРАВЛЕНО: Использует batch для атомарности (нет race condition)
   * 
   * @param {string} clientId - ID клиента
   * @param {string} userId - Firebase Auth UID клиента
   * @param {object} weekData - Данные недели тренировок (weekNumber, days, dates)
   * @param {string} workoutName - Название тренировки
   * @param {string} workoutId - ID тренировки
   */
  async assignWeekToClient(clientId, userId, weekData, workoutName, workoutId) {
    try {
      console.log('📤 Отправляем ссылку на неделю тренировки');
      console.log('📅 Даты в weekData:', weekData.dates);
      console.log('🆔 userId:', userId);
      console.log('🆔 clientId:', clientId);

      // ✅ ИСПРАВЛЕНО: Используем batch для атомарности
      const batch = writeBatch(db);
      
      // 1. Получаем все старые тренировки для удаления
      const assignmentsRef = collection(db, COLLECTION_NAME);
      const q = query(assignmentsRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);
      
      console.log('🧹 Найдено старых тренировок для удаления:', snapshot.docs.length);
      
      // 2. Добавляем удаление старых тренировок в batch
      snapshot.docs.forEach((docSnapshot) => {
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
          status: 'replaced'
        };
        
        // Добавляем в batch
        batch.set(historyRef, historyData);
        batch.delete(docSnapshot.ref);
      });
      
      // 3. Генерируем ID для нового назначения
      const assignmentId = `${clientId}_${workoutId}_week${weekData.weekNumber}_${Date.now()}`;
      const assignmentRef = doc(db, COLLECTION_NAME, assignmentId);
      
      // 4. Подготавливаем данные нового назначения
      const assignmentData = {
        clientId,
        userId,
        workoutId,
        workoutName,
        weekNumber: weekData.weekNumber,
        weekData: {
          weekNumber: weekData.weekNumber,
          days: weekData.days,
          dates: weekData.dates || {}
        },
        assignedAt: new Date().toLocaleDateString('ru-RU', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).replace(/\//g, '.'),
        status: 'new'
      };
      
      // 5. Добавляем создание нового назначения в batch
      batch.set(assignmentRef, assignmentData);
      
      console.log('💾 Выполняем атомарную операцию (batch)...');
      
      // ✅ 6. Выполняем все операции атомарно
      await batch.commit();
      
      console.log('✅ УСПЕШНО! Все операции выполнены атомарно.');
      console.log('   - Старые тренировки перенесены в историю');
      console.log('   - Старые тренировки удалены');
      console.log('   - Новая тренировка назначена');
      
      return { id: assignmentId, ...assignmentData };
    } catch (error) {
      console.error('Error assigning workout to client:', error);
      throw error;
    }
  },

  /**
   * Получить все назначенные тренировки для клиента по userId
   * ✅ ОПТИМИЗИРОВАНО: Загрузка конкретной недели из subcollection + limit
   * 
   * @param {string} userId - Firebase Auth UID клиента
   * @param {number} limitCount - Максимальное количество записей (по умолчанию 10)
   */
  async getAssignedWorkoutsByUserId(userId, limitCount = 10) {
    try {
      console.log('🔍 Клиент запрашивает тренировки для userId:', userId);
      const assignmentsRef = collection(db, COLLECTION_NAME);
      const q = query(
        assignmentsRef, 
        where('userId', '==', userId),
        orderBy('assignedAt', 'desc'), // ✅ Сортировка на сервере (новые первыми)
        limit(limitCount) // ✅ Ограничение количества
      );
      const snapshot = await getDocs(q);
      
      console.log('📊 Найдено записей в assignedWorkouts:', snapshot.docs.length);
      
      const assignments = [];
      
      // Для каждого назначения загружаем weekData из workouts/weeks
      for (const docSnapshot of snapshot.docs) {
        const assignment = {
          id: docSnapshot.id,
          ...docSnapshot.data()
        };
        
        // ✅ НОВЫЙ ФОРМАТ: weekData нет, загружаем из workouts/weeks subcollection
        if (!assignment.weekData || !assignment.weekData.days) {
          console.log('📦 Assignment:', assignment.id, '- загружаем weekData из workouts/weeks');
          
          try {
            // ✅ НОВАЯ СТРУКТУРА: Загружаем конкретную неделю из subcollection
            const weekRef = doc(db, 'workouts', assignment.workoutId, 'weeks', String(assignment.weekNumber));
            const weekSnap = await getDoc(weekRef);
            
            if (weekSnap.exists()) {
              const week = weekSnap.data();
              console.log('✅ weekData загружен из workouts/weeks subcollection');
              assignment.weekData = {
                ...week,
                dates: assignment.dates || week.dates || {}
              };
            } else {
              console.warn(`Week ${assignment.weekNumber} not found in workout ${assignment.workoutId}/weeks`);
            }
          } catch (error) {
            console.error(`Error loading weekData for assignment ${assignment.id}:`, error);
          }
        } else {
          // ⚠️ СТАРЫЙ ФОРМАТ: weekData уже есть (для обратной совместимости)
          console.log('📦 Assignment:', assignment.id, '- weekData уже есть (старый формат)');
        }
        
        assignments.push(assignment);
      }
      
      // ✅ Сортировка уже не нужна - данные приходят отсортированными!
      console.log('🔍 Отправляем клиенту assignments:', assignments.length);
      return assignments;
    } catch (error) {
      console.error('Error getting assigned workouts:', error);
      throw error;
    }
  },

  /**
   * Получить все назначенные тренировки для клиента по clientId
   * ✅ ОПТИМИЗИРОВАНО: Загрузка конкретной недели из subcollection + limit
   * 
   * @param {string} clientId - ID клиента
   * @param {number} limitCount - Максимальное количество записей (по умолчанию 10)
   */
  async getAssignedWorkoutsByClientId(clientId, limitCount = 10) {
    try {
      console.log('🔍 Админ запрашивает тренировки для clientId:', clientId);
      const assignmentsRef = collection(db, COLLECTION_NAME);
      const q = query(
        assignmentsRef, 
        where('clientId', '==', clientId),
        orderBy('assignedAt', 'desc'), // ✅ Сортировка на сервере (новые первыми)
        limit(limitCount) // ✅ Ограничение количества
      );
      const snapshot = await getDocs(q);
      
      console.log('📊 Найдено записей в assignedWorkouts:', snapshot.docs.length);
      
      const assignments = [];
      
      // Для каждого назначения загружаем weekData из workouts/weeks
      for (const docSnapshot of snapshot.docs) {
        const assignment = {
          id: docSnapshot.id,
          ...docSnapshot.data()
        };
        
        // ✅ НОВЫЙ ФОРМАТ: weekData нет, загружаем из workouts/weeks subcollection
        if (!assignment.weekData || !assignment.weekData.days) {
          console.log('📦 Assignment:', assignment.id, '- загружаем weekData из workouts/weeks');
          
          try {
            // ✅ НОВАЯ СТРУКТУРА: Загружаем конкретную неделю из subcollection
            const weekRef = doc(db, 'workouts', assignment.workoutId, 'weeks', String(assignment.weekNumber));
            const weekSnap = await getDoc(weekRef);
            
            if (weekSnap.exists()) {
              const week = weekSnap.data();
              console.log('✅ weekData загружен из workouts/weeks subcollection');
              assignment.weekData = {
                ...week,
                dates: assignment.dates || week.dates || {}
              };
            } else {
              console.warn(`Week ${assignment.weekNumber} not found in workout ${assignment.workoutId}/weeks`);
            }
          } catch (error) {
            console.error(`Error loading weekData for assignment ${assignment.id}:`, error);
          }
        } else {
          // ⚠️ СТАРЫЙ ФОРМАТ: weekData уже есть (для обратной совместимости)
          console.log('📦 Assignment:', assignment.id, '- weekData уже есть (старый формат)');
        }
        
        assignments.push(assignment);
      }
      
      // ✅ Сортировка уже не нужна - данные приходят отсортированными!
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
