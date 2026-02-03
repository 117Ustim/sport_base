import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { EMPTY_CLIENT } from '../../constants';
import { gymsService, clientsService } from '../../firebase/services';
import { useTranslation } from 'react-i18next';
import ListAddClients from '../ListAddClients';
import TemporaryDrawer from '../Drawer';
import AddClient from '../AddClient';
import CustomSelect from '../CustomSelect';
import settingsIcon from '../Settings/settings-icon.svg';
import styles from './Home.module.scss';

export default function Home() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [search, setSearch] = useState({ page: 1, limit: 10 });
  const [contacts, setContacts] = useState(EMPTY_CLIENT);
  const [openDrawer, setOpenDrawer] = useState({ right: false });
  const [gyms, setGyms] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Триггер для обновления списка

  useEffect(() => {
    gymsService.getAll()
      .then(setGyms)
      .catch((error) => console.error('Помилка завантаження залів:', error));
  }, []);

  const onChange = (event) => {
    const { name, value, gymId } = event.target;
    
    // Если это изменение зала с gymId
    if (name === 'gym' && gymId !== undefined) {
      setContacts({ ...contacts, gym: value, gymId: gymId });
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
      sex: contacts.sex === 'all' ? '' : contacts.sex,
      page: 1,
      limit: 10,
    });
  };

  return (
    <div className={styles.home}>
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

        <div className={styles.listClients}>
          <ListAddClients 
            openDrawer={openDrawer} 
            toggleDrawer={toggleDrawer}
            search={search}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </div>
    </div>
  );
}
