import { 
  collection, 
  doc, 
  getDocs, 
  addDoc,
  query,
  where
} from 'firebase/firestore';
import { db } from '../config';

const COLLECTION_NAME = 'trainingWeeks';

export const trainingWeeksService = {
  // Получить недели тренировки
  async getByTrainingId(trainingId) {
    try {
      const weeksRef = collection(db, COLLECTION_NAME);
      const q = query(weeksRef, where('trainingId', '==', trainingId));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting training weeks:', error);
      throw error;
    }
  },

  // Создать неделю тренировки
  async create(weekData) {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        name: weekData.name,
        trainingId: weekData.clientId // в оригинале clientId это trainingId
      });
      return { 
        id: docRef.id, 
        ...weekData 
      };
    } catch (error) {
      console.error('Error creating training week:', error);
      throw error;
    }
  }
};
