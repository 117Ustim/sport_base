import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { clientsService, gymsService } from '../../firebase/services';
import './manageClients.scss';

export default function ManageClients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [gyms, setGyms] = useState([]);
  const [searchName, setSearchName] = useState('');
  const [searchGym, setSearchGym] = useState('');
  const [searchSex, setSearchSex] = useState('');
  const [editingClient, setEditingClient] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadClients();
    loadGyms();
  }, []);

  useEffect(() => {
    filterClients();
  }, [clients, searchName, searchGym, searchSex]);

  const loadClients = () => {
    clientsService.getAll({ page: 0, limit: 1000 })
      .then((response) => {
        const clientsData = response.data || [];
        setClients(clientsData);
      })
      .catch((error) => {
        console.error('Помилка завантаження клієнтів:', error);
        setClients([]);
      });
  };

  const loadGyms = () => {
    gymsService.getAll()
      .then((data) => {
        setGyms(data);
      })
      .catch((error) => {
        console.error('Помилка завантаження залів:', error);
      });
  };

  const filterClients = () => {
    let filtered = clients.filter(client => client.data !== null);

    if (searchName) {
      filtered = filtered.filter(client => {
        const fullName = `${client.data?.surname || ''} ${client.data?.name || ''}`.toLowerCase();
        return fullName.includes(searchName.toLowerCase());
      });
    }

    if (searchGym) {
      filtered = filtered.filter(client => client.data?.gym === searchGym);
    }

    if (searchSex) {
      filtered = filtered.filter(client => client.data?.sex === searchSex);
    }

    setFilteredClients(filtered);
  };

  const onEditClient = (client) => {
    if (!client.data) {
      client.data = {};
    }
    setEditingClient({ ...client });
    setShowModal(true);
  };

  const onDeleteClient = (id) => {
    if (window.confirm('Ви впевнені, що хочете видалити цього клієнта?')) {
      clientsService.delete(id)
        .then(() => {
          loadClients();
        })
        .catch((error) => {
          console.error('Помилка видалення клієнта:', error);
        });
    }
  };

  const onSaveClient = () => {
    if (!editingClient) return;

    clientsService.update(editingClient.id, editingClient.data)
      .then(() => {
        loadClients();
        setShowModal(false);
        setEditingClient(null);
      })
      .catch((error) => {
        console.error('Помилка оновлення клієнта:', error);
      });
  };

  const onModalChange = (field, value) => {
    setEditingClient({
      ...editingClient,
      data: {
        ...editingClient.data,
        [field]: value
      }
    });
  };

  const onBackClick = () => {
    navigate('/settings');
  };

  return (
    <div className='manage-clients'>
      <div className='manage-clients__header'>
        <button className='manage-clients__back-btn' onClick={onBackClick}>
          <span className='manage-clients__back-icon'>←</span>
        </button>
        <h1 className='manage-clients__title'>Клієнти</h1>
      </div>

      <div className='manage-clients__search-container'>
        <input
          type='text'
          placeholder='Пошук по імені'
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          className='manage-clients__search'
        />
      </div>

      <div className='manage-clients__list'>
        {filteredClients.length === 0 ? (
          <p className='manage-clients__empty'>Клієнтів не знайдено</p>
        ) : (
          filteredClients.map((client) => (
            <div 
              key={client.id} 
              className='manage-clients__item'
              onClick={() => onEditClient(client)}
            >
              <div className='manage-clients__item-content'>
                <div className='manage-clients__item-name'>
                  {client.data?.surname || ''} {client.data?.name || ''}
                </div>
                <div className='manage-clients__item-gym'>
                  {client.data?.gym || 'Не вказано'}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && editingClient && (
        <div className='manage-clients__modal' onClick={() => setShowModal(false)}>
          <div className='manage-clients__modal-content' onClick={(e) => e.stopPropagation()}>
            <div className='manage-clients__modal-header'>
              <h2>Редагувати клієнта</h2>
              <button className='manage-clients__close' onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>
            <div className='manage-clients__form'>
              <input
                type='text'
                placeholder='Прізвище'
                value={editingClient.data.surname || ''}
                onChange={(e) => onModalChange('surname', e.target.value)}
                className='manage-clients__form-input'
              />
              <input
                type='text'
                placeholder="Ім'я"
                value={editingClient.data.name || ''}
                onChange={(e) => onModalChange('name', e.target.value)}
                className='manage-clients__form-input'
              />
              <input
                type='text'
                placeholder='Телефон'
                value={editingClient.data.phone || ''}
                onChange={(e) => onModalChange('phone', e.target.value)}
                className='manage-clients__form-input'
              />
              <select
                value={editingClient.data.sex || ''}
                onChange={(e) => onModalChange('sex', e.target.value)}
                className='manage-clients__form-input'
              >
                <option value=''>Стать</option>
                <option value='Чоловiча'>Чоловіча</option>
                <option value='Жiноча'>Жіноча</option>
              </select>
              <select
                value={editingClient.data.gym || ''}
                onChange={(e) => onModalChange('gym', e.target.value)}
                className='manage-clients__form-input'
              >
                <option value=''>Зал</option>
                {gyms.map((gym) => (
                  <option key={gym.id} value={gym.name}>
                    {gym.name}
                  </option>
                ))}
              </select>
              <div className='manage-clients__form-buttons'>
                <button
                  className='manage-clients__form-btn manage-clients__form-btn--save'
                  onClick={onSaveClient}
                >
                  Зберегти
                </button>
                <button
                  className='manage-clients__form-btn manage-clients__form-btn--delete'
                  onClick={() => {
                    setShowModal(false);
                    onDeleteClient(editingClient.id);
                  }}
                >
                  Видалити
                </button>
                <button
                  className='manage-clients__form-btn manage-clients__form-btn--cancel'
                  onClick={() => setShowModal(false)}
                >
                  Скасувати
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
