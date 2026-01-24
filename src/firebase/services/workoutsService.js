import { 
  collection, 
  doc, 
  getDocs, 
  setDoc,
  getDoc,
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import { db } from '../config';

export const workoutsService = {
  // Получить все тренировки клиента
  async getByClientId(clientId) {
    try {
      const workoutsRef = collection(db, 'workouts');
      const q = query(
        workoutsRef, 
        where('clientId', '==', clientId)
      );
      const snapshot = await getDocs(q);
      
      const workouts = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id, // ID документа из Firebase (всегда строка)
          ...data
        };
      });
      
      console.log('workoutsService.getByClientId - loaded workouts:', workouts);
      
      // Сортируем на клиенте
      workouts.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB - dateA; // от новых к старым
      });
      
      return workouts;
    } catch (error) {
      console.error('Error getting workouts:', error);
      throw error;
    }
  },

  // Получить одну тренировку по ID
  async getById(workoutId) {
    try {
      console.log('workoutsService.getById - searching for:', workoutId);
      const workoutRef = doc(db, 'workouts', workoutId);
      const snapshot = await getDoc(workoutRef);
      
      console.log('workoutsService.getById - snapshot exists:', snapshot.exists());
      
      if (snapshot.exists()) {
        const data = {
          id: snapshot.id,
          ...snapshot.data()
        };
        console.log('workoutsService.getById - found workout:', data);
        return data;
      }
      
      console.log('workoutsService.getById - workout not found');
      return null;
    } catch (error) {
      console.error('Error getting workout:', error);
      throw error;
    }
  },

  // Создать новую тренировку
  async create(workoutData) {
    try {
      // Используем ID из workoutData если он есть, иначе создаем новый
      const workoutId = workoutData.id ? String(workoutData.id) : `workout_${Date.now()}`;
      const workoutRef = doc(db, 'workouts', workoutId);
      
      // Создаем объект данных БЕЗ поля id (id будет в самом документе)
      const { id, ...dataWithoutId } = workoutData;
      
      const data = {
        name: dataWithoutId.name,
        clientId: dataWithoutId.clientId,
        weeks: dataWithoutId.weeks || [], // Массив недель
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log('workoutsService.create - saving workout with ID:', workoutId);
      console.log('workoutsService.create - data:', data);
      
      await setDoc(workoutRef, data);
      
      return {
        id: workoutId,
        ...data
      };
    } catch (error) {
      console.error('Error creating workout:', error);
      throw error;
    }
  },

  // Обновить тренировку
  async update(workoutId, workoutData) {
    try {
      const idString = String(workoutId);
      const workoutRef = doc(db, 'workouts', idString);
      
      // Создаем объект данных БЕЗ поля id
      const { id, ...dataWithoutId } = workoutData;
      
      const data = {
        name: dataWithoutId.name,
        clientId: dataWithoutId.clientId,
        weeks: dataWithoutId.weeks || [],
        updatedAt: new Date().toISOString()
      };
      
      console.log('workoutsService.update - updating workout:', idString, data);
      
      await setDoc(workoutRef, data, { merge: true });
      
      return {
        id: idString,
        ...data
      };
    } catch (error) {
      console.error('Error updating workout:', error);
      throw error;
    }
  },

  // Удалить тренировку
  async delete(workoutId) {
    try {
      // Преобразуем в строку, так как ID в Firebase всегда строки
      const idString = String(workoutId);
      console.log('workoutsService.delete - deleting workout:', idString);
      
      const workoutRef = doc(db, 'workouts', idString);
      await deleteDoc(workoutRef);
      
      console.log('workoutsService.delete - workout deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting workout:', error);
      throw error;
    }
  },

  // Сохранить несколько тренировок
  async createMultiple(workoutsArray) {
    try {
      const promises = workoutsArray.map(workout => this.create(workout));
      const results = await Promise.all(promises);
      return results;
    } catch (error) {
      console.error('Error creating multiple workouts:', error);
      throw error;
    }
  }
};
