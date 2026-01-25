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

// Вспомогательная функция для очистки exerciseData от пустых значений
const cleanExerciseData = (exerciseData) => {
  if (!exerciseData || typeof exerciseData !== 'object') {
    return {};
  }
  
  const cleaned = {};
  for (const [key, value] of Object.entries(exerciseData)) {
    if (value !== '' && value !== null && value !== undefined) {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
};

// Очистить упражнение от пустых данных
const cleanExercise = (exercise) => {
  if (exercise.exerciseData) {
    return {
      ...exercise,
      exerciseData: cleanExerciseData(exercise.exerciseData)
    };
  }
  return exercise;
};

// Очистить все упражнения в тренировке
const cleanWorkoutExercises = (workout) => {
  if (!workout.weeks || !Array.isArray(workout.weeks)) {
    return workout;
  }
  
  const cleanedWeeks = workout.weeks.map(week => {
    if (!week.days) return week;
    
    const cleanedDays = {};
    for (const [dayKey, dayData] of Object.entries(week.days)) {
      if (dayData.exercises && Array.isArray(dayData.exercises)) {
        cleanedDays[dayKey] = {
          ...dayData,
          exercises: dayData.exercises.map(ex => {
            if (ex.type === 'group' && ex.exercises) {
              // Группа упражнений
              return {
                ...ex,
                exercises: ex.exercises.map(cleanExercise)
              };
            }
            // Одиночное упражнение
            return cleanExercise(ex);
          })
        };
      } else {
        cleanedDays[dayKey] = dayData;
      }
    }
    
    return {
      ...week,
      days: cleanedDays
    };
  });
  
  return {
    ...workout,
    weeks: cleanedWeeks
  };
};

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
      const workoutRef = doc(db, 'workouts', workoutId);
      const snapshot = await getDoc(workoutRef);
      
      if (snapshot.exists()) {
        const data = {
          id: snapshot.id,
          ...snapshot.data()
        };
        return data;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting workout:', error);
      throw error;
    }
  },

  // Создать новую тренировку
  async create(workoutData) {
    try {
      // Очищаем exerciseData от пустых значений
      const cleanedWorkout = cleanWorkoutExercises(workoutData);
      
      // Используем ID из workoutData если он есть, иначе создаем новый
      const workoutId = cleanedWorkout.id ? String(cleanedWorkout.id) : `workout_${Date.now()}`;
      const workoutRef = doc(db, 'workouts', workoutId);
      
      // Создаем объект данных БЕЗ поля id (id будет в самом документе)
      const { id, ...dataWithoutId } = cleanedWorkout;
      
      const data = {
        name: dataWithoutId.name,
        clientId: dataWithoutId.clientId,
        weeks: dataWithoutId.weeks || [], // Массив недель
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
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
      // Очищаем exerciseData от пустых значений
      const cleanedWorkout = cleanWorkoutExercises(workoutData);
      
      const idString = String(workoutId);
      const workoutRef = doc(db, 'workouts', idString);
      
      // Создаем объект данных БЕЗ поля id
      const { id, ...dataWithoutId } = cleanedWorkout;
      
      const data = {
        name: dataWithoutId.name,
        clientId: dataWithoutId.clientId,
        weeks: dataWithoutId.weeks || [],
        updatedAt: new Date().toISOString()
      };
      
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
      
      console.log('Deleting workout with ID:', idString);
      
      const workoutRef = doc(db, 'workouts', idString);
      await deleteDoc(workoutRef);
      
      console.log('Workout deleted successfully:', idString);
      
      return true;
    } catch (error) {
      console.error('Error deleting workout:', error);
      console.error('Workout ID that failed to delete:', workoutId);
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
