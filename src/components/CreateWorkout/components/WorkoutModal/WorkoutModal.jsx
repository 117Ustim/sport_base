import styles from './WorkoutModal.module.scss';

export default function WorkoutModal({ isOpen, trainingName, onNameChange, onCreate, onClose }) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>Новая тренировка</h2>
        <input
          type="text"
          className={styles.modalInput}
          placeholder="Название тренировки"
          value={trainingName}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              onCreate();
            }
          }}
          autoFocus
        />
        <div className={styles.modalButtons}>
          <button className={`${styles.modalButton} ${styles.cancelButton}`} onClick={onClose}>
            Отмена
          </button>
          <button className={`${styles.modalButton} ${styles.createButton}`} onClick={onCreate}>
            Создать
          </button>
        </div>
      </div>
    </div>
  );
}
