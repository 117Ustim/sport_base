import React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useSearchParams } from 'react-router-dom';
import { EMPTY_CLIENT } from '../../constants';
import { createSearchParams } from 'react-router-dom';
import { gymsService, clientsService } from '../../firebase/services';
import ListAddClients from '../listAddClients/ListAddClients';
import TemporaryDrawer from './../drawer/TemporaryDrawer';
import AddClient from '../addClient/AddClient';
import ClientData from './../clientData/ClientData';
import settingsIcon from '../settings/settings-icon.svg';


export default function Home() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const[search,setSearch]= useState({page:1,limit:10});

  const [contacts, setContacts] = useState(EMPTY_CLIENT);
  const [openDrawer, setOpenDrawer] = useState({ right: false });
  const [gyms, setGyms] = useState([]);

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

  const onChange = (event) => {
    const { name, value } = event.target;
    const val = value !== '' ? value[0].toUpperCase() + value.slice(1) : '';
    setContacts({ ...contacts, [name]: val });
  };

  const onAddContactClick = () => {
    setContacts(EMPTY_CLIENT);
    clientsService.create(contacts).then(() => {});
    setOpenDrawer({ right: false });
  };

  const onButtonExercises = () => {
    navigate('/edit_client_base');
  };

  const onSettingsClick = () => {
    navigate('/settings');
  };

  const toggleDrawer = (anchor, open) => (event) => {
    if (
      event.type === 'keydown' &&
      (event.key === 'Tab' || event.key === 'Shift')
    ) {
      setOpenDrawer({ ...openDrawer, [anchor]: false });
    } else {
      setOpenDrawer({ ...openDrawer, [anchor]: open });
    }
  };

  const onButtonSearch = () => {
    setSearch({
      gym: contacts.gym,
        sex: contacts.sex,
        // Параметры для страницы и колличество выводов на странице
        page: 1,
        limit: 10,
    });
    
  };

  return (
    <div className='home '>
      
      {/* ------------------------------------Settings Icon------------- */}
      <div className='settings-icon' onClick={onSettingsClick}>
        <img src={settingsIcon} alt='Settings' />
      </div>

      
     {/* ------------------------------------button-add_addExercises------------- */}
      {/* <form> */}
        <div className="_container">

        {/* Removed buttons - moved to Settings page */}
      {/* </form> */}


      {/* ---------------------------------------SEARCH    */}
      <div className='block_search '>
        {/* <form> */}
          <div className='segment _s'>
            <h1>Пошук</h1>
          </div>
          <div className='form_search '>
            <div className='home_input'>
              <div className='home-gym'>
                <select name='gym' onChange={onChange}>
                  <option className='select' value={''} defaultValue={''}>
                    Зал
                  </option>
                  {gyms.map((gym) => (
                    <option key={gym.id} value={gym.name}>
                      {gym.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className='home-sex'>
                <select name='sex' onChange={onChange}>
                  <option value={''} defaultValue={''}>
                    Стать
                  </option>
                  <option value={'Чоловiча'}>Чоловiча</option>
                  <option value={'Жiноча'}>Жiноча</option>
                </select>
              </div>
            </div>
            <div className='button_search'>
              <button
                onClick={onButtonSearch}
                className='red'
                type='button'
                value='Пошук'>
                <i className='icon ion-md-lock'></i>Пошук
              </button>
            </div>
          </div>
        {/* </form> */}
      </div>

     
      <TemporaryDrawer openDrawer={openDrawer} toggleDrawer={toggleDrawer}>
        <AddClient
          onChange={onChange}
          contacts={contacts}
          onAddContactClick={onAddContactClick}
        />
    
      </TemporaryDrawer>

     
     
      <div className="list-clients">
        
       <ListAddClients openDrawer={openDrawer} toggleDrawer={toggleDrawer}search={search}/> 
      </div>
        </div>
       
    
    </div>
  );
}
