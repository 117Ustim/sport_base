import { 
  collection, 
  doc, 
  getDocs, 
  setDoc,
  query,
  where
} from 'firebase/firestore';
import { db } from '../config';
import { exercisesService } from './exercisesService';

// Пустые данные для упражнения (15 полей)
const EMPTY_EXERCISE_DATA = {
  1: "", 2: "", 3: "", 4: "", 5: "",
  6: "", 7: "", 8: "", 9: "", 10: "",
  11: "", 12: "", 13: "", 14: "", 15: ""
};

export const clientBaseService = {
  // Получить базу клиента (все упражнения с данными)
  async getByClientId(clientId) {
    try {
      const baseRef = collection(db, 'clientBases', clientId, 'exercises');
      const snapshot = await getDocs(baseRef);
      
      return snapshot.docs.map(doc => ({
        exercise_id: doc.id,
        data: doc.data().data,
        name: doc.data().name,
        category_id: doc.data().categoryId
      }));
    } catch (error) {
      console.error('Error getting client base:', error);
      throw error;
    }
  },

  // Создать новую базу для клиента
  async createBase(clientId) {
    try {
      // Получаем все упражнения
      const exercises = await exercisesService.getAll();
      
      // Создаём документы для каждого упражнения
      for (const exercise of exercises) {
        const exerciseRef = doc(db, 'clientBases', clientId, 'exercises', exercise.id);
        await setDoc(exerciseRef, {
          name: exercise.name,
          categoryId: exercise.categoryId,
          data: EMPTY_EXERCISE_DATA
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error creating client base:', error);
      throw error;
    }
  },

  // Обновить данные упражнений клиента
  async updateBase(clientId, exercises) {
    try {
      for (const exercise of exercises) {
        const exerciseRef = doc(db, 'clientBases', clientId, 'exercises', exercise.exercise_id);
        await setDoc(exerciseRef, {
          name: exercise.name,
          categoryId: exercise.category_id,
          data: exercise.data
        }, { merge: true });
      }
      
      return true;
    } catch (error) {
      console.error('Error updating client base:', error);
      throw error;
    }
  }
};
