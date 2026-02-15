import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { gymsService } from '../../firebase/services';
import styles from './ManageGyms.module.scss';

export default function ManageGyms({ onClose }) {
  const { t } = useTranslation();
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
        console.error('Error loading gyms:', error);
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
          console.error('Error editing gym:', error);
        });
    } else {
      gymsService.create(gymName)
        .then(() => {
          loadGyms();
          setGymName('');
        })
        .catch((error) => {
          console.error('Error adding gym:', error);
        });
    }
  };

  const onEditGym = (gym) => {
    setEditingGym(gym);
    setGymName(gym.name);
  };

  const onDeleteGym = (id) => {
    if (window.confirm(t('dialogs.confirmDeleteGym'))) {
      gymsService.delete(id)
        .then(() => {
          loadGyms();
        })
        .catch((error) => {
          console.error('Error deleting gym:', error);
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
        <h2>{t('manageGyms.title')}</h2>
        <button className={styles.close} onClick={onClose}>✕</button>
      </div>

      <div className={styles.form}>
        <input
          type='text'
          placeholder={t('manageGyms.gymName')}
          value={gymName}
          onChange={(e) => setGymName(e.target.value)}
          className={styles.input}
        />
        <div className={styles.buttons}>
          <button 
            className={`${styles.btn} ${styles.btnAdd}`} 
            onClick={onAddGym}
          >
            {editingGym ? t('common.save') : t('common.add')}
          </button>
          {editingGym && (
            <button 
              className={`${styles.btn} ${styles.btnCancel}`} 
              onClick={onCancelEdit}
            >
              {t('common.cancel')}
            </button>
          )}
        </div>
      </div>

      <div className={styles.list}>
        <h3>{t('manageGyms.gymList')}</h3>
        {gyms.length === 0 ? (
          <p className={styles.empty}>{t('manageGyms.noGyms')}</p>
        ) : (
          gyms.map((gym) => (
            <div key={gym.id} className={styles.item}>
              <span className={styles.name}>{gym.name}</span>
              <div className={styles.actions}>
                <button 
                  className={`${styles.btn} ${styles.btnEdit}`}
                  onClick={() => onEditGym(gym)}
                >
                  {t('common.edit')}
                </button>
                <button 
                  className={`${styles.btn} ${styles.btnDelete}`}
                  onClick={() => onDeleteGym(gym.id)}
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
