import styles from './ButtonEditDelete.module.scss';

export default function ButtonEditDelete({ 
  onDeleteContactClient, 
  onEditContactClient, 
  contact, 
  toggleDrawer 
}) {
  return (
    <div className={styles.buttonBlock}>
      <button
        className={styles.button}
        onClick={(e) => toggleDrawer(e)}
      >
        Edit
      </button>
      <button
        className={styles.button}
        onClick={() => onDeleteContactClient(contact.id)}
      >
        <span className={styles.deleteText}>Del</span>
      </button>
    </div>
  );
}
