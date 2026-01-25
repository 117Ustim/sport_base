import { 
  collection, 
  doc, 
  getDocs, 
  setDoc,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../config';
import { exercisesService } from './exercisesService';

// Вспомогательная функция для очистки данных от пустых значений
const cleanExerciseData = (data) => {
  if (!data || typeof data !== 'object') {
    return {};
  }
  
  const cleaned = {};
  for (const [key, value] of Object.entries(data)) {
    // Сохраняем только непустые значения
    if (value !== '' && value !== null && value !== undefined) {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
};

export const clientBaseService = {
  // Получить метаданные базы клиента (columnCount и т.д.)
  async getMetadata(clientId) {
    try {
      const metadataRef = doc(db, 'clientBases', clientId, 'metadata', 'settings');
      const snapshot = await getDoc(metadataRef);
      
      if (snapshot.exists()) {
        return snapshot.data();
      }
      
      return { columnCount: 15 }; // По умолчанию 15 колонок
    } catch (error) {
      console.error('Error getting metadata:', error);
      return { columnCount: 15 };
    }
  },

  // Сохранить метаданные базы клиента
  async saveMetadata(clientId, metadata) {
    try {
      const metadataRef = doc(db, 'clientBases', clientId, 'metadata', 'settings');
      await setDoc(metadataRef, metadata, { merge: true });
      return true;
    } catch (error) {
      console.error('Error saving metadata:', error);
      throw error;
    }
  },

  // Получить базу клиента (все упражнения с данными)
  async getByClientId(clientId) {
    try {
      const baseRef = collection(db, 'clientBases', clientId, 'exercises');
      const snapshot = await getDocs(baseRef);
      
      const exercises = snapshot.docs.map(doc => ({
        exercise_id: doc.id,
        data: doc.data().data,
        name: doc.data().name,
        category_id: doc.data().categoryId,
        order: doc.data().order !== undefined ? doc.data().order : 999999 // Для старых записей без order
      }));
      
      // Сортируем по order
      exercises.sort((a, b) => a.order - b.order);
      
      return exercises;
    } catch (error) {
      console.error('Error getting client base:', error);
      throw error;
    }
  },

  // Создать новую базу для клиента
  async createBase(clientId) {
    try {
      // Получаем все упражнения с их порядком
      const exercises = await exercisesService.getAll();
      
      // Создаём документы для каждого упражнения
      for (const exercise of exercises) {
        const exerciseRef = doc(db, 'clientBases', clientId, 'exercises', exercise.id);
        await setDoc(exerciseRef, {
          name: exercise.name,
          categoryId: exercise.categoryId,
          data: {}, // Пустой объект вместо заполненного пустыми строками
          order: exercise.order !== undefined ? exercise.order : 999999
        });
      }
      
      // Сохраняем метаданные
      await this.saveMetadata(clientId, { columnCount: 15 });
      
      return true;
    } catch (error) {
      console.error('Error creating client base:', error);
      throw error;
    }
  },

  // Обновить данные упражнений клиента
  async updateBase(clientId, exercises, columns) {
    try {
      // Сохраняем упражнения
      for (const exercise of exercises) {
        const exerciseRef = doc(db, 'clientBases', clientId, 'exercises', exercise.exercise_id);
        
        // Очищаем данные от пустых значений
        const cleanedData = cleanExerciseData(exercise.data);
        
        await setDoc(exerciseRef, {
          name: exercise.name,
          categoryId: exercise.category_id,
          data: cleanedData
        }, { merge: true });
      }
      
      // Сохраняем метаданные (колонки)
      if (columns !== undefined) {
        await this.saveMetadata(clientId, { columns });
      }
      
      return true;
    } catch (error) {
      console.error('Error updating client base:', error);
      throw error;
    }
  },

  // Удалить упражнение из базы клиента
  async deleteExercise(clientId, exerciseId) {
    try {
      const exerciseRef = doc(db, 'clientBases', clientId, 'exercises', exerciseId);
      await deleteDoc(exerciseRef);
      return true;
    } catch (error) {
      console.error('Error deleting exercise:', error);
      throw error;
    }
  },

  // Добавить упражнение клиенту
  async addExerciseToClient(clientId, exercise) {
    try {
      const exerciseRef = doc(db, 'clientBases', clientId, 'exercises', exercise.id);
      
      await setDoc(exerciseRef, {
        name: exercise.name,
        categoryId: exercise.categoryId,
        data: {} // Пустой объект вместо заполненного пустыми строками
      });
      
      return true;
    } catch (error) {
      console.error('Error adding exercise to client:', error);
      throw error;
    }
  },

  // Обновить порядок упражнений (сохранить новый порядок после перетаскивания)
  async updateExercisesOrder(clientId, exercises) {
    try {
      for (let i = 0; i < exercises.length; i++) {
        const exercise = exercises[i];
        const exerciseRef = doc(db, 'clientBases', clientId, 'exercises', exercise.exercise_id);
        
        // Очищаем данные от пустых значений
        const cleanedData = cleanExerciseData(exercise.data);
        
        await setDoc(exerciseRef, {
          name: exercise.name,
          categoryId: exercise.category_id,
          data: cleanedData,
          order: i
        }, { merge: true });
      }
      
      return true;
    } catch (error) {
      console.error('Error updating exercises order:', error);
      throw error;
    }
  }
};
