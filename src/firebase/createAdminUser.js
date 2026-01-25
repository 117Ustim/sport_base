import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from './config';

const USERS_COLLECTION = 'users';
const ADMIN_EMAIL = 'ustimweb72@gmail.com';

/**
 * Создать запись для главного администратора
 * Запусти этот скрипт один раз чтобы добавить админа в базу
 */
export async function createAdminUser() {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      console.error('Нужно войти в систему перед запуском скрипта');
      return;
    }

    console.log('Creating admin user record...');
    console.log('User ID:', currentUser.uid);
    console.log('Email:', currentUser.email);
    
    const userData = {
      email: currentUser.email,
      role: 'admin',
      isMainAdmin: true, // Главный админ - не может быть удален
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, USERS_COLLECTION, currentUser.uid), userData);
    
    console.log('✅ Admin user created successfully!');
    console.log('User data:', userData);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  }
}

// Автоматически запускаем при импорте
createAdminUser();
