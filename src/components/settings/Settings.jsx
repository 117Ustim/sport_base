import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { clientsService, authService } from '../../firebase/services';
import { EMPTY_CLIENT } from '../../constants';
// import { useLanguage } from '../../contexts/LanguageContext'; // Удаляем старый контекст
import { useTranslation } from 'react-i18next'; // Добавляем новый хук
import TemporaryDrawer from '../Drawer';
import ManageGyms from './ManageGyms';
import LanguageSelector from './LanguageSelector';
import AddClient from '../AddClient';
import BackButton from '../BackButton';
import styles from './Settings.module.scss';

export default function Settings() {
  const navigate = useNavigate();
  const { t } = useTranslation(); // Используем хук useTranslation
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

  const onLanguageClick = () => {
    setDrawerContent('language');
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

  const onMigrateWorkoutsClick = () => {
    navigate('/migrate-workouts');
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
      title: t('settings.manageGyms'),
      description: t('settings.manageGymsDesc'),
      onClick: onManageGymsClick
    },
    {
      icon: '👥',
      title: t('settings.manageClients'),
      description: t('settings.manageClientsDesc'),
      onClick: onManageClientsClick
    },
    {
      icon: '💪',
      title: t('settings.addExercise'),
      description: t('settings.addExerciseDesc'),
      onClick: onAddExerciseClick
    },
    {
      icon: '🔄',
      title: 'Миграция тренировок',
      description: 'Перенос weeks в subcollections',
      onClick: onMigrateWorkoutsClick
    },
    {
      icon: '🌐',
      title: t('settings.language'),
      description: t('settings.languageDesc'),
      onClick: onLanguageClick
    },
    {
      icon: '🚪',
      title: t('settings.logout'),
      description: t('settings.logoutDesc'),
      onClick: onLogoutClick,
      danger: true
    }
  ];

  return (
    <div className={styles.settings}>
      <div className={styles.header}>
        <BackButton onClick={onBackClick} />
        <h1 className={styles.pageTitle}>{t('settings.title')}</h1>
      </div>

      <div className={styles.content}>
        {menuItems.map((item, index) => (
          <div 
            key={index}
            className={`${styles.card} ${item.danger ? styles.cardDanger : ''}`}
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
        ) : drawerContent === 'language' ? (
          <LanguageSelector onClose={toggleDrawer('right', false)} />
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
