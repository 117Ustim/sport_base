import { 
  collection, 
  doc, 
  getDocs, 
  setDoc,
  getDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit
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
  // ✅ ОПТИМИЗИРОВАНО: Добавлен limit + orderBy на сервере
  async getByClientId(clientId, limitCount = 20) {
    try {
      const workoutsRef = collection(db, 'workouts');
      const q = query(
        workoutsRef, 
        where('clientId', '==', clientId),
        orderBy('createdAt', 'desc'), // ✅ Сортировка на сервере (от новых к старым)
        limit(limitCount) // ✅ Ограничение количества
      );
      const snapshot = await getDocs(q);
      
      const workouts = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id, // ID документа из Firebase (всегда строка)
          ...data
        };
      });
      
      // ✅ Сортировка уже не нужна - данные приходят отсортированными!
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
      
      if (!snapshot.exists()) {
        return null;
      }
      
      const data = {
        id: snapshot.id,
        ...snapshot.data()
      };
      
      // ✅ НОВАЯ СТРУКТУРА: Загружаем weeks из subcollection
      if (data.totalWeeks && !data.weeks) {
        console.log(`[workoutsService] Загружаем ${data.totalWeeks} недель из subcollection`);
        
        const weeksRef = collection(db, 'workouts', workoutId, 'weeks');
        const weeksSnapshot = await getDocs(weeksRef);
        
        const weeks = [];
        weeksSnapshot.docs.forEach(weekDoc => {
          weeks.push(weekDoc.data());
        });
        
        // Сортируем по weekNumber
        weeks.sort((a, b) => a.weekNumber - b.weekNumber);
        
        data.weeks = weeks;
        console.log(`[workoutsService] Загружено ${weeks.length} недель`);
      }
      
      return data;
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
      const { id, weeks, ...dataWithoutId } = cleanedWorkout;
      
      const data = {
        name: dataWithoutId.name,
        clientId: dataWithoutId.clientId,
        totalWeeks: weeks ? weeks.length : 0, // ✅ НОВОЕ: totalWeeks вместо weeks
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Сохраняем основной документ
      await setDoc(workoutRef, data);
      
      // ✅ НОВАЯ СТРУКТУРА: Сохраняем weeks в subcollection
      if (weeks && Array.isArray(weeks) && weeks.length > 0) {
        console.log(`[workoutsService] Сохраняем ${weeks.length} недель в subcollection`);
        
        for (const week of weeks) {
          const weekRef = doc(db, 'workouts', workoutId, 'weeks', String(week.weekNumber));
          const weekData = {
            weekNumber: week.weekNumber,
            days: week.days || {},
            dates: week.dates || {}
          };
          await setDoc(weekRef, weekData);
        }
        
        console.log(`[workoutsService] Все недели сохранены`);
      }
      
      return {
        id: workoutId,
        ...data,
        weeks: weeks || [] // Возвращаем weeks для обратной совместимости
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
      
      // Создаем объект данных БЕЗ поля id и weeks
      const { id, weeks, ...dataWithoutId } = cleanedWorkout;
      
      const data = {
        name: dataWithoutId.name,
        clientId: dataWithoutId.clientId,
        totalWeeks: weeks ? weeks.length : 0, // ✅ НОВОЕ: totalWeeks вместо weeks
        updatedAt: new Date().toISOString()
      };
      
      // Обновляем основной документ
      await setDoc(workoutRef, data, { merge: true });
      
      // ✅ НОВАЯ СТРУКТУРА: Обновляем weeks в subcollection
      if (weeks && Array.isArray(weeks) && weeks.length > 0) {
        console.log(`[workoutsService] Обновляем ${weeks.length} недель в subcollection`);
        
        // Удаляем старые недели
        const weeksRef = collection(db, 'workouts', idString, 'weeks');
        const oldWeeksSnapshot = await getDocs(weeksRef);
        const deletePromises = oldWeeksSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        
        // Сохраняем новые недели
        for (const week of weeks) {
          const weekRef = doc(db, 'workouts', idString, 'weeks', String(week.weekNumber));
          const weekData = {
            weekNumber: week.weekNumber,
            days: week.days || {},
            dates: week.dates || {}
          };
          await setDoc(weekRef, weekData);
        }
        
        console.log(`[workoutsService] Все недели обновлены`);
      }
      
      return {
        id: idString,
        ...data,
        weeks: weeks || [] // Возвращаем weeks для обратной совместимости
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
      
      if (process.env.NODE_ENV === 'development') {
        console.warn('Deleting workout with ID:', idString);
      }
      
      // ✅ НОВАЯ СТРУКТУРА: Удаляем subcollection weeks
      try {
        const weeksRef = collection(db, 'workouts', idString, 'weeks');
        const weeksSnapshot = await getDocs(weeksRef);
        
        if (weeksSnapshot.size > 0) {
          console.log(`[workoutsService] Удаляем ${weeksSnapshot.size} недель из subcollection`);
          const deletePromises = weeksSnapshot.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(deletePromises);
        }
      } catch (error) {
        console.warn('[workoutsService] Error deleting weeks subcollection:', error);
      }
      
      // Удаляем основной документ
      const workoutRef = doc(db, 'workouts', idString);
      await deleteDoc(workoutRef);
      
      if (process.env.NODE_ENV === 'development') {
        console.warn('Workout deleted successfully:', idString);
      }
      
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
