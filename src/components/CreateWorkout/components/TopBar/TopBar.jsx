import styles from './TopBar.module.scss';

export default function TopBar({ workout, isEditMode, onBack, onOpenModal, onSave }) {
  return (
    <div className={styles.topButtonsPanel}>
      <button className={styles.backButton} onClick={onBack}>
        Назад
      </button>

      {!workout && (
        <button className={styles.newTrainingButton} onClick={onOpenModal}>
          Новая тренировка
        </button>
      )}

      {workout && (
        <>
          <h2 className={styles.workoutNameHeader}>{workout.name}</h2>
          <button className={styles.saveAllButton} onClick={onSave}>
            {isEditMode ? 'Сохранить изменения' : 'Сохранить'}
          </button>
        </>
      )}
    </div>
  );
}
