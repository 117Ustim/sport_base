import React, { useState, useEffect } from 'react';
import { gymsService } from '../../firebase/services';
import './manageGyms.scss';

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
      // Редагування
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
      // Додавання
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
    <div className='manage-gyms'>
      <div className='manage-gyms__header'>
        <h2>Управління залами</h2>
        <button className='manage-gyms__close' onClick={onClose}>✕</button>
      </div>

      <div className='manage-gyms__form'>
        <input
          type='text'
          placeholder='Назва залу'
          value={gymName}
          onChange={(e) => setGymName(e.target.value)}
          className='manage-gyms__input'
        />
        <div className='manage-gyms__buttons'>
          <button 
            className='manage-gyms__btn manage-gyms__btn--add' 
            onClick={onAddGym}
          >
            {editingGym ? 'Зберегти' : 'Додати'}
          </button>
          {editingGym && (
            <button 
              className='manage-gyms__btn manage-gyms__btn--cancel' 
              onClick={onCancelEdit}
            >
              Скасувати
            </button>
          )}
        </div>
      </div>

      <div className='manage-gyms__list'>
        <h3>Список залів</h3>
        {gyms.length === 0 ? (
          <p className='manage-gyms__empty'>Немає залів</p>
        ) : (
          gyms.map((gym) => (
            <div key={gym.id} className='manage-gyms__item'>
              <span className='manage-gyms__name'>{gym.name}</span>
              <div className='manage-gyms__actions'>
                <button 
                  className='manage-gyms__btn manage-gyms__btn--edit'
                  onClick={() => onEditGym(gym)}
                >
                  Редагувати
                </button>
                <button 
                  className='manage-gyms__btn manage-gyms__btn--delete'
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
