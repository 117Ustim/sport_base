import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { gymsService } from '../../firebase/services';
import styles from './AddClient.module.scss';

export default function AddClient({ contacts, onChange, onAddContactClick }) {
  const { t } = useTranslation();
  const [gyms, setGyms] = useState([]);

  useEffect(() => {
    gymsService.getAll()
      .then(setGyms)
      .catch((error) => console.error('Error loading gyms:', error));
  }, []);

  // Обработчик изменения с поддержкой gymId
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Если меняется зал, также обновляем gymId
    if (name === 'gym') {
      const selectedGym = gyms.find(g => g.name === value);
      onChange({
        target: {
          name: 'gym',
          value: value,
          gymId: selectedGym?.id || ''
        }
      });
    } else {
      onChange(e);
    }
  };

  return (
    <div className={styles.addClient}>
      <div className={styles.form}>
        <div className={styles.inputs}>
          <div className={styles.segment}>
            <h1>{t('manageClients.addClient')}</h1>
          </div>
          <input
            placeholder={t('manageClients.surname')}
            value={contacts.surname}
            onChange={handleChange}
            name='surname'
          />
          <input
            placeholder={t('manageClients.name')}
            value={contacts.name}
            name='name'
            onChange={handleChange}
          />
          <input
            placeholder={t('manageClients.phone')}
            value={+contacts.phone || ''}
            name='phone'
            onChange={handleChange}
          />

          <select value={contacts.sex || ''} name='sex' onChange={handleChange}>
            <option value=''>{t('home.sex')}</option>
            <option value='Чоловiча'>{t('home.male')}</option>
            <option value='Жiноча'>{t('home.female')}</option>
          </select>

          <select value={contacts.gym || ''} name='gym' onChange={handleChange}>
            <option value=''>{t('home.gym')}</option>
            {gyms.map((gym) => (
              <option key={gym.id} value={gym.name}>
                {gym.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.button}>
          <button onClick={onAddContactClick} className='red' type='button'>
            <i className='icon ion-md-lock'></i>{t('common.add')}
          </button>
        </div>
      </div>
    </div>
  );
}
