import React from 'react';
import styles from './BackButton.module.scss';

const BackButton = ({ onClick, className, size }) => {
  const sizeClass = size === 'small' ? styles.small : '';
  return (
    <button className={`${styles.backButton} ${sizeClass} ${className || ''}`} onClick={onClick}>
      <span className={styles.arrow}>←</span>
    </button>
  );
};

export default BackButton;
