import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { clientsService, gymsService } from '../../firebase/services';
import { useConfirmDialog } from '../../hooks';
import ConfirmDialog from '../ConfirmDialog';
import styles from './ManageClients.module.scss';

export default function ManageClients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [gyms, setGyms] = useState([]);
  const [searchName, setSearchName] = useState('');
  const [editingClient, setEditingClient] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { confirmDialog, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();

  useEffect(() => {
    loadClients();
    loadGyms();
  }, []);

  useEffect(() => {
    filterClients();
  }, [clients, searchName]);

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

    // Сортируем по фамилии в алфавитном порядке
    filtered.sort((a, b) => {
      const surnameA = (a.data?.surname || '').toLowerCase();
      const surnameB = (b.data?.surname || '').toLowerCase();
      return surnameA.localeCompare(surnameB, 'uk'); // 'uk' для украинского алфавита
    });

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
    const clientToDelete = clients.find(c => c.id === id);
    const clientName = clientToDelete?.data 
      ? `${clientToDelete.data.surname || ''} ${clientToDelete.data.name || ''}`.trim()
      : 'цього клієнта';
    
    showConfirm(
      `Ви впевнені, що хочете видалити ${clientName}?`,
      async () => {
        try {
          await clientsService.delete(id);
          loadClients();
        } catch (error) {
          console.error('Помилка видалення клієнта:', error);
        }
      }
    );
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
    <div className={styles.manageClients}>
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        message={confirmDialog.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
      
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBackClick}>
          <span className={styles.backIcon}>←</span>
        </button>
        <h1 className={styles.title}>Клієнти</h1>
      </div>

      <div className={styles.searchContainer}>
        <input
          type='text'
          placeholder='Пошук по імені'
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          className={styles.search}
        />
      </div>

      <div className={styles.list}>
        {filteredClients.length === 0 ? (
          <p className={styles.empty}>Клієнтів не знайдено</p>
        ) : (
          filteredClients.map((client) => (
            <div 
              key={client.id} 
              className={styles.item}
              onClick={() => onEditClient(client)}
            >
              <div className={styles.itemContent}>
                <div className={styles.itemName}>
                  {client.data?.surname || ''} {client.data?.name || ''}
                </div>
                <div className={styles.itemGym}>
                  {client.data?.gym || 'Не вказано'}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && editingClient && (
        <div className={styles.modal} onClick={() => setShowModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Редагувати клієнта</h2>
              <button className={styles.close} onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>
            <div className={styles.form}>
              <input
                type='text'
                placeholder='Прізвище'
                value={editingClient.data.surname || ''}
                onChange={(e) => onModalChange('surname', e.target.value)}
                className={styles.formInput}
              />
              <input
                type='text'
                placeholder="Ім'я"
                value={editingClient.data.name || ''}
                onChange={(e) => onModalChange('name', e.target.value)}
                className={styles.formInput}
              />
              <input
                type='text'
                placeholder='Телефон'
                value={editingClient.data.phone || ''}
                onChange={(e) => onModalChange('phone', e.target.value)}
                className={styles.formInput}
              />
              <select
                value={editingClient.data.sex || ''}
                onChange={(e) => onModalChange('sex', e.target.value)}
                className={styles.formInput}
              >
                <option value=''>Стать</option>
                <option value='Чоловiча'>Чоловіча</option>
                <option value='Жiноча'>Жіноча</option>
              </select>
              <select
                value={editingClient.data.gym || ''}
                onChange={(e) => onModalChange('gym', e.target.value)}
                className={styles.formInput}
              >
                <option value=''>Зал</option>
                {gyms.map((gym) => (
                  <option key={gym.id} value={gym.name}>
                    {gym.name}
                  </option>
                ))}
              </select>
              <div className={styles.formButtons}>
                <button
                  className={`${styles.formBtn} ${styles.formBtnSave}`}
                  onClick={onSaveClient}
                >
                  Зберегти
                </button>
                <button
                  className={`${styles.formBtn} ${styles.formBtnDelete}`}
                  onClick={() => {
                    setShowModal(false);
                    onDeleteClient(editingClient.id);
                  }}
                >
                  Видалити
                </button>
                <button
                  className={`${styles.formBtn} ${styles.formBtnCancel}`}
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
