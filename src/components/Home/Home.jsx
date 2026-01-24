import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { EMPTY_CLIENT } from '../../constants';
import { gymsService, clientsService } from '../../firebase/services';
import ListAddClients from '../ListAddClients';
import TemporaryDrawer from '../Drawer';
import AddClient from '../AddClient';
import settingsIcon from '../Settings/settings-icon.svg';
import styles from './Home.module.scss';

export default function Home() {
  const navigate = useNavigate();
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
    const { name, value } = event.target;
    const val = value !== '' ? value[0].toUpperCase() + value.slice(1) : '';
    setContacts({ ...contacts, [name]: val });
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
      gym: contacts.gym,
      sex: contacts.sex,
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
            <h1>Пошук</h1>
          </div>
          <div className={styles.formSearch}>
            <div className={styles.homeInput}>
              <div className={styles.homeGym}>
                <select name='gym' onChange={onChange} value={contacts.gym || ''}>
                  <option value=''>Зал</option>
                  {gyms.map((gym) => (
                    <option key={gym.id} value={gym.name}>
                      {gym.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.homeSex}>
                <select name='sex' onChange={onChange} value={contacts.sex || ''}>
                  <option value=''>Стать</option>
                  <option value='Чоловiча'>Чоловiча</option>
                  <option value='Жiноча'>Жiноча</option>
                </select>
              </div>
            </div>
            <div className={styles.buttonSearch}>
              <button onClick={onButtonSearch} type='button'>
                Пошук
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
