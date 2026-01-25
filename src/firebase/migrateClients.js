/**
 * Скрипт миграции для добавления недостающих полей к существующим клиентам
 * Запустите этот скрипт один раз для обновления всех существующих клиентов
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './config';

const COLLECTION_NAME = 'Ustim';
const DOC_NAME = 'People';

export async function migrateClients() {
  try {
    console.log('Начинаем миграцию клиентов...');
    
    const docRef = doc(db, COLLECTION_NAME, DOC_NAME);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.log('Документ People не найден');
      return { success: false, message: 'Документ не найден' };
    }

    const rawData = docSnap.data();
    const clientIds = Object.keys(rawData);
    
    console.log(`Найдено клиентов: ${clientIds.length}`);
    
    let updatedCount = 0;
    const updatedData = {};
    
    for (const clientId of clientIds) {
      const client = rawData[clientId];
      
      // Проверяем, нужно ли обновлять клиента
      const needsUpdate = 
        client.capacity === undefined ||
        client.attented === undefined ||
        client.price === undefined ||
        client.attendance === undefined ||
        client.attendanceTime === undefined ||
        client.special === undefined ||
        client.excludeFromCount === undefined ||
        client.gymId === undefined;
      
      if (needsUpdate) {
        updatedData[clientId] = {
          ...client,
          // Добавляем недостающие поля с значениями по умолчанию
          capacity: client.capacity !== undefined ? client.capacity : 0,
          attented: client.attented !== undefined ? client.attented : 0,
          price: client.price !== undefined ? client.price : 250,
          attendance: client.attendance || [],
          attendanceTime: client.attendanceTime || [],
          special: client.special || false,
          excludeFromCount: client.excludeFromCount || false,
          gymId: client.gymId || '',
          isActive: client.isActive !== undefined ? client.isActive : true,
          // Сохраняем существующие поля аккаунта если они есть
          userId: client.userId || '',
          email: client.email || ''
        };
        updatedCount++;
      } else {
        updatedData[clientId] = client;
      }
    }
    
    if (updatedCount > 0) {
      console.log(`Обновляем ${updatedCount} клиентов...`);
      await setDoc(docRef, updatedData);
      console.log('Миграция завершена успешно!');
      return { 
        success: true, 
        message: `Обновлено клиентов: ${updatedCount} из ${clientIds.length}` 
      };
    } else {
      console.log('Все клиенты уже имеют необходимые поля');
      return { 
        success: true, 
        message: 'Миграция не требуется - все клиенты актуальны' 
      };
    }
    
  } catch (error) {
    console.error('Ошибка миграции:', error);
    return { 
      success: false, 
      message: `Ошибка: ${error.message}` 
    };
  }
}
