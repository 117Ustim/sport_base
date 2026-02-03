import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { clientsService, gymsService } from '../../firebase/services';
import { useConfirmDialog } from '../../hooks';
import { EMPTY_CLIENT } from '../../constants';
import ConfirmDialog from '../ConfirmDialog';
import BackButton from '../BackButton';
import styles from './ManageClients.module.scss';

export default function ManageClients() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [gyms, setGyms] = useState([]);
  const [searchName, setSearchName] = useState('');
  const [editingClient, setEditingClient] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
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
        console.error('Error loading clients:', error);
        setClients([]);
      });
  };

  const loadGyms = () => {
    gymsService.getAll()
      .then((data) => {
        setGyms(data);
      })
      .catch((error) => {
        console.error('Error loading gyms:', error);
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

    filtered.sort((a, b) => {
      const surnameA = (a.data?.surname || '').toLowerCase();
      const surnameB = (b.data?.surname || '').toLowerCase();
      return surnameA.localeCompare(surnameB, 'uk');
    });

    setFilteredClients(filtered);
  };

  const onEditClient = (client) => {
    if (!client.data) {
      client.data = {};
    }
    setEditingClient({ ...client });
    setIsAddingNew(false);
    setShowModal(true);
  };

  const onAddNewClient = () => {
    setEditingClient({ 
      id: null, 
      data: { ...EMPTY_CLIENT } 
    });
    setIsAddingNew(true);
    setShowModal(true);
  };

  const onDeleteClient = (id) => {
    const clientToDelete = clients.find(c => c.id === id);
    const clientName = clientToDelete?.data 
      ? `${clientToDelete.data.surname || ''} ${clientToDelete.data.name || ''}`.trim()
      : 'client';
    
    showConfirm(
      t('dialogs.confirmDeleteClient', { name: clientName }),
      async () => {
        try {
          await clientsService.delete(id);
          loadClients();
        } catch (error) {
          console.error('Error deleting client:', error);
        }
      }
    );
  };

  const onSaveClient = () => {
    if (!editingClient) return;

    if (isAddingNew) {
      clientsService.create(editingClient.data)
        .then(() => {
          loadClients();
          setShowModal(false);
          setEditingClient(null);
          setIsAddingNew(false);
        })
        .catch((error) => {
          console.error('Error creating client:', error);
        });
    } else {
      clientsService.update(editingClient.id, editingClient.data)
        .then(() => {
          loadClients();
          setShowModal(false);
          setEditingClient(null);
        })
        .catch((error) => {
          console.error('Error updating client:', error);
        });
    }
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
        <div className={styles.headerLeft}>
          <BackButton onClick={onBackClick} />
          <h1 className={styles.pageTitle}>{t('manageClients.title')}</h1>
        </div>
        <button className={styles.addBtn} onClick={onAddNewClient} title={t('manageClients.addClient')}>
          <span className={styles.addIcon}>+</span>
        </button>
      </div>

      <div className={styles.searchContainer}>
        <input
          type='text'
          placeholder={t('manageClients.searchPlaceholder')}
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          className={styles.search}
        />
      </div>

      <div className={styles.list}>
        {filteredClients.length === 0 ? (
          <p className={styles.empty}>{t('manageClients.noClients')}</p>
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
                  {client.data?.gym || t('manageClients.notSpecified')}
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
              <h2>{isAddingNew ? t('manageClients.addClient') : t('manageClients.editClient')}</h2>
              <button className={styles.close} onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>
            <div className={styles.form}>
              <input
                type='text'
                placeholder={t('manageClients.surname')}
                value={editingClient.data.surname || ''}
                onChange={(e) => onModalChange('surname', e.target.value)}
                className={styles.formInput}
              />
              <input
                type='text'
                placeholder={t('manageClients.name')}
                value={editingClient.data.name || ''}
                onChange={(e) => onModalChange('name', e.target.value)}
                className={styles.formInput}
              />
              <input
                type='text'
                placeholder={t('manageClients.phone')}
                value={editingClient.data.phone || ''}
                onChange={(e) => onModalChange('phone', e.target.value)}
                className={styles.formInput}
              />
              <select
                value={editingClient.data.sex || ''}
                onChange={(e) => onModalChange('sex', e.target.value)}
                className={styles.formInput}
              >
                <option value=''>{t('home.sex')}</option>
                <option value='Чоловiча'>{t('home.male')}</option>
                <option value='Жiноча'>{t('home.female')}</option>
              </select>
              <select
                value={editingClient.data.gym || ''}
                onChange={(e) => onModalChange('gym', e.target.value)}
                className={styles.formInput}
              >
                <option value=''>{t('home.gym')}</option>
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
                  {t('common.save')}
                </button>
                <button
                  className={`${styles.formBtn} ${styles.formBtnDelete}`}
                  onClick={() => {
                    setShowModal(false);
                    onDeleteClient(editingClient.id);
                  }}
                >
                  {t('common.delete')}
                </button>
                <button
                  className={`${styles.formBtn} ${styles.formBtnCancel}`}
                  onClick={() => setShowModal(false)}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
