import { useState, useEffect } from 'react';
import { gymsService } from '../../firebase/services';
import styles from './AddClient.module.scss';

export default function AddClient({ contacts, onChange, onAddContactClick }) {
  const [gyms, setGyms] = useState([]);

  useEffect(() => {
    gymsService.getAll()
      .then(setGyms)
      .catch((error) => console.error('Помилка завантаження залів:', error));
  }, []);

  return (
    <div className={styles.addClient}>
      <div className={styles.form}>
        <div className={styles.inputs}>
          <div className={styles.segment}>
            <h1>Додати клiента</h1>
          </div>
          <input
            placeholder='Прізвище'
            value={contacts.surname}
            onChange={onChange}
            name='surname'
          />
          <input
            placeholder="Iм'я"
            value={contacts.name}
            name='name'
            onChange={onChange}
          />
          <input
            placeholder='Телефон'
            value={+contacts.phone || ''}
            name='phone'
            onChange={onChange}
          />

          <select value={contacts.sex || ''} name='sex' onChange={onChange}>
            <option value=''>Стать</option>
            <option value='Чоловiча'>Чоловiча</option>
            <option value='Жiноча'>Жiноча</option>
          </select>

          <select value={contacts.gym || ''} name='gym' onChange={onChange}>
            <option value=''>Зал</option>
            {gyms.map((gym) => (
              <option key={gym.id} value={gym.name}>
                {gym.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.button}>
          <button onClick={onAddContactClick} className='red' type='button'>
            <i className='icon ion-md-lock'></i>Додати
          </button>
        </div>
      </div>
    </div>
  );
}
