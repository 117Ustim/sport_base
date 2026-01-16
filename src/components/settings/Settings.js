import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { clientsService, authService } from '../../firebase/services';
import { EMPTY_CLIENT } from '../../constants';
import TemporaryDrawer from '../drawer/TemporaryDrawer';
import ManageGyms from './ManageGyms';
import AddClient from '../addClient/AddClient';
import './settings.scss';

export default function Settings() {
  const navigate = useNavigate();
  const [openDrawer, setOpenDrawer] = useState({ right: false });
  const [drawerContent, setDrawerContent] = useState('gyms');
  const [contacts, setContacts] = useState(EMPTY_CLIENT);

  const onBackClick = () => {
    navigate('/');
  };

  const onLogoutClick = () => {
    authService.logout();
  };

  const toggleDrawer = (anchor, open) => (event) => {
    if (
      event.type === 'keydown' &&
      (event.key === 'Tab' || event.key === 'Shift')
    ) {
      return;
    }
    setOpenDrawer({ ...openDrawer, [anchor]: open });
  };

  const onManageGymsClick = () => {
    setDrawerContent('gyms');
    setOpenDrawer({ right: true });
  };

  const onAddClientClick = () => {
    setContacts(EMPTY_CLIENT);
    setDrawerContent('client');
    setOpenDrawer({ right: true });
  };

  const onAddExerciseClick = () => {
    navigate('/edit_client_base');
  };

  const onManageClientsClick = () => {
    navigate('/manage-clients');
  };

  const onChange = (event) => {
    const { name, value } = event.target;
    const val = value !== '' ? value[0].toUpperCase() + value.slice(1) : '';
    setContacts({ ...contacts, [name]: val });
  };

  const onAddContactClick = () => {
    clientsService.create(contacts).then((data) => {
      setOpenDrawer({ right: false });
      setContacts(EMPTY_CLIENT);
    });
  };

  const menuItems = [
    {
      icon: '🏢',
      title: 'Управління залами',
      description: 'Додавайте та редагуйте зали',
      onClick: onManageGymsClick
    },
    {
      icon: '👥',
      title: 'Управління клієнтами',
      description: 'Перегляд та редагування клієнтів',
      onClick: onManageClientsClick
    },
    {
      icon: '➕',
      title: 'Додати клієнта',
      description: 'Створити нового клієнта',
      onClick: onAddClientClick
    },
    {
      icon: '💪',
      title: 'Додати вправу',
      description: 'Створити нову вправу',
      onClick: onAddExerciseClick
    },
    {
      icon: '🚪',
      title: 'Вихід',
      description: 'Вийти з облікового запису',
      onClick: onLogoutClick,
      danger: true
    }
  ];

  return (
    <div className='settings'>
      <div className='settings__header'>
        <button className='settings__back-btn' onClick={onBackClick}>
          <span className='settings__back-icon'>←</span>
        </button>
        <h1 className='settings__title'>Главная</h1>
      </div>

      <div className='settings__content'>
        {menuItems.map((item, index) => (
          <div 
            key={index}
            className={`settings__card ${item.danger ? 'settings__card--danger' : ''}`}
            onClick={item.onClick}
          >
            <div className='settings__card-icon'>{item.icon}</div>
            <div className='settings__card-content'>
              <h3 className='settings__card-title'>{item.title}</h3>
              <p className='settings__card-description'>{item.description}</p>
            </div>
            <div className='settings__card-arrow'>→</div>
          </div>
        ))}
      </div>

      <TemporaryDrawer openDrawer={openDrawer} toggleDrawer={toggleDrawer}>
        {drawerContent === 'gyms' ? (
          <ManageGyms onClose={toggleDrawer('right', false)} />
        ) : (
          <AddClient
            onChange={onChange}
            contacts={contacts}
            onAddContactClick={onAddContactClick}
          />
        )}
      </TemporaryDrawer>
    </div>
  );
}
