import React from 'react';
import styles from './SkeletonLoader.module.scss';

/**
 * Универсальный компонент Skeleton Loader
 * Показывает анимированную заглушку во время загрузки данных
 * 
 * @param {string} type - Тип skeleton: 'list', 'card', 'details', 'table'
 * @param {number} count - Количество элементов для типа 'list'
 */
const SkeletonLoader = ({ type = 'list', count = 3 }) => {
  // Skeleton для списка (например, список клиентов)
  if (type === 'list') {
    return (
      <div className={styles.skeletonContainer}>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className={styles.skeletonListItem}>
            <div className={styles.skeletonAvatar} />
            <div className={styles.skeletonContent}>
              <div className={styles.skeletonTitle} />
              <div className={styles.skeletonSubtitle} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Skeleton для карточки (например, детали клиента)
  if (type === 'card') {
    return (
      <div className={styles.skeletonContainer}>
        <div className={styles.skeletonCard}>
          <div className={styles.skeletonCardHeader} />
          <div className={styles.skeletonCardBody}>
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} style={{ width: '60%' }} />
          </div>
        </div>
      </div>
    );
  }

  // Skeleton для деталей тренировки
  if (type === 'details') {
    return (
      <div className={styles.skeletonContainer}>
        <div className={styles.skeletonDetailsHeader}>
          <div className={styles.skeletonButton} />
          <div className={styles.skeletonTitle} style={{ width: '40%' }} />
          <div className={styles.skeletonButton} />
        </div>
        
        <div className={styles.skeletonDetailsTitle} />
        
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className={styles.skeletonDetailsSection}>
            <div className={styles.skeletonSectionTitle} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} style={{ width: '80%' }} />
          </div>
        ))}
      </div>
    );
  }

  // Skeleton для таблицы
  if (type === 'table') {
    return (
      <div className={styles.skeletonContainer}>
        <div className={styles.skeletonTable}>
          <div className={styles.skeletonTableHeader}>
            <div className={styles.skeletonTableCell} />
            <div className={styles.skeletonTableCell} />
            <div className={styles.skeletonTableCell} />
          </div>
          {Array.from({ length: count }).map((_, index) => (
            <div key={index} className={styles.skeletonTableRow}>
              <div className={styles.skeletonTableCell} />
              <div className={styles.skeletonTableCell} />
              <div className={styles.skeletonTableCell} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // По умолчанию - простой skeleton
  return (
    <div className={styles.skeletonContainer}>
      <div className={styles.skeletonLine} />
      <div className={styles.skeletonLine} />
      <div className={styles.skeletonLine} style={{ width: '60%' }} />
    </div>
  );
};

export default SkeletonLoader;
