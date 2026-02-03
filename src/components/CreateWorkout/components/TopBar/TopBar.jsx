import { useTranslation } from 'react-i18next';
import styles from './TopBar.module.scss';
import BackButton from '../../../BackButton';

export default function TopBar({ workout, isEditMode, onBack, onOpenModal, onSave }) {
  const { t } = useTranslation();

  return (
    <div className={styles.topButtonsPanel}>
      <BackButton onClick={onBack} />

      {!workout && (
        <button className={styles.newTrainingButton} onClick={onOpenModal}>
          {t('createWorkout.newButton')}
        </button>
      )}

      {workout && (
        <>
          <h2 className={styles.workoutNameHeader}>{workout.name}</h2>
          <button className={styles.saveAllButton} onClick={onSave}>
            {isEditMode ? t('common.saveChanges') : t('common.save')}
          </button>
        </>
      )}
    </div>
  );
}
