import styles from './ConfirmDialog.module.scss';

export default function ConfirmDialog({ isOpen, message, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>Підтвердження</h3>
        <p className={styles.message}>{message}</p>
        <div className={styles.buttons}>
          <button className={`${styles.button} ${styles.cancel}`} onClick={onCancel}>
            Ні
          </button>
          <button className={`${styles.button} ${styles.delete}`} onClick={onConfirm}>
            Так
          </button>
        </div>
      </div>
    </div>
  );
}
