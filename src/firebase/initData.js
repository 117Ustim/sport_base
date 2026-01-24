import { doc, setDoc, getDocs, collection } from 'firebase/firestore';
import { db, auth } from './config';
import { createUserWithEmailAndPassword } from 'firebase/auth';

// Тестовий користувач для автоматичного входу
const TEST_USER = {
  email: 'ustimweb72@gmail.com',
  password: 'UstikMaxus140572'
};

// Начальные категории упражнений
const DEFAULT_CATEGORIES = [
  { id: '1', name: 'Ноги' },
  { id: '2', name: 'Грудь' },
  { id: '3', name: 'Спина' },
  { id: '4', name: 'Плечі' },
  { id: '5', name: 'Руки' },
  { id: '6', name: 'Аеробне' },
  { id: '7', name: 'Общее' }
];

// Инициализация категорий (вызвать один раз)
export const initCategories = async () => {
  try {
    const categoriesRef = collection(db, 'categories');
    const snapshot = await getDocs(categoriesRef);
    
    // Если категории уже есть - не создаём
    if (!snapshot.empty) {
      console.log('Категории уже существуют');
      return false;
    }

    // Создаём категории
    for (const category of DEFAULT_CATEGORIES) {
      const docRef = doc(db, 'categories', category.id);
      await setDoc(docRef, { name: category.name });
    }
    
    console.log('Категории успешно созданы!');
    return true;
  } catch (error) {
    console.error('Ошибка инициализации категорий:', error);
    throw error;
  }
};

// Добавить недостающие категории в существующую базу
export const addMissingCategories = async () => {
  try {
    const categoriesRef = collection(db, 'categories');
    const snapshot = await getDocs(categoriesRef);
    
    // Получаем существующие ID категорий
    const existingIds = snapshot.docs.map(doc => doc.id);
    
    // Находим недостающие категории
    const missingCategories = DEFAULT_CATEGORIES.filter(
      cat => !existingIds.includes(cat.id)
    );
    
    if (missingCategories.length === 0) {
      console.log('Все категории уже существуют');
      return { added: 0, categories: [] };
    }

    // Добавляем недостающие категории
    for (const category of missingCategories) {
      const docRef = doc(db, 'categories', category.id);
      await setDoc(docRef, { name: category.name });
      console.log(`✅ Добавлена категория: ${category.name}`);
    }
    
    console.log(`✅ Добавлено ${missingCategories.length} категорий`);
    return { 
      added: missingCategories.length, 
      categories: missingCategories.map(c => c.name) 
    };
  } catch (error) {
    console.error('❌ Ошибка добавления категорий:', error);
    throw error;
  }
};

// Проверка подключения к Firebase
export const testConnection = async () => {
  try {
    const testRef = collection(db, 'People');
    await getDocs(testRef);
    console.log('✅ Подключение к Firebase успешно!');
    return true;
  } catch (error) {
    console.error('❌ Ошибка подключения к Firebase:', error);
    return false;
  }
};

// Создание тестового пользователя (если не существует)
export const initTestUser = async () => {
  try {
    // Пытаемся создать тестового пользователя
    await createUserWithEmailAndPassword(auth, TEST_USER.email, TEST_USER.password);
    console.log('✅ Тестовий користувач створений:', TEST_USER.email);
    return true;
  } catch (error) {
    // Если пользователь уже существует - это нормально
    if (error.code === 'auth/email-already-in-use') {
      console.log('ℹ️ Тестовий користувач вже існує:', TEST_USER.email);
      return true;
    }
    console.error('❌ Помилка створення тестового користувача:', error);
    return false;
  }
};
