import { useTranslation } from 'react-i18next';
import styles from './WorkoutModal.module.scss';

export default function WorkoutModal({ isOpen, trainingName, onNameChange, onCreate, onClose }) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>{t('createWorkout.newButton')}</h2>
        <input
          type="text"
          className={styles.modalInput}
          placeholder={t('createWorkout.trainingNamePlaceholder')}
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
            {t('common.cancel')}
          </button>
          <button className={`${styles.modalButton} ${styles.createButton}`} onClick={onCreate}>
            {t('createWorkout.create')}
          </button>
        </div>
      </div>
    </div>
  );
}
