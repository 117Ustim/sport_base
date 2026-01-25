import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { clientsService, authService } from '../../firebase/services';
import { migrateClients } from '../../firebase/migrateClients';
import { EMPTY_CLIENT } from '../../constants';
import TemporaryDrawer from '../Drawer';
import ManageGyms from './ManageGyms';
import AddClient from '../AddClient';
import styles from './Settings.module.scss';

export default function Settings() {
  const navigate = useNavigate();
  const [openDrawer, setOpenDrawer] = useState({ right: false });
  const [drawerContent, setDrawerContent] = useState('gyms');
  const [contacts, setContacts] = useState(EMPTY_CLIENT);
  const [migrationStatus, setMigrationStatus] = useState('');

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
  
  const onMigrateClientsClick = async () => {
    if (window.confirm('Вы уверены, что хотите обновить структуру данных клиентов? Это безопасная операция, но рекомендуется сделать резервную копию.')) {
      setMigrationStatus('Выполняется миграция...');
      const result = await migrateClients();
      setMigrationStatus(result.message);
      setTimeout(() => setMigrationStatus(''), 5000);
    }
  };

  const onChange = (event) => {
    const { name, value, gymId } = event.target;
    
    // Если это изменение зала с gymId
    if (name === 'gym' && gymId !== undefined) {
      setContacts({ ...contacts, gym: value, gymId: gymId });
    } else {
      const val = value !== '' && typeof value === 'string' ? value[0].toUpperCase() + value.slice(1) : value;
      setContacts({ ...contacts, [name]: val });
    }
  };

  const onAddContactClick = () => {
    clientsService.create(contacts).then(() => {
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
      icon: '🔄',
      title: 'Оновити структуру даних',
      description: 'Синхронізація з мобільною версією',
      onClick: onMigrateClientsClick,
      warning: true
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
    <div className={styles.settings}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBackClick}>
          <span className={styles.backIcon}>←</span>
        </button>
        <h1 className={styles.title}>Главная</h1>
      </div>

      <div className={styles.content}>
        {migrationStatus && (
          <div className={styles.migrationStatus}>
            {migrationStatus}
          </div>
        )}
        
        {menuItems.map((item, index) => (
          <div 
            key={index}
            className={`${styles.card} ${item.danger ? styles.cardDanger : ''} ${item.warning ? styles.cardWarning : ''}`}
            onClick={item.onClick}
          >
            <div className={styles.cardIcon}>{item.icon}</div>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              <p className={styles.cardDescription}>{item.description}</p>
            </div>
            <div className={styles.cardArrow}>→</div>
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
