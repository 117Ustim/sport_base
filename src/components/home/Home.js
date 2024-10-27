import React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useSearchParams } from 'react-router-dom';
import { EMPTY_CLIENT } from '../../constants';
import { createSearchParams } from 'react-router-dom';
import axios from 'axios';
import ListAddClients from '../listAddClients/ListAddClients';
import TemporaryDrawer from './../drawer/TemporaryDrawer';
import AddClient from '../addClient/AddClient';
import ClientData from './../clientData/ClientData';


export default function Home() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const[search,setSearch]= useState({page:1,limit:10});

  const [contacts, setContacts] = useState(EMPTY_CLIENT);
  const [openDrawer, setOpenDrawer] = useState({ right: false });

  const onChange = (event) => {
    const { name, value } = event.target;
    const val = value !== '' ? value[0].toUpperCase() + value.slice(1) : '';
    setContacts({ ...contacts, [name]: val });
  };

  const onAddContactClick = () => {
    setContacts(EMPTY_CLIENT);

    axios.post('http://localhost:9000/clients', contacts).then((data) => {});
     setOpenDrawer({ right: false });
  };

  const onButtonExercises = () => {
    navigate('/edit_client_base');
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

      
     {/* ------------------------------------button-add_addExercises------------- */}
      {/* <form> */}
        <div className="_container">

        <div className='button-add_button-addExercises'>
          <div className='button-add'>
            <button
              className='red'
              type='button'
              // value='Додати клiента'
              onClick={(e) => toggleDrawer('right', true)(e)}>
              <i className='icon ion-md-lock'></i>Додати клiента
            </button>
          </div>

          <div className='button_addExercises'>
            <button
              className='red'
              type='button'
              // value='Додати клiента'
              onClick={onButtonExercises}>
              <i className='icon ion-md-lock'></i>Додати вправу
            </button>
          </div>
        </div>
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
                  <option value={'Аватар'}>Аватар</option>
                  <option value={'Галактика'}>Галактiка</option>
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
