import React from 'react';
import styles from './ErrorBoundary.module.scss';

// ✅ SECURITY FIX: Error Boundary для предотвращения белого экрана при ошибках
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Обновляем состояние чтобы показать fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Логируем ошибку
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // TODO: Отправить ошибку в сервис мониторинга (Sentry, LogRocket)
    // logErrorToService(error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.errorBoundary}>
          <div className={styles.container}>
            <h1 className={styles.title}>😔 Щось пішло не так</h1>
            <p className={styles.message}>
              Виникла помилка при завантаженні додатку.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className={styles.details}>
                <summary>Деталі помилки (тільки для розробки)</summary>
                <pre className={styles.errorStack}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            
            <button 
              onClick={this.handleReload}
              className={styles.button}
            >
              Перезавантажити сторінку
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
