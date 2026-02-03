import React from 'react';
import styles from './BackButton.module.scss';

const BackButton = ({ onClick, className }) => {
  return (
    <button className={`${styles.backButton} ${className || ''}`} onClick={onClick}>
      <span className={styles.arrow}>←</span>
    </button>
  );
};

export default BackButton;
