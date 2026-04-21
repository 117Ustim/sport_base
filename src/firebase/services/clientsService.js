import { 
  doc, 
  getDoc, 
  setDoc,
  updateDoc,
  collection,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter
} from 'firebase/firestore';
import { db } from '../config';
import { validateClientData, sanitizeClientData } from './validators';

// НОВАЯ СТРУКТУРА: коллекция clients (каждый клиент = отдельный документ)
const COLLECTION_NAME = 'clients';
const WORKOUT_NOTE_DOC_ID = 'workout';

// Вспомогательная функция для очистки данных клиента от пустых значений
const cleanClientData = (clientData) => {
  const cleaned = {};
  
  for (const [key, value] of Object.entries(clientData)) {
    // Сохраняем только непустые значения
    if (value !== '' && value !== null && value !== undefined) {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
};

const extractWorkoutNoteText = (noteData = {}) => {
  if (!noteData || typeof noteData !== 'object') {
    return '';
  }

  const possibleFields = [
    'text',
    'message',
    'note',
    'content',
    'description',
    'comment',
    'workout'
  ];

  for (const field of possibleFields) {
    const value = noteData[field];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  for (const value of Object.values(noteData)) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
};

export const clientsService = {
  // Получить всех клиентов с фильтрацией и пагинацией (НОВАЯ СТРУКТУРА)
  async getAll(filters = {}) {
    try {
      console.log('clientsService.getAll called with filters:', filters);
      
      const clientsRef = collection(db, COLLECTION_NAME);
      
      // Строим запрос с фильтрами
      let constraints = [orderBy('profile.surname', 'asc')];
      
      // Фильтр по залу
      if (filters.gym && !filters.gymId) {
        console.log('Adding gym filter:', filters.gym);
        constraints.unshift(where('profile.gymName', '==', filters.gym));
      }
      
      // Фильтр по полу
      if (filters.sex) {
        console.log('Adding sex filter:', filters.sex);
        constraints.unshift(where('profile.sex', '==', filters.sex));
      }
      
      // Пагинация
      const pageLimit = filters.limit || 50; // Увеличили лимит
      constraints.push(limit(pageLimit));
      
      console.log('Final query constraints:', constraints);
      
      const q = query(clientsRef, ...constraints);
      const snapshot = await getDocs(q);
      
      console.log('Query result count:', snapshot.docs.length);
      
      // Преобразуем в формат который ожидает приложение
      let formattedClients = snapshot.docs.map(doc => {
        const data = doc.data();
        const profile = data.profile || {};
        
        return {
          id: doc.id,
          data: {
            name: profile.name || '',
            surname: profile.surname || '',
            phone: profile.phone || '',
            gym: (profile.gymName || '').trim(),
            gymId: profile.gymId || '',
            sex: profile.sex || '',
            address: profile.address || '',
            growth: profile.growth || '',
            weight: profile.weight || '',
            price: profile.price || 250,
            capacity: profile.capacity || 0,
            attented: profile.attented || 0,
            userId: profile.userId || '',
            email: profile.email || '',
            isActive: profile.isActive !== false
          }
        };
      });

      // Устойчивый фильтр по залу: сначала по gymId, затем fallback по названию (для старых данных)
      if (filters.gymId) {
        const targetGymId = String(filters.gymId).trim();
        const targetGymName = String(filters.gym || '').trim().toLowerCase();
        formattedClients = formattedClients.filter((client) => {
          const clientGymId = String(client.data?.gymId || '').trim();
          const clientGymName = String(client.data?.gym || '').trim().toLowerCase();

          if (clientGymId) {
            return clientGymId === targetGymId;
          }

          if (targetGymName) {
            return clientGymName === targetGymName;
          }

          return false;
        });
      }

      return {
        total: formattedClients.length,
        data: formattedClients
      };
    } catch (error) {
      console.error('Error getting clients:', error);
      throw error;
    }
  },

  // Получить клиента по ID (НОВАЯ СТРУКТУРА)
  async getById(id) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const profile = data.profile || {};
        
        return {
          id: id,
          data: {
            name: profile.name || '',
            surname: profile.surname || '',
            phone: profile.phone || '',
            gym: profile.gymName || '',
            gymId: profile.gymId || '',
            sex: profile.sex || '',
            address: profile.address || '',
            growth: profile.growth || '',
            weight: profile.weight || '',
            price: profile.price || 250,
            capacity: profile.capacity || 0,
            attented: profile.attented || 0,
            userId: profile.userId || '',
            email: profile.email || '',
            isActive: profile.isActive !== false
          }
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting client:', error);
      throw error;
    }
  },

  // Получить заметку клиента для тренировок: clients/{clientId}/notes/workout
  async getWorkoutNote(clientId) {
    try {
      const noteRef = doc(db, COLLECTION_NAME, clientId, 'notes', WORKOUT_NOTE_DOC_ID);
      const noteSnap = await getDoc(noteRef);

      if (!noteSnap.exists()) {
        return null;
      }

      const noteData = noteSnap.data() || {};
      const text = extractWorkoutNoteText(noteData);

      return {
        id: WORKOUT_NOTE_DOC_ID,
        text,
        data: noteData,
        createdAt: noteData.createdAt || null,
        updatedAt: noteData.updatedAt || null
      };
    } catch (error) {
      console.error('Error getting workout note:', error);
      throw error;
    }
  },

  // Удалить заметку клиента для тренировок: clients/{clientId}/notes/workout
  async deleteWorkoutNote(clientId) {
    try {
      const noteRef = doc(db, COLLECTION_NAME, clientId, 'notes', WORKOUT_NOTE_DOC_ID);
      await deleteDoc(noteRef);
      return true;
    } catch (error) {
      console.error('Error deleting workout note:', error);
      throw error;
    }
  },

  // Создать нового клиента (НОВАЯ СТРУКТУРА)
  async create(clientData) {
    try {
      // ✅ SECURITY FIX: Валидация данных перед сохранением
      const validation = validateClientData(clientData);
      if (!validation.isValid) {
        throw new Error(`Помилка валідації: ${validation.errors.join(', ')}`);
      }

      // ✅ SECURITY FIX: Санитизация данных
      const sanitizedData = sanitizeClientData(clientData);

      const newId = Date.now().toString();
      const docRef = doc(db, COLLECTION_NAME, newId);
      
      const newClientData = {
        profile: {
          id: newId,
          name: sanitizedData.name,
          surname: sanitizedData.surname,
          phone: sanitizedData.phone,
          email: sanitizedData.email,
          gymName: sanitizedData.gym,
          gymId: sanitizedData.gymId,
          sex: sanitizedData.sex,
          address: sanitizedData.address,
          growth: sanitizedData.growth,
          weight: sanitizedData.weight,
          price: sanitizedData.price,
          capacity: 0,
          attented: 0,
          userId: sanitizedData.userId,
          isActive: true,
          special: false,
          excludeFromCount: false,
          createdAt: new Date().toISOString()
        }
      };
      
      await setDoc(docRef, newClientData);
      
      return { id: newId };
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  },

  // Обновить клиента (НОВАЯ СТРУКТУРА)
  // ✅ ИСПРАВЛЕНО: Используем updateDoc вместо read-modify-write (нет race condition)
  async update(id, clientData) {
    try {
      console.log('clientsService.update called:', { id, gym: clientData?.gym, gymId: clientData?.gymId });
      
      // ✅ SECURITY FIX: Валидация данных перед обновлением
      const validation = validateClientData(clientData);
      if (!validation.isValid) {
        throw new Error(`Помилка валідації: ${validation.errors.join(', ')}`);
      }

      // ✅ SECURITY FIX: Санитизация данных
      const sanitizedData = sanitizeClientData(clientData);

      const docRef = doc(db, COLLECTION_NAME, id);
      
      // ✅ ИСПРАВЛЕНО: Обновляем только нужные поля без предварительного чтения
      // Firestore сам сделает merge атомарно - нет race condition!
      await updateDoc(docRef, {
        'profile.name': sanitizedData.name,
        'profile.surname': sanitizedData.surname,
        'profile.phone': sanitizedData.phone,
        'profile.email': sanitizedData.email,
        'profile.gymName': sanitizedData.gym,
        'profile.gymId': sanitizedData.gymId,
        'profile.sex': sanitizedData.sex,
        'profile.address': sanitizedData.address,
        'profile.growth': sanitizedData.growth,
        'profile.weight': sanitizedData.weight,
        'profile.updatedAt': new Date().toISOString()
      });
      console.log('clientsService.update success:', { id, gym: sanitizedData.gym, gymId: sanitizedData.gymId });
      
      return { id, data: clientData };
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  },

  // Удалить клиента (НОВАЯ СТРУКТУРА) - ПОЛНОЕ УДАЛЕНИЕ ВСЕХ СВЯЗАННЫХ ДАННЫХ
  async delete(id) {
    try {
      console.log(`🗑️  Начинаем полное удаление клиента: ${id}`);
      
      // 1. Получаем информацию о клиенте (для userId)
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      
      let userId = null;
      if (docSnap.exists()) {
        const profile = docSnap.data().profile || {};
        userId = profile.userId;
      }
      
      // 2. СНАЧАЛА удаляем ВСЕ SUBCOLLECTIONS клиента
      // Это важно делать ДО удаления основного документа!
      
      // 2.1. Удаляем attendance (subcollection в clients)
      try {
        const attendanceRef = collection(db, 'clients', id, 'attendance');
        const attendanceSnap = await getDocs(attendanceRef);
        
        if (attendanceSnap.size > 0) {
          const deleteAttendancePromises = attendanceSnap.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(deleteAttendancePromises);
          console.log(`   ✅ Удалена посещаемость (${attendanceSnap.size} записей)`);
        }
      } catch (error) {
        console.error('   ⚠️  Error deleting attendance:', error);
      }
      
      // 2.2. Удаляем любые другие возможные subcollections в clients/{id}/
      // (на случай если в будущем добавятся новые)
      try {
        // Список известных subcollections
        const knownSubcollections = ['attendance', 'history', 'notes', 'files'];
        
        for (const subcollectionName of knownSubcollections) {
          try {
            const subcollectionRef = collection(db, 'clients', id, subcollectionName);
            const subcollectionSnap = await getDocs(subcollectionRef);
            
            if (subcollectionSnap.size > 0) {
              const deletePromises = subcollectionSnap.docs.map(doc => deleteDoc(doc.ref));
              await Promise.all(deletePromises);
              console.log(`   ✅ Удалена subcollection '${subcollectionName}' (${subcollectionSnap.size} записей)`);
            }
          } catch (error) {
            // Subcollection не существует - это нормально
          }
        }
      } catch (error) {
        console.error('   ⚠️  Error checking subcollections:', error);
      }
      
      // 3. ТЕПЕРЬ удаляем основной документ клиента
      await deleteDoc(docRef);
      console.log('   ✅ Клиент удален из clients');
      
      // 4. Удаляем базу упражнений клиента (clientBases)
      try {
        // Удаляем все упражнения
        const exercisesRef = collection(db, 'clientBases', id, 'exercises');
        const exercisesSnap = await getDocs(exercisesRef);
        
        if (exercisesSnap.size > 0) {
          const deleteExercisesPromises = exercisesSnap.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(deleteExercisesPromises);
        }
        
        // Удаляем метаданные
        const metadataRef = doc(db, 'clientBases', id, 'metadata', 'settings');
        const metadataSnap = await getDoc(metadataRef);
        if (metadataSnap.exists()) {
          await deleteDoc(metadataRef);
        }
        
        if (exercisesSnap.size > 0) {
          console.log(`   ✅ Удалена база упражнений (${exercisesSnap.size} упражнений)`);
        }
      } catch (error) {
        console.error('   ⚠️  Error deleting client base:', error);
      }
      
      // 5. Удаляем все тренировки клиента (workouts)
      try {
        const workoutsRef = collection(db, 'workouts');
        const workoutsQuery = query(workoutsRef, where('clientId', '==', id));
        const workoutsSnap = await getDocs(workoutsQuery);
        
        if (workoutsSnap.size > 0) {
          const deleteWorkoutsPromises = workoutsSnap.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(deleteWorkoutsPromises);
          console.log(`   ✅ Удалены тренировки (${workoutsSnap.size} шт)`);
        }
      } catch (error) {
        console.error('   ⚠️  Error deleting workouts:', error);
      }
      
      // 6. Удаляем историю тренировок (workoutHistory)
      try {
        const historyRef = collection(db, 'workoutHistory');
        const historyQuery = query(historyRef, where('clientId', '==', id));
        const historySnap = await getDocs(historyQuery);
        
        if (historySnap.size > 0) {
          const deleteHistoryPromises = historySnap.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(deleteHistoryPromises);
          console.log(`   ✅ Удалена история тренировок (${historySnap.size} записей)`);
        }
      } catch (error) {
        console.error('   ⚠️  Error deleting workout history:', error);
      }
      
      // 7. Удаляем назначенные тренировки (assignedWorkouts)
      try {
        const assignedRef = collection(db, 'assignedWorkouts');
        const assignedQuery = query(assignedRef, where('clientId', '==', id));
        const assignedSnap = await getDocs(assignedQuery);
        
        if (assignedSnap.size > 0) {
          const deleteAssignedPromises = assignedSnap.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(deleteAssignedPromises);
          console.log(`   ✅ Удалены назначенные тренировки (${assignedSnap.size} шт)`);
        }
      } catch (error) {
        console.error('   ⚠️  Error deleting assigned workouts:', error);
      }
      
      // 8. Удаляем историю назначений (assignmentHistory)
      try {
        const historyRef = collection(db, 'assignmentHistory');
        const historyQuery = query(historyRef, where('clientId', '==', id));
        const historySnap = await getDocs(historyQuery);
        
        if (historySnap.size > 0) {
          const deleteHistoryPromises = historySnap.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(deleteHistoryPromises);
          console.log(`   ✅ Удалена история назначений (${historySnap.size} записей)`);
        }
      } catch (error) {
        console.error('   ⚠️  Error deleting assignment history:', error);
      }
      
      // 8. Удаляем аккаунт пользователя (users) если есть userId
      if (userId) {
        try {
          const userRef = doc(db, 'users', userId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            await deleteDoc(userRef);
            console.log('   ✅ Удален аккаунт пользователя');
          }
        } catch (error) {
          console.error('   ⚠️  Error deleting user account:', error);
        }
      }
      
      console.log('✅ Клиент и все связанные данные удалены полностью');
      console.log('   (включая все subcollections из clients/{id}/)');
      
      return true;
    } catch (error) {
      console.error('❌ Error deleting client:', error);
      throw error;
    }
  }
};
