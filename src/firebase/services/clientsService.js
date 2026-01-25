import { 
  doc, 
  getDoc, 
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import { db } from '../config';

// Структура: коллекция Ustim -> документ People -> массив People
const COLLECTION_NAME = 'Ustim';
const DOC_NAME = 'People';

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

export const clientsService = {
  // Получить всех клиентов с фильтрацией и пагинацией
  async getAll(filters = {}) {
    try {
      const docRef = doc(db, COLLECTION_NAME, DOC_NAME);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return { total: 0, data: [] };
      }

      const rawData = docSnap.data();
      
      // Клиенты хранятся как объект с ID в качестве ключей
      let clients = Object.entries(rawData).map(([id, clientData]) => ({
        id,
        ...clientData
      }));

      // Фильтр по залу
      if (filters.gym) {
        clients = clients.filter(c => c.gymName === filters.gym);
      }

      // Фильтр по полу
      if (filters.sex) {
        clients = clients.filter(c => c.sex === filters.sex);
      }

      // Преобразуем в формат который ожидает приложение
      const formattedClients = clients.map(client => ({
        id: client.id,
        data: {
          name: client.name || '',
          surname: client.surname || '',
          phone: client.phone || '',
          gym: client.gymName || '',
          gymId: client.gymId || '',
          sex: client.sex || '',
          address: client.address || '',
          growth: client.growth || '',
          weight: client.weight || '',
          price: client.price || 250,
          capacity: client.capacity || 0,
          attented: client.attented || 0,
          userId: client.userId || '',
          email: client.email || ''
        }
      }));

      // Сортируем по фамилии в алфавитном порядке
      formattedClients.sort((a, b) => {
        const surnameA = (a.data?.surname || '').toLowerCase();
        const surnameB = (b.data?.surname || '').toLowerCase();
        return surnameA.localeCompare(surnameB, 'uk'); // 'uk' для украинского алфавита
      });

      // Пагинация
      const page = filters.page || 0;
      const pageLimit = filters.limit || 10;
      const start = page * pageLimit;
      const paginatedClients = formattedClients.slice(start, start + pageLimit);

      return {
        total: formattedClients.length,
        data: paginatedClients
      };
    } catch (error) {
      console.error('Error getting clients:', error);
      throw error;
    }
  },

  // Получить клиента по ID
  async getById(id) {
    try {
      const docRef = doc(db, COLLECTION_NAME, DOC_NAME);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const rawData = docSnap.data();
        const client = rawData[id];
        
        if (client) {
          return {
            id: id,
            data: {
              name: client.name || '',
              surname: client.surname || '',
              phone: client.phone || '',
              gym: client.gymName || '',
              gymId: client.gymId || '',
              sex: client.sex || '',
              address: client.address || '',
              growth: client.growth || '',
              weight: client.weight || '',
              price: client.price || 250,
              capacity: client.capacity || 0,
              attented: client.attented || 0,
              userId: client.userId || '',
              email: client.email || ''
            }
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting client:', error);
      throw error;
    }
  },

  // Создать нового клиента
  async create(clientData) {
    try {
      const docRef = doc(db, COLLECTION_NAME, DOC_NAME);
      const newId = Date.now().toString();
      
      const clientToSave = {
        id: newId, // Добавляем ID внутрь объекта для совместимости с мобильной версией
        name: clientData.name || '',
        surname: clientData.surname || '',
        phone: clientData.phone || '',
        gymName: clientData.gym || '',
        gymId: clientData.gymId || '',
        sex: clientData.sex || '',
        address: clientData.address || '',
        growth: clientData.growth || '',
        weight: clientData.weight || '',
        isActive: true,
        // Добавляем поля для совместимости с мобильной версией
        price: 250,
        capacity: 0,
        attented: 0,
        attendance: [],
        attendanceTime: [],
        special: false,
        excludeFromCount: false
      };
      
      // Очищаем от пустых значений
      const cleanedClient = cleanClientData(clientToSave);
      // Обязательные поля
      cleanedClient.id = newId;
      cleanedClient.isActive = true;
      cleanedClient.price = 250;
      cleanedClient.capacity = 0;
      cleanedClient.attented = 0;
      cleanedClient.attendance = [];
      cleanedClient.attendanceTime = [];
      cleanedClient.special = false;
      cleanedClient.excludeFromCount = false;
      
      await setDoc(docRef, { [newId]: cleanedClient }, { merge: true });
      
      return { id: newId };
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  },

  // Обновить клиента
  async update(id, clientData) {
    try {
      const docRef = doc(db, COLLECTION_NAME, DOC_NAME);
      
      // Сначала получаем текущие данные клиента
      const docSnap = await getDoc(docRef);
      let existingData = {};
      
      if (docSnap.exists()) {
        const rawData = docSnap.data();
        existingData = rawData[id] || {};
      }
      
      const clientToSave = {
        id: id, // Сохраняем ID внутри объекта
        name: clientData.name || '',
        surname: clientData.surname || '',
        phone: clientData.phone || '',
        gymName: clientData.gym || '',
        gymId: clientData.gymId || existingData.gymId || '',
        sex: clientData.sex || '',
        address: clientData.address || '',
        growth: clientData.growth || '',
        weight: clientData.weight || '',
        // Сохраняем все существующие данные из мобильной версии
        price: existingData.price !== undefined ? existingData.price : 250,
        capacity: existingData.capacity !== undefined ? existingData.capacity : 0,
        attented: existingData.attented !== undefined ? existingData.attented : 0,
        userId: existingData.userId,
        email: existingData.email,
        attendance: existingData.attendance || [],
        attendanceTime: existingData.attendanceTime || [],
        isActive: existingData.isActive !== undefined ? existingData.isActive : true,
        special: existingData.special || false,
        excludeFromCount: existingData.excludeFromCount || false
      };
      
      // Очищаем от пустых значений только базовые поля
      const cleanedClient = {
        id: id, // ID всегда должен быть
        name: clientToSave.name,
        surname: clientToSave.surname,
        phone: clientToSave.phone,
        gymName: clientToSave.gymName,
        sex: clientToSave.sex,
        address: clientToSave.address,
        growth: clientToSave.growth,
        weight: clientToSave.weight
      };
      
      // Удаляем пустые строки
      Object.keys(cleanedClient).forEach(key => {
        if (cleanedClient[key] === '' && key !== 'id') delete cleanedClient[key];
      });
      
      // Добавляем обратно все поля из мобильной версии
      if (clientToSave.gymId) cleanedClient.gymId = clientToSave.gymId;
      cleanedClient.price = clientToSave.price;
      cleanedClient.capacity = clientToSave.capacity;
      cleanedClient.attented = clientToSave.attented;
      if (clientToSave.userId) cleanedClient.userId = clientToSave.userId;
      if (clientToSave.email) cleanedClient.email = clientToSave.email;
      cleanedClient.attendance = clientToSave.attendance;
      cleanedClient.attendanceTime = clientToSave.attendanceTime;
      cleanedClient.isActive = clientToSave.isActive;
      cleanedClient.special = clientToSave.special;
      cleanedClient.excludeFromCount = clientToSave.excludeFromCount;
      
      await setDoc(docRef, { [id]: cleanedClient }, { merge: true });
      return { id, data: clientData };
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  },

  // Удалить клиента
  async delete(id) {
    try {
      const docRef = doc(db, COLLECTION_NAME, DOC_NAME);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) return false;
      
      // 1. Удаляем клиента из основной коллекции
      const rawData = docSnap.data();
      delete rawData[id];
      await setDoc(docRef, rawData);
      
      // 2. Удаляем базу упражнений клиента (clientBases)
      try {
        const clientBaseRef = doc(db, 'clientBases', id);
        const clientBaseSnap = await getDoc(clientBaseRef);
        
        if (clientBaseSnap.exists()) {
          // Удаляем все упражнения
          const exercisesRef = collection(db, 'clientBases', id, 'exercises');
          const exercisesSnap = await getDocs(exercisesRef);
          const deleteExercisesPromises = exercisesSnap.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(deleteExercisesPromises);
          
          // Удаляем метаданные
          const metadataRef = doc(db, 'clientBases', id, 'metadata', 'settings');
          const metadataSnap = await getDoc(metadataRef);
          if (metadataSnap.exists()) {
            await deleteDoc(metadataRef);
          }
        }
      } catch (error) {
        console.error('Error deleting client base:', error);
      }
      
      // 3. Удаляем все тренировки клиента (workouts)
      try {
        const workoutsRef = collection(db, 'workouts');
        const workoutsQuery = query(workoutsRef, where('clientId', '==', id));
        const workoutsSnap = await getDocs(workoutsQuery);
        const deleteWorkoutsPromises = workoutsSnap.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deleteWorkoutsPromises);
      } catch (error) {
        console.error('Error deleting workouts:', error);
      }
      
      // 4. Удаляем историю тренировок (workoutHistory)
      try {
        const historyRef = collection(db, 'workoutHistory');
        const historyQuery = query(historyRef, where('clientId', '==', id));
        const historySnap = await getDocs(historyQuery);
        const deleteHistoryPromises = historySnap.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deleteHistoryPromises);
      } catch (error) {
        console.error('Error deleting workout history:', error);
      }
      
      // 5. Удаляем trainings если есть
      try {
        const trainingsRef = collection(db, 'trainings');
        const trainingsQuery = query(trainingsRef, where('clientId', '==', id));
        const trainingsSnap = await getDocs(trainingsQuery);
        const deleteTrainingsPromises = trainingsSnap.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deleteTrainingsPromises);
      } catch (error) {
        console.error('Error deleting trainings:', error);
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  }
};
