import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { clientsService, gymsService } from '../../firebase/services';
import { SnackbarProvider, enqueueSnackbar } from 'notistack';
import { EMPTY_CLIENT } from '../../constants';
import styles from './ClientData.module.scss';

export default function ClientData({ contactId }) {
  const params = useParams();
  const [dataUpdateClient, setDataUpdateClient] = useState(EMPTY_CLIENT);
  const [gyms, setGyms] = useState([]);

  useEffect(() => {
    // Загружаем залы
    gymsService.getAll()
      .then(setGyms)
      .catch((error) => console.error('Помилка завантаження залів:', error));
      
    // Загружаем данные клиента
    clientsService.getById(contactId).then((resp) => {
      setDataUpdateClient(resp?.data || EMPTY_CLIENT);
    });
  }, [contactId]);

  const onChange = (event) => {
    const { name, value } = event.target;
    
    // Если меняется зал, также обновляем gymId
    if (name === 'gym') {
      const selectedGym = gyms.find(g => g.name === value);
      setDataUpdateClient({ 
        ...dataUpdateClient, 
        gym: value,
        gymId: selectedGym?.id || ''
      });
    } else {
      const val = value !== '' && typeof value === 'string' ? value[0].toUpperCase() + value.slice(1) : value;
      setDataUpdateClient({ ...dataUpdateClient, [name]: val });
    }
  };

  const onAddContactClick = () => {
    clientsService.update(contactId, dataUpdateClient).then(() => {
      enqueueSnackbar('Изменения сохранены!', { autoHideDuration: 1500 });
    });
  };

  return (
    <div className={styles.clientData}>
      <div className={styles.segment}>
        <h1>Редагування</h1>
      </div>

      <div className={styles.inputs}>
        <input
          placeholder='Призвiще'
          value={dataUpdateClient?.surname || ''}
          onChange={onChange}
          name='surname'
        />

        <input
          placeholder='Iмя'
          value={dataUpdateClient?.name || ''}
          onChange={onChange}
          name='name'
        />

        <input
          placeholder='Телефон'
          value={+dataUpdateClient?.phone || ''}
          onChange={onChange}
          name='phone'
        />

        <input
          placeholder='Адреса'
          value={dataUpdateClient?.address || ''}
          onChange={onChange}
          name='address'
        />

        <input
          placeholder='Зрiст'
          value={+dataUpdateClient?.growth || ''}
          onChange={onChange}
          name='growth'
        />

        <input
          placeholder='Вага'
          value={+dataUpdateClient?.weight || ''}
          onChange={onChange}
          name='weight'
        />

        <select value={dataUpdateClient?.sex} name='sex' onChange={onChange}>
          <option value=''>Стать</option>
          <option value='Чоловiча'>Чоловiча</option>
          <option value='Жiноча'>Жiноча</option>
        </select>

        <select value={dataUpdateClient?.gym} name='gym' onChange={onChange}>
          <option value=''>Зал</option>
          {gyms.map((gym) => (
            <option key={gym.id} value={gym.name}>
              {gym.name}
            </option>
          ))}
        </select>
        
        {dataUpdateClient?.email && (
          <div style={{ padding: '10px', backgroundColor: '#e8f5e9', borderRadius: '4px', marginTop: '10px' }}>
            <strong>Email аккаунта:</strong> {dataUpdateClient.email}
          </div>
        )}

        <SnackbarProvider />
        <div className={styles.button}>
          <button onClick={onAddContactClick}>
            Зберегти
          </button>
        </div>
      </div>
    </div>
  );
}
