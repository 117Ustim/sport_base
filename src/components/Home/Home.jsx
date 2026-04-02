import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { EMPTY_CLIENT } from '../../constants';
import { gymsService, clientsService } from '../../firebase/services';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext'; // Импорт useTheme
import ListAddClients from '../ListAddClients';
import TemporaryDrawer from '../Drawer';
import AddClient from '../AddClient';
import CustomSelect from '../CustomSelect';
import settingsIcon from '../Settings/settings-icon.svg';
import styles from './Home.module.scss';

const HOME_SELECTED_GYM_KEY = 'home:selectedGym';
const HOME_SELECTED_GYM_ID_KEY = 'home:selectedGymId';

export default function Home() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { theme } = useTheme(); // Получаем текущую тему
  const [search, setSearch] = useState(() => ({
    page: 1,
    limit: 10,
    gym: localStorage.getItem(HOME_SELECTED_GYM_KEY) || '',
    gymId: localStorage.getItem(HOME_SELECTED_GYM_ID_KEY) || '',
  }));
  const [contacts, setContacts] = useState(EMPTY_CLIENT);
  const [openDrawer, setOpenDrawer] = useState({ right: false });
  const [gyms, setGyms] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Триггер для обновления списка

  const loadGyms = useCallback(() => {
    gymsService.getAll()
      .then(setGyms)
      .catch((error) => console.error('Помилка завантаження залів:', error));
  }, []);

  useEffect(() => {
    loadGyms();
  }, [loadGyms]);

  useEffect(() => {
    const handleWindowFocus = () => {
      loadGyms();
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [loadGyms]);

  useEffect(() => {
    if (!search.gym) {
      localStorage.removeItem(HOME_SELECTED_GYM_KEY);
      localStorage.removeItem(HOME_SELECTED_GYM_ID_KEY);
      return;
    }

    localStorage.setItem(HOME_SELECTED_GYM_KEY, search.gym);
    if (search.gymId) {
      localStorage.setItem(HOME_SELECTED_GYM_ID_KEY, search.gymId);
    } else {
      localStorage.removeItem(HOME_SELECTED_GYM_ID_KEY);
    }
  }, [search.gym, search.gymId]);

  useEffect(() => {
    if (gyms.length === 0 || !search.gym) return;

    const gymExists = gyms.some((gym) =>
      search.gymId ? gym.id === search.gymId : gym.name === search.gym
    );
    if (!gymExists) {
      setSearch((prev) => ({ ...prev, gym: '', gymId: '' }));
    }
  }, [gyms, search.gym, search.gymId]);

  const onChange = (event) => {
    const { name, value, gymId } = event.target;
    
    // Если это изменение зала — всегда синхронизируем и gym, и gymId
    if (name === 'gym') {
      setContacts({ ...contacts, gym: value, gymId: gymId || '' });
    } else {
      // Не применяем капитализацию к специальным значениям
      let val = value;
      if (value !== '' && typeof value === 'string' && value !== 'all') {
        val = value[0].toUpperCase() + value.slice(1);
      }
      setContacts({ ...contacts, [name]: val });
    }
  };

  const onAddContactClick = () => {
    clientsService.create(contacts).then(() => {
      setContacts(EMPTY_CLIENT);
      setOpenDrawer({ right: false });
      setRefreshTrigger(prev => prev + 1); // Триггерим обновление списка
    });
  };

  const onSettingsClick = () => {
    navigate('/settings');
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

  const onButtonSearch = () => {
    setSearch({
      gym: contacts.gym === 'all' ? '' : contacts.gym,
      gymId: contacts.gym === 'all' ? '' : (contacts.gymId || ''),
      sex: contacts.sex === 'all' ? '' : contacts.sex,
      page: 1,
      limit: 10,
    });
  };

  const onGymFilterClick = (gym) => {
    const selectedGymName = gym?.name || '';
    const selectedGymId = gym?.id || '';

    setSearch((prev) => ({
      ...prev,
      gym: selectedGymName,
      gymId: selectedGymId,
      page: 1,
      limit: 10,
    }));
  };

  return (
    <div className={`${styles.home} ${theme === 'dark' ? styles.dark : ''}`}>
      <div className={styles.settingsIcon} onClick={onSettingsClick}>
        <img src={settingsIcon} alt='Settings' />
      </div>

      <div className={styles.container}>
        <div className={styles.blockSearch}>
          <div className={styles.segment}>
            <h1>{t('home.search')}</h1>
          </div>
          <div className={styles.formSearch}>
            <div className={styles.homeInput}>
              <div className={styles.homeGym}>
                <CustomSelect
                  name="gym"
                  value={contacts.gym || ''}
                  onChange={onChange}
                  placeholder={t('home.gym')}
                  className="compact"
                  options={[
                    { value: 'all', label: t('home.all') },
                    ...gyms.map(gym => ({
                      value: gym.name,
                      label: gym.name,
                      gymId: gym.id
                    }))
                  ]}
                />
              </div>

              <div className={styles.homeSex}>
                <CustomSelect
                  name="sex"
                  value={contacts.sex || ''}
                  onChange={onChange}
                  placeholder={t('home.sex')}
                  className="compact"
                  options={[
                    { value: 'all', label: t('home.all') },
                    { value: 'Чоловiча', label: t('home.male') },
                    { value: 'Жiноча', label: t('home.female') }
                  ]}
                />
              </div>
            </div>
            <div className={styles.buttonSearch}>
              <button onClick={onButtonSearch} type='button'>
                {t('home.search')}
              </button>
            </div>
          </div>
        </div>

        <TemporaryDrawer openDrawer={openDrawer} toggleDrawer={toggleDrawer}>
          <AddClient
            onChange={onChange}
            contacts={contacts}
            onAddContactClick={onAddContactClick}
          />
        </TemporaryDrawer>

        <div className={styles.contentLayout}>
          <div className={styles.listClients}>
            <div className={styles.gymsBar}>
              <div className={styles.gymsTitle}>{t('home.gym')}</div>
              <div className={styles.gymsButtons}>
                {gyms.map((gym) => (
                  <button
                    key={gym.id}
                    type="button"
                    className={`${styles.gymButton} ${search.gym === gym.name ? styles.gymButtonActive : ''}`}
                    onClick={() => onGymFilterClick(gym)}
                  >
                    {gym.name}
                  </button>
                ))}
              </div>
            </div>
            <ListAddClients 
              openDrawer={openDrawer} 
              toggleDrawer={toggleDrawer}
              search={search}
              refreshTrigger={refreshTrigger}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
