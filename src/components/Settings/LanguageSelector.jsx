import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './LanguageSelector.module.scss';

const languages = [
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦' },
  { code: 'en', name: 'English', flag: '🇬🇧' }
];

export default function LanguageSelector({ onClose }) {
  const { t, i18n } = useTranslation();
  
  // Текущий язык (берем только первые 2 буквы, т.к. может быть "en-US")
  const currentLang = i18n.language ? i18n.language.split('-')[0] : 'uk';

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode);
    // onClose(); // Можно закрывать сразу, если нужно
  };

  return (
    <div className={styles.languageSelector}>
      <div className={styles.header}>
        <h2>{t('settings.languageDesc')}</h2>
        <button className={styles.close} onClick={onClose}>✕</button>
      </div>

      <div className={styles.languageList}>
        {languages.map((lang) => (
          <div
            key={lang.code}
            className={`${styles.languageCard} ${currentLang === lang.code ? styles.active : ''}`}
            onClick={() => handleLanguageChange(lang.code)}
          >
            <div className={styles.flag}>{lang.flag}</div>
            <div className={styles.languageName}>{lang.name}</div>
            {currentLang === lang.code && (
              <div className={styles.checkmark}>✓</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
