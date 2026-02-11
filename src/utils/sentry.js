import * as Sentry from '@sentry/react';

/**
 * Инициализация Sentry для отслеживания ошибок
 * 
 * Для работы нужно:
 * 1. Зарегистрироваться на sentry.io
 * 2. Создать проект
 * 3. Получить DSN
 * 4. Добавить в .env файл: REACT_APP_SENTRY_DSN=your_dsn_here
 */
export const initSentry = () => {
  // Проверяем наличие DSN в переменных окружения
  const sentryDsn = process.env.REACT_APP_SENTRY_DSN;

  if (!sentryDsn) {
    console.warn('⚠️ Sentry DSN не найден. Добавьте REACT_APP_SENTRY_DSN в .env файл');
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    
    // Интеграции
    integrations: [
      // Отслеживание производительности браузера
      Sentry.browserTracingIntegration(),
      
      // Replay сессий (опционально, для debugging)
      Sentry.replayIntegration({
        maskAllText: true, // Маскируем весь текст для приватности
        blockAllMedia: true, // Блокируем медиа
      }),
    ],

    // Процент транзакций для отслеживания производительности
    tracesSampleRate: 0.1, // 10% запросов

    // Процент сессий для replay
    replaysSessionSampleRate: 0.1, // 10% сессий
    replaysOnErrorSampleRate: 1.0, // 100% сессий с ошибками

    // Окружение
    environment: process.env.NODE_ENV || 'development',

    // Игнорируем ошибки в development
    enabled: process.env.NODE_ENV === 'production',

    // Фильтр ошибок - игнорируем некритичные
    beforeSend(event, hint) {
      const error = hint.originalException;

      // Игнорируем сетевые ошибки (они логируются отдельно)
      if (error && error.message && error.message.includes('Network')) {
        return null;
      }

      // Игнорируем ошибки расширений браузера
      if (event.exception && event.exception.values) {
        const isExtensionError = event.exception.values.some(
          (exception) =>
            exception.stacktrace &&
            exception.stacktrace.frames &&
            exception.stacktrace.frames.some(
              (frame) => frame.filename && frame.filename.includes('chrome-extension://')
            )
        );
        if (isExtensionError) {
          return null;
        }
      }

      return event;
    },
  });

  console.log('✅ Sentry инициализирован');
};

/**
 * Логирование ошибки в Sentry
 * @param {Error} error - Объект ошибки
 * @param {Object} context - Дополнительный контекст
 */
export const logError = (error, context = {}) => {
  console.error('❌ Error:', error, context);
  
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      extra: context,
    });
  }
};

/**
 * Логирование сообщения в Sentry
 * @param {string} message - Сообщение
 * @param {string} level - Уровень: 'info', 'warning', 'error'
 * @param {Object} context - Дополнительный контекст
 */
export const logMessage = (message, level = 'info', context = {}) => {
  console.log(`[${level.toUpperCase()}]`, message, context);
  
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureMessage(message, {
      level,
      extra: context,
    });
  }
};

/**
 * Установка пользовательского контекста
 * @param {Object} user - Данные пользователя
 */
export const setUserContext = (user) => {
  if (process.env.NODE_ENV === 'production' && user) {
    Sentry.setUser({
      id: user.uid,
      email: user.email,
    });
  }
};

/**
 * Очистка пользовательского контекста
 */
export const clearUserContext = () => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.setUser(null);
  }
};

export default Sentry;
