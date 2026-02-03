import { useTranslation } from 'react-i18next';
import styles from './WeekSelector.module.scss';

export default function WeekSelector({ workout, selectedWeek, onSelectWeek, onAddWeek, onDeleteWeek }) {
  const { t } = useTranslation();
  
  const handleDeleteClick = () => {
    onDeleteWeek(selectedWeek);
  };

  return (
    <div className={styles.weeksSelector}>
      <div className={styles.weeksHeader}>
        {workout.weeks.length > 1 && (
          <button 
            className={styles.deleteWeekIconButton} 
            onClick={handleDeleteClick} 
            title={t('createWorkout.deleteWeekTitle')}
          >
            −
          </button>
        )}
        <h3 className={styles.sidebarTitle}>{t('createWorkout.weeksTitle')}</h3>
        <button className={styles.addWeekIconButton} onClick={onAddWeek} title={t('createWorkout.addWeekTitle')}>
          +
        </button>
      </div>
      <div className={styles.weeksButtons}>
        {workout.weeks.map((week, index) => (
          <button
            key={index}
            className={`${styles.weekButton} ${selectedWeek === index ? styles.activeWeek : ''}`}
            onClick={() => onSelectWeek(index)}
          >
            {t('createWorkout.week')} {week.weekNumber}
          </button>
        ))}
      </div>
    </div>
  );
}
