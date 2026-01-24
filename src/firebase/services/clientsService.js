import { 
  doc, 
  getDoc, 
  setDoc
} from 'firebase/firestore';
import { db } from '../config';

// Структура: коллекция Ustim -> документ People -> массив People
const COLLECTION_NAME = 'Ustim';
const DOC_NAME = 'People';

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
          sex: client.sex || '',
          address: client.address || '',
          growth: client.growth || '',
          weight: client.weight || ''
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
              sex: client.sex || '',
              address: client.address || '',
              growth: client.growth || '',
              weight: client.weight || ''
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
      
      const newClient = {
        name: clientData.name || '',
        surname: clientData.surname || '',
        phone: clientData.phone || '',
        gymName: clientData.gym || '',
        sex: clientData.sex || '',
        address: clientData.address || '',
        growth: clientData.growth || '',
        weight: clientData.weight || '',
        isActive: true
      };
      
      await setDoc(docRef, { [newId]: newClient }, { merge: true });
      
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
      
      const updatedClient = {
        name: clientData.name || '',
        surname: clientData.surname || '',
        phone: clientData.phone || '',
        gymName: clientData.gym || '',
        sex: clientData.sex || '',
        address: clientData.address || '',
        growth: clientData.growth || '',
        weight: clientData.weight || ''
      };
      
      await setDoc(docRef, { [id]: updatedClient }, { merge: true });
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
      
      const rawData = docSnap.data();
      delete rawData[id];
      
      await setDoc(docRef, rawData);
      return true;
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  }
};
