import styles from './Notification.module.scss';

export default function Notification({ notification }) {
  if (!notification.show) return null;

  return (
    <div className={`${styles.notification} ${styles[notification.type]}`}>
      <span className={styles.icon}>
        {notification.type === 'success' ? '✓' : '✕'}
      </span>
      <span className={styles.message}>{notification.message}</span>
    </div>
  );
}
