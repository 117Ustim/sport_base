import { 
  doc, 
  getDoc, 
  setDoc,
  collection,
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../config';

// НОВАЯ СТРУКТУРА: коллекция gyms (каждый зал = отдельный документ)
const COLLECTION_NAME = 'gyms';

export const gymsService = {
  // Получить все залы (НОВАЯ СТРУКТУРА)
  async getAll() {
    try {
      const gymsRef = collection(db, COLLECTION_NAME);
      const snapshot = await getDocs(gymsRef);
      
      const gyms = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          Label: data.name || '' // Для совместимости
        };
      });
      
      return gyms;
    } catch (error) {
      console.error('Error getting gyms:', error);
      throw error;
    }
  },

  // Создать новый зал (НОВАЯ СТРУКТУРА)
  async create(name) {
    try {
      const newId = Date.now().toString();
      const docRef = doc(db, COLLECTION_NAME, newId);
      
      const newGym = {
        id: newId,
        name: name,
        createdAt: new Date().toISOString()
      };
      
      await setDoc(docRef, newGym);
      
      return {
        id: newId,
        name: name,
        Label: name
      };
    } catch (error) {
      console.error('Error creating gym:', error);
      throw error;
    }
  },

  // Обновить зал (НОВАЯ СТРУКТУРА)
  async update(id, name) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      
      await setDoc(docRef, {
        name: name,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      return { id, name };
    } catch (error) {
      console.error('Error updating gym:', error);
      throw error;
    }
  },

  // Удалить зал (НОВАЯ СТРУКТУРА)
  async delete(id) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
      
      return true;
    } catch (error) {
      console.error('Error deleting gym:', error);
      throw error;
    }
  }
};
