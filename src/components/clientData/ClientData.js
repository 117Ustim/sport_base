
import Avatar from '@mui/material/Avatar';
import PhotoAvatar from '../../customerPhotos/465758.jpg';
import { useNavigate } from 'react-router';
import { EMPTY_CLIENT } from '../../constants';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import axios from 'axios';
import { SnackbarProvider, enqueueSnackbar } from 'notistack';

export default function ClientData({contactId}) {
  const params = useParams();

  // const navigate = useNavigate();

  const [dataUpdateClient, setDataUpdateClient] = useState(EMPTY_CLIENT);

  // const onButtonBack = () => {
  //   navigate(-1);
  // };

  useEffect(() => {
    // запрос на сервер по id на изменение данных
    axios.get(`http://localhost:9000/clients/${contactId}`).then((resp) => {
      console.log(resp.data.data);
      setDataUpdateClient(resp.data.data);
    });
  }, [contactId]);

  const onChange = (event) => {
    const { name, value } = event.target;
    const val = value !== '' ? value[0].toUpperCase() + value.slice(1) : '';
    setDataUpdateClient({ ...dataUpdateClient, [name]: val });
  };

  const onAddContactClick = () => {
    // Запрос на редактирование
    axios
      .put(`http://localhost:9000/clients/${contactId}`, {
        data: dataUpdateClient,
      })
      .then((resp) => {
        // window.alert('Изменения сохранены');
      });
    enqueueSnackbar('Изменения сохранены!', { autoHideDuration: 1500 });
  };

  return (
    <div className='clientData'>
      {/* <button  onClick={onButtonBack}>
        Назад
      </button> */}

<div className='segment'>
            <h1>Редагування</h1>
          </div>
<div className="avatar">
   <Avatar
        alt='Remy Sharp'
        src={PhotoAvatar}
        sx={{ width: 100, height: 100 }}
      />
</div>
     

      <div className='clientData-inputs'>
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
          <option className='select' value={''} defaultValue={''}>
            Стать
          </option>
          <option value={'Чоловiча'}>Чоловiча</option>
          <option value={'Жiноча'}>Жiноча</option>
        </select>

        <select value={dataUpdateClient?.gym} name='gym' onChange={onChange}>
          <option value={''} defaultValue={''}>
            Зал
          </option>
          <option value={'Аватар'}>Аватар</option>
          <option value={'Галактика'}>Галактiка</option>
        </select>

        <SnackbarProvider />
<div className="clientData-button">
  <button  onClick={onAddContactClick}>
          Зберегти
        </button>
</div>
        
      </div>
    </div>
  );
}
