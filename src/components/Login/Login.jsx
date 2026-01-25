import { useState } from 'react';
import { authService } from '../../firebase/services';
import styles from './Login.module.scss';

const ERROR_MESSAGES = {
  'auth/invalid-email': 'Невірний формат email',
  'auth/user-not-found': 'Користувача не знайдено',
  'auth/wrong-password': 'Невірний пароль',
  'auth/email-already-in-use': 'Email вже використовується',
  'auth/weak-password': 'Пароль занадто слабкий (мін. 6 символів)',
  'auth/invalid-credential': 'Невірні дані для входу',
  default: 'Помилка авторизації'
};

const DEFAULT_CREDENTIALS = {
  email: 'ustimweb72@gmail.com',
  password: 'UstikMaxus140572'
};

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState(DEFAULT_CREDENTIALS.email);
  const [password, setPassword] = useState(DEFAULT_CREDENTIALS.password);
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await authService.register(email, password);
      } else {
        await authService.login(email, password);
      }
      onLoginSuccess();
    } catch (err) {
      // Специальная обработка для удаленных пользователей
      if (err.message && err.message.includes('Доступ заборонено')) {
        setError('Доступ заборонено. Ваш акаунт було видалено.');
      } else {
        setError(ERROR_MESSAGES[err.code] || ERROR_MESSAGES.default);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchMode = () => {
    setIsRegister(!isRegister);
    setError('');
    
    if (!isRegister) {
      setEmail('');
      setPassword('');
    } else {
      setEmail(DEFAULT_CREDENTIALS.email);
      setPassword(DEFAULT_CREDENTIALS.password);
    }
  };

  return (
    <div className={styles.login}>
      <div className={styles.container}>
        <h1 className={styles.title}>
          {isRegister ? 'Реєстрація' : 'Вхід'}
        </h1>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            required
          />
          
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            required
            minLength={6}
          />
          
          {error && <p className={styles.error}>{error}</p>}
          
          <button 
            type="submit" 
            className={styles.button}
            disabled={loading}
          >
            {loading ? 'Завантаження...' : (isRegister ? 'Зареєструватися' : 'Увійти')}
          </button>
        </form>
        
        <p className={styles.switch}>
          {isRegister ? 'Вже є акаунт?' : 'Немає акаунту?'}
          <button 
            type="button"
            onClick={handleSwitchMode}
            className={styles.switchBtn}
          >
            {isRegister ? 'Увійти' : 'Зареєструватися'}
          </button>
        </p>
      </div>
    </div>
  );
}
