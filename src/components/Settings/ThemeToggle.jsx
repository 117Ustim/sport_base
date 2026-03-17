import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import styles from './ThemeToggle.module.scss';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={styles.themeToggle}>
      <div className={styles.toggleTrack} onClick={toggleTheme}>
        <div className={`${styles.toggleThumb} ${theme === 'dark' ? styles.dark : ''}`}>
          <span className={styles.icon}>
            {theme === 'light' ? '☀️' : '🌙'}
          </span>
        </div>
      </div>
    </div>
  );
}
