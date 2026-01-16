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

const COLLECTION_NAME = 'trainings';

export const trainingsService = {
  // Получить тренировки клиента
  async getByClientId(clientId) {
    try {
      const trainingsRef = collection(db, COLLECTION_NAME);
      const q = query(trainingsRef, where('clientId', '==', clientId));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting trainings:', error);
      throw error;
    }
  },

  // Создать тренировку
  async create(trainingData) {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        name: trainingData.name,
        description: trainingData.description,
        clientId: trainingData.clientId
      });
      return { 
        id: docRef.id, 
        ...trainingData 
      };
    } catch (error) {
      console.error('Error creating training:', error);
      throw error;
    }
  },

  // Удалить тренировку
  async delete(id) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error deleting training:', error);
      throw error;
    }
  }
};
