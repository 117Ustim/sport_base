import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config';

const USERS_COLLECTION = 'users';
const MAIN_ADMIN_EMAIL = 'ustimweb72@gmail.com'; // Главный админ - всегда имеет доступ

export const authService = {
  // Вход по email/паролю
  async login(email, password) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Главный админ всегда имеет доступ
      if (result.user.email === MAIN_ADMIN_EMAIL) {
        // Создаем запись если её нет
        await this.ensureAdminExists(result.user.uid, result.user.email);
        return result.user;
      }
      
      // Проверяем существует ли пользователь в базе данных
      const userExists = await this.checkUserExists(result.user.uid);
      
      if (!userExists) {
        // Пользователь удален из базы - выходим
        await this.logout();
        throw new Error('Доступ заборонено. Користувача видалено.');
      }
      
      return result.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // Регистрация
  async register(email, password) {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Создаем запись в коллекции users
      const { setDoc } = await import('firebase/firestore');
      const userData = {
        email,
        role: 'admin',
        createdAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, USERS_COLLECTION, result.user.uid), userData);
      
      return result.user;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  },

  // Выход
  async logout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  // Получить текущего пользователя
  getCurrentUser() {
    return auth.currentUser;
  },

  // Подписка на изменение состояния авторизации
  onAuthChange(callback) {
    return onAuthStateChanged(auth, callback);
  },

  // Проверить существует ли пользователь в базе данных
  async checkUserExists(userId) {
    try {
      const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
      return userDoc.exists();
    } catch (error) {
      console.error('Error checking user existence:', error);
      return false;
    }
  },

  // Создать запись для главного админа если её нет
  async ensureAdminExists(userId, email) {
    try {
      const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
      
      if (!userDoc.exists()) {
        const { setDoc } = await import('firebase/firestore');
        const userData = {
          email,
          role: 'admin',
          isMainAdmin: true,
          createdAt: new Date().toISOString()
        };
        
        await setDoc(doc(db, USERS_COLLECTION, userId), userData);
        // ✅ Заменено на console.warn
        if (process.env.NODE_ENV === 'development') {
          console.warn('Main admin record created');
        }
      }
    } catch (error) {
      console.error('Error ensuring admin exists:', error);
    }
  }
};
