import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authService } from '../../firebase/services';
import styles from './Login.module.scss';

export default function Login({ onLoginSuccess }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const getErrorMessage = (code) => {
    switch (code) {
      case 'auth/invalid-email': return t('auth.errors.invalidEmail');
      case 'auth/user-not-found': return t('auth.errors.userNotFound');
      case 'auth/wrong-password': return t('auth.errors.wrongPassword');
      case 'auth/invalid-credential': return t('auth.errors.invalidCredential');
      default: return t('auth.errors.default');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.login(email, password);
      onLoginSuccess();
    } catch (err) {
      if (err.message && err.message.includes('Доступ заборонено')) {
        setError(t('auth.errors.accessDenied'));
      } else {
        setError(getErrorMessage(err.code));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.login}>
      <div className={styles.container}>
        <h1 className={styles.title}>
          {t('auth.login')}
        </h1>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="email"
            placeholder={t('auth.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            required
          />
          
          <input
            type="password"
            placeholder={t('auth.password')}
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
            {loading ? t('auth.loading') : t('auth.signIn')}
          </button>
        </form>
      </div>
    </div>
  );
}
