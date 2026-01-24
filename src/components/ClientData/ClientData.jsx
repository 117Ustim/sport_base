import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { clientsService } from '../../firebase/services';
import { SnackbarProvider, enqueueSnackbar } from 'notistack';
import { EMPTY_CLIENT } from '../../constants';
import styles from './ClientData.module.scss';

export default function ClientData({ contactId }) {
  const params = useParams();
  const [dataUpdateClient, setDataUpdateClient] = useState(EMPTY_CLIENT);

  useEffect(() => {
    clientsService.getById(contactId).then((resp) => {
      console.log(resp?.data);
      setDataUpdateClient(resp?.data || EMPTY_CLIENT);
    });
  }, [contactId]);

  const onChange = (event) => {
    const { name, value } = event.target;
    const val = value !== '' ? value[0].toUpperCase() + value.slice(1) : '';
    setDataUpdateClient({ ...dataUpdateClient, [name]: val });
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
          <option value='Аватар'>Аватар</option>
          <option value='Галактика'>Галактiка</option>
        </select>

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
