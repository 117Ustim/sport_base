import { 
  collection, 
  getDocs,
  addDoc,
  doc,
  setDoc
} from 'firebase/firestore';
import { db } from '../config';

const COLLECTION_NAME = 'categories';

// Начальные категории (как в PostgreSQL)
const DEFAULT_CATEGORIES = [
  { id: '1', name: 'Ноги' },
  { id: '2', name: 'Грудь' },
  { id: '3', name: 'Спина' },
  { id: '4', name: 'Плечі' },
  { id: '5', name: 'Руки' },
  { id: '6', name: 'Аеробне' }
];

export const categoriesService = {
  // Получить все категории
  async getAll() {
    try {
      const categoriesRef = collection(db, COLLECTION_NAME);
      const snapshot = await getDocs(categoriesRef);
      
      // Если категорий нет - инициализируем
      if (snapshot.empty) {
        await this.initCategories();
        return DEFAULT_CATEGORIES;
      }
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));
    } catch (error) {
      console.error('Error getting categories:', error);
      throw error;
    }
  },

  // Инициализировать категории (один раз)
  async initCategories() {
    try {
      for (const category of DEFAULT_CATEGORIES) {
        const docRef = doc(db, COLLECTION_NAME, category.id);
        await setDoc(docRef, { name: category.name });
      }
      console.log('Categories initialized');
    } catch (error) {
      console.error('Error initializing categories:', error);
      throw error;
    }
  }
};
