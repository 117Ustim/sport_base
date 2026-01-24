import { 
  doc, 
  getDoc, 
  setDoc,
  updateDoc,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../config';

// Структура: коллекция Ustim -> документ Gyms -> массив Gyms
const COLLECTION_NAME = 'Ustim';
const DOC_NAME = 'Gyms';

export const gymsService = {
  // Получить все залы
  async getAll() {
    try {
      console.log('gymsService.getAll() called');
      const docRef = doc(db, COLLECTION_NAME, DOC_NAME);
      const docSnap = await getDoc(docRef);
      
      console.log('docSnap.exists():', docSnap.exists());
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('Raw data from Firebase:', data);
        // Массив залов находится в поле Gyms
        return data.Gyms || [];
      }
      return [];
    } catch (error) {
      console.error('Error getting gyms:', error);
      throw error;
    }
  },

  // Создать новый зал
  async create(name) {
    try {
      const docRef = doc(db, COLLECTION_NAME, DOC_NAME);
      const newGym = {
        id: Date.now().toString(),
        name: name,
        Label: name
      };
      
      await updateDoc(docRef, {
        Gyms: arrayUnion(newGym)
      });
      
      return newGym;
    } catch (error) {
      console.error('Error creating gym:', error);
      throw error;
    }
  },

  // Обновить зал
  async update(id, name) {
    try {
      // Получаем текущий список
      const gyms = await this.getAll();
      const updatedGyms = gyms.map(gym => 
        gym.id === id ? { ...gym, name, Label: name } : gym
      );
      
      const docRef = doc(db, COLLECTION_NAME, DOC_NAME);
      await setDoc(docRef, { Gyms: updatedGyms });
      
      return { id, name };
    } catch (error) {
      console.error('Error updating gym:', error);
      throw error;
    }
  },

  // Удалить зал
  async delete(id) {
    try {
      // Получаем текущий список
      const gyms = await this.getAll();
      const filteredGyms = gyms.filter(gym => gym.id !== id);
      
      const docRef = doc(db, COLLECTION_NAME, DOC_NAME);
      await setDoc(docRef, { Gyms: filteredGyms });
      
      return true;
    } catch (error) {
      console.error('Error deleting gym:', error);
      throw error;
    }
  }
};
