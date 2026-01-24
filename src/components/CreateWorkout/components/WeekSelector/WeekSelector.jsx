import styles from './WeekSelector.module.scss';

export default function WeekSelector({ workout, selectedWeek, onSelectWeek, onAddWeek }) {
  return (
    <div className={styles.weeksSelector}>
      <div className={styles.weeksHeader}>
        <h3 className={styles.sidebarTitle}>Недели</h3>
        <button className={styles.addWeekIconButton} onClick={onAddWeek} title="Добавить неделю">
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
            Неделя {week.weekNumber}
          </button>
        ))}
      </div>
    </div>
  );
}
