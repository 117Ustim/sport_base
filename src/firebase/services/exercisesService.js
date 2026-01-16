import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import { db } from '../config';

const COLLECTION_NAME = 'exercises';

export const exercisesService = {
  // Получить все упражнения
  async getAll() {
    try {
      const exercisesRef = collection(db, COLLECTION_NAME);
      const snapshot = await getDocs(exercisesRef);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting exercises:', error);
      throw error;
    }
  },

  // Получить упражнения по полу
  async getBySex(sex) {
    try {
      const exercisesRef = collection(db, COLLECTION_NAME);
      const q = query(exercisesRef, where('sex', '==', sex));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting exercises by sex:', error);
      throw error;
    }
  },

  // Создать новое упражнение
  async create(exerciseData) {
    try {
      const dataToSave = {
        name: exerciseData.name,
        categoryId: exerciseData.categoryId
      };

      // Добавляем clientId только если он есть
      if (exerciseData.clientId) {
        dataToSave.clientId = exerciseData.clientId;
      }

      const docRef = await addDoc(collection(db, COLLECTION_NAME), dataToSave);
      return { id: docRef.id, ...exerciseData };
    } catch (error) {
      console.error('Error creating exercise:', error);
      throw error;
    }
  },

  // Удалить упражнение
  async delete(id) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error deleting exercise:', error);
      throw error;
    }
  }
};
