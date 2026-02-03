import { useTranslation } from 'react-i18next';
import { DAYS_OF_WEEK } from '../../constants';
import styles from './DaySelector.module.scss';

export default function DaySelector({ selectedDay, workout, selectedWeek, onSelectDay }) {
  const { t } = useTranslation();

  return (
    <div className={styles.daysSelectorSidebar}>
      <h3 className={styles.sidebarTitle}>{t('createWorkout.daysTitle')}</h3>
      <div className={styles.daysButtons}>
        {DAYS_OF_WEEK.map((day) => {
          const exercisesCount = workout.weeks[selectedWeek]?.days[day.key]?.exercises?.length || 0;
          return (
            <button
              key={day.key}
              className={`${styles.dayButton} ${selectedDay === day.key ? styles.activeDay : ''}`}
              onClick={() => onSelectDay(day.key)}
            >
              <span className={styles.dayLabel}>{t(`days.${day.key}`)}</span>
              {exercisesCount > 0 && (
                <span className={styles.dayExercisesCount}>{exercisesCount}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
