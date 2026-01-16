import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../config';

export const authService = {
  // Вход по email/паролю
  async login(email, password) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
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
  }
};
