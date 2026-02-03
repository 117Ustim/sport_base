import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ru from './locales/ru.json';
import uk from './locales/uk.json';
import en from './locales/en.json';

i18n
  // Подключаем автоопределение языка
  .use(LanguageDetector)
  // Подключаем React адаптер
  .use(initReactI18next)
  .init({
    // Ресурсы переводов
    resources: {
      ru: { translation: ru },
      uk: { translation: uk },
      en: { translation: en }
    },
    // Язык по умолчанию, если не удалось определить
    fallbackLng: 'uk',
    
    // Отладка в режиме разработки
    debug: process.env.NODE_ENV === 'development',

    interpolation: {
      escapeValue: false, // React сам экранирует XSS
    },

    // Настройки детектора языка
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'appLanguage', // Используем тот же ключ, что и раньше
      caches: ['localStorage'],
    }
  });

export default i18n;
