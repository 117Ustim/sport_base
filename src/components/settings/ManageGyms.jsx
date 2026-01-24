import React, { useState, useEffect } from 'react';
import { gymsService } from '../../firebase/services';
import styles from './ManageGyms.module.scss';

export default function ManageGyms({ onClose }) {
  const [gyms, setGyms] = useState([]);
  const [gymName, setGymName] = useState('');
  const [editingGym, setEditingGym] = useState(null);

  useEffect(() => {
    loadGyms();
  }, []);

  const loadGyms = () => {
    gymsService.getAll()
      .then((data) => {
        setGyms(data);
      })
      .catch((error) => {
        console.error('Помилка завантаження залів:', error);
      });
  };

  const onAddGym = () => {
    if (!gymName.trim()) return;

    if (editingGym) {
      gymsService.update(editingGym.id, gymName)
        .then(() => {
          loadGyms();
          setGymName('');
          setEditingGym(null);
        })
        .catch((error) => {
          console.error('Помилка редагування залу:', error);
        });
    } else {
      gymsService.create(gymName)
        .then(() => {
          loadGyms();
          setGymName('');
        })
        .catch((error) => {
          console.error('Помилка додавання залу:', error);
        });
    }
  };

  const onEditGym = (gym) => {
    setEditingGym(gym);
    setGymName(gym.name);
  };

  const onDeleteGym = (id) => {
    if (window.confirm('Ви впевнені, що хочете видалити цей зал?')) {
      gymsService.delete(id)
        .then(() => {
          loadGyms();
        })
        .catch((error) => {
          console.error('Помилка видалення залу:', error);
        });
    }
  };

  const onCancelEdit = () => {
    setEditingGym(null);
    setGymName('');
  };

  return (
    <div className={styles.manageGyms}>
      <div className={styles.header}>
        <h2>Управління залами</h2>
        <button className={styles.close} onClick={onClose}>✕</button>
      </div>

      <div className={styles.form}>
        <input
          type='text'
          placeholder='Назва залу'
          value={gymName}
          onChange={(e) => setGymName(e.target.value)}
          className={styles.input}
        />
        <div className={styles.buttons}>
          <button 
            className={`${styles.btn} ${styles.btnAdd}`} 
            onClick={onAddGym}
          >
            {editingGym ? 'Зберегти' : 'Додати'}
          </button>
          {editingGym && (
            <button 
              className={`${styles.btn} ${styles.btnCancel}`} 
              onClick={onCancelEdit}
            >
              Скасувати
            </button>
          )}
        </div>
      </div>

      <div className={styles.list}>
        <h3>Список залів</h3>
        {gyms.length === 0 ? (
          <p className={styles.empty}>Немає залів</p>
        ) : (
          gyms.map((gym) => (
            <div key={gym.id} className={styles.item}>
              <span className={styles.name}>{gym.name}</span>
              <div className={styles.actions}>
                <button 
                  className={`${styles.btn} ${styles.btnEdit}`}
                  onClick={() => onEditGym(gym)}
                >
                  Редагувати
                </button>
                <button 
                  className={`${styles.btn} ${styles.btnDelete}`}
                  onClick={() => onDeleteGym(gym.id)}
                >
                  Видалити
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
