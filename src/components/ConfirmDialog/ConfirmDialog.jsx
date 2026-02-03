import { useTranslation } from 'react-i18next';
import styles from './ConfirmDialog.module.scss';

export default function ConfirmDialog({ isOpen, message, onConfirm, onCancel }) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>{t('common.confirmation')}</h3>
        <p className={styles.message}>{message}</p>
        <div className={styles.buttons}>
          <button className={`${styles.button} ${styles.cancel}`} onClick={onCancel}>
            {t('common.no')}
          </button>
          <button className={`${styles.button} ${styles.delete}`} onClick={onConfirm}>
            {t('common.yes')}
          </button>
        </div>
      </div>
    </div>
  );
}
