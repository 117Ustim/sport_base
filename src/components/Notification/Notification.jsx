import styles from './Notification.module.scss';

export default function Notification({ notification }) {
  if (!notification.show) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'info':
        return 'ℹ';
      default:
        return '✓';
    }
  };

  return (
    <div className={`${styles.notification} ${styles[notification.type]}`}>
      <span className={styles.icon}>
        {getIcon(notification.type)}
      </span>
      <span className={styles.message}>{notification.message}</span>
    </div>
  );
}
