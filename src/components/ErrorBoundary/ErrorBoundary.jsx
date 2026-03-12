import React from 'react';
import styles from './ErrorBoundary.module.scss';

/**
 * Error Boundary для отлова ошибок React
 * Логирует ошибки в консоль
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ React Error Boundary caught:', error, errorInfo);
    
    // Логируем в консоль (без внешних сервисов)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.errorBoundary}>
          <div className={styles.errorContent}>
            <h1 className={styles.errorTitle}>😕 Что-то пошло не так</h1>
            <p className={styles.errorMessage}>
              Произошла непредвиденная ошибка. Мы уже получили уведомление и работаем над исправлением.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className={styles.errorDetails}>
                <summary>Детали ошибки (только в dev режиме)</summary>
                <pre>{this.state.error.toString()}</pre>
              </details>
            )}
            <button className={styles.reloadButton} onClick={this.handleReload}>
              Перезагрузить страницу
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
