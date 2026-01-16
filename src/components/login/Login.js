import React, { useState } from 'react';
import { authService } from '../../firebase/services';
import './login.scss';

export default function Login({ onLoginSuccess }) {
  // Автозаповнення для швидкого входу
  const [email, setEmail] = useState('ustimweb72@gmail.com');
  const [password, setPassword] = useState('UstikMaxus140572');
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
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (code) => {
    switch (code) {
      case 'auth/invalid-email':
        return 'Невірний формат email';
      case 'auth/user-not-found':
        return 'Користувача не знайдено';
      case 'auth/wrong-password':
        return 'Невірний пароль';
      case 'auth/email-already-in-use':
        return 'Email вже використовується';
      case 'auth/weak-password':
        return 'Пароль занадто слабкий (мін. 6 символів)';
      default:
        return 'Помилка авторизації';
    }
  };

  const handleSwitchMode = () => {
    setIsRegister(!isRegister);
    setError('');
    // При переключенні на реєстрацію очищаємо поля
    if (!isRegister) {
      setEmail('');
      setPassword('');
    } else {
      // При поверненні до входу відновлюємо дефолтні значення
      setEmail('ustimweb72@gmail.com');
      setPassword('UstikMaxus140572');
    }
  };

  return (
    <div className="login">
      <div className="login__container">
        <h1 className="login__title">
          {isRegister ? 'Реєстрація' : 'Вхід'}
        </h1>
        
        <form onSubmit={handleSubmit} className="login__form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="login__input"
            required
          />
          
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="login__input"
            required
            minLength={6}
          />
          
          {error && <p className="login__error">{error}</p>}
          
          <button 
            type="submit" 
            className="login__button"
            disabled={loading}
          >
            {loading ? 'Завантаження...' : (isRegister ? 'Зареєструватися' : 'Увійти')}
          </button>
        </form>
        
        <p className="login__switch">
          {isRegister ? 'Вже є акаунт?' : 'Немає акаунту?'}
          <button 
            type="button"
            onClick={handleSwitchMode}
            className="login__switch-btn"
          >
            {isRegister ? 'Увійти' : 'Зареєструватися'}
          </button>
        </p>
      </div>
    </div>
  );
}
