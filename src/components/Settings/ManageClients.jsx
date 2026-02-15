import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { clientsService, gymsService } from '../../firebase/services';
import { useConfirmDialog } from '../../hooks';
import { useOptimisticUpdate } from '../../hooks';
import { useDebounce } from '../../hooks/useDebounce';
import { EMPTY_CLIENT } from '../../constants';
import ConfirmDialog from '../ConfirmDialog';
import BackButton from '../BackButton';
import SkeletonLoader from '../SkeletonLoader';
import styles from './ManageClients.module.scss';

export default function ManageClients() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [clients, setClients] = useState([]);
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const searchName = useDebounce(searchInput, 300); // ✅ Debounce 300ms
  const [editingClient, setEditingClient] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const { confirmDialog, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();
  const { executeOptimistic } = useOptimisticUpdate();

  useEffect(() => {
    loadClients();
    loadGyms();
  }, []);

  // ✅ Используем useMemo вместо useEffect + state
  const filteredClients = useMemo(() => {
    let filtered = clients.filter(client => client.data !== null);

    if (searchName) {
      const searchLower = searchName.toLowerCase();
      filtered = filtered.filter(client => {
        const fullName = `${client.data?.surname || ''} ${client.data?.name || ''}`.toLowerCase();
        return fullName.includes(searchLower);
      });
    }

    return filtered.sort((a, b) => {
      const surnameA = (a.data?.surname || '').toLowerCase();
      const surnameB = (b.data?.surname || '').toLowerCase();
      return surnameA.localeCompare(surnameB, 'uk');
    });
  }, [clients, searchName]);

  const loadClients = () => {
    setLoading(true);
    clientsService.getAll({ page: 0, limit: 1000 })
      .then((response) => {
        const clientsData = response.data || [];
        setClients(clientsData);
      })
      .catch((error) => {
        console.error('Error loading clients:', error);
        setClients([]);
      })
      .finally(() => {
        setLoading(false);
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
        // Сохраняем предыдущее состояние для отката
        const previousClients = [...clients];
        
        await executeOptimistic({
          // 1. Мгновенно удаляем из UI
          optimisticUpdate: () => {
            setClients(prev => prev.filter(c => c.id !== id));
          },
          // 2. Реальный API запрос
          apiCall: () => clientsService.delete(id),
          // 3. Откат при ошибке
          rollback: () => {
            setClients(previousClients);
          },
          // 4. При ошибке показываем уведомление
          onError: (error) => {
            console.error('Error deleting client:', error);
            // Можно добавить showNotification если есть
          }
        });
      }
    );
  };

  const onSaveClient = async () => {
    if (!editingClient) return;

    if (isAddingNew) {
      // Создание нового клиента
      const tempId = `temp_${Date.now()}`; // Временный ID для optimistic update
      const newClient = {
        id: tempId,
        data: editingClient.data
      };

      await executeOptimistic({
        // 1. Мгновенно добавляем в UI
        optimisticUpdate: () => {
          setClients(prev => [...prev, newClient]);
          setShowModal(false);
          setEditingClient(null);
          setIsAddingNew(false);
        },
        // 2. Реальный API запрос
        apiCall: () => clientsService.create(editingClient.data),
        // 3. Откат при ошибке
        rollback: () => {
          setClients(prev => prev.filter(c => c.id !== tempId));
          setShowModal(true);
        },
        // 4. При успехе заменяем временный ID на реальный
        onSuccess: () => {
          loadClients(); // Перезагружаем для получения реального ID
        },
        onError: (error) => {
          console.error('Error creating client:', error);
        }
      });
    } else {
      // Редактирование существующего клиента
      const previousClients = [...clients];

      await executeOptimistic({
        // 1. Мгновенно обновляем в UI
        optimisticUpdate: () => {
          setClients(prev => prev.map(c => 
            c.id === editingClient.id 
              ? { ...c, data: editingClient.data }
              : c
          ));
          setShowModal(false);
          setEditingClient(null);
        },
        // 2. Реальный API запрос
        apiCall: () => clientsService.update(editingClient.id, editingClient.data),
        // 3. Откат при ошибке
        rollback: () => {
          setClients(previousClients);
          setShowModal(true);
        },
        onError: (error) => {
          console.error('Error updating client:', error);
        }
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
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className={styles.search}
        />
      </div>

      <div className={styles.list}>
        {loading ? (
          <SkeletonLoader type="list" count={5} />
        ) : filteredClients.length === 0 ? (
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
