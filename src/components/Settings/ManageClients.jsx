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
import Notification from '../Notification';
import { useNotification } from '../../hooks/useNotification';
import styles from './ManageClients.module.scss';

export default function ManageClients() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [clients, setClients] = useState([]);
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const searchName = useDebounce(searchInput, 300); // ✅ Debounce 300ms
  const [currentPage, setCurrentPage] = useState(1);
  const [editingClient, setEditingClient] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const { confirmDialog, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();
  const { executeOptimistic } = useOptimisticUpdate();
  const { notification, showNotification } = useNotification();

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

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredClients.slice(start, start + pageSize);
  }, [filteredClients, currentPage]);

  useEffect(() => {
    // Сбрасываем на первую страницу при изменении поиска
    setCurrentPage(1);
  }, [searchName]);

  useEffect(() => {
    // Корректируем текущую страницу если количество страниц уменьшилось
    setCurrentPage((prev) => (prev > totalPages ? totalPages : prev));
  }, [totalPages]);

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
    
    const normalizedGymName = (editingClient.data?.gym || '').trim();
    const selectedGymById = gyms.find((gym) => gym.id === editingClient.data?.gymId);
    const selectedGymByName = gyms.find((gym) => gym.name.trim() === normalizedGymName);
    const selectedGym = selectedGymById || selectedGymByName;
    const normalizedClientData = {
      ...editingClient.data,
      gym: selectedGym ? selectedGym.name : normalizedGymName,
      gymId: selectedGym ? selectedGym.id : ''
    };

    if (isAddingNew) {
      // Создание нового клиента
      const tempId = `temp_${Date.now()}`; // Временный ID для optimistic update
      const newClient = {
        id: tempId,
        data: normalizedClientData
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
        apiCall: () => clientsService.create(normalizedClientData),
        // 3. Откат при ошибке
        rollback: () => {
          setClients(prev => prev.filter(c => c.id !== tempId));
          setShowModal(true);
        },
        // 4. При успехе заменяем временный ID на реальный
        onSuccess: () => {
          showNotification(t('notifications.savedSuccess'), 'success');
          loadClients(); // Перезагружаем для получения реального ID
        },
        onError: (error) => {
          console.error('Error creating client:', error);
          showNotification(t('notifications.saveError'), 'error');
        }
      });
    } else {
      // Редактирование существующего клиента (без optimistic, чтобы исключить тихие откаты)
      try {
        await clientsService.update(editingClient.id, normalizedClientData);
        
        setClients(prev => prev.map(c =>
          c.id === editingClient.id
            ? { ...c, data: normalizedClientData }
            : c
        ));
        setShowModal(false);
        setEditingClient(null);
        showNotification(t('notifications.savedSuccess'), 'success');
        loadClients();
      } catch (error) {
        console.error('Error updating client:', error);
        showNotification(`${t('notifications.saveError')} ${error?.message || ''}`.trim(), 'error');
      }
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

  const normalizeFirstLetter = (value) => {
    if (!value) return '';
    return value[0].toUpperCase() + value.slice(1);
  };

  const normalizePhone = (value) => {
    if (!value) return '';
    let cleaned = value.replace(/[^0-9+()\-\s]/g, '');
    // Удаляем все '+' не в начале
    cleaned = cleaned.replace(/(?!^)\+/g, '');
    // Если в начале несколько '+', оставляем один
    cleaned = cleaned.replace(/^\++/, '+');
    return cleaned;
  };

  const getSelectedGymId = (clientData = {}) => {
    if (clientData.gymId && gyms.some((gym) => gym.id === clientData.gymId)) {
      return clientData.gymId;
    }

    const normalizedGymName = (clientData.gym || '').trim();
    const gymByName = gyms.find((gym) => gym.name.trim() === normalizedGymName);
    return gymByName?.id || '';
  };

  return (
    <div className={styles.manageClients}>
      <Notification notification={notification} />
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        message={confirmDialog.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
      
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <BackButton onClick={onBackClick} size="small" />
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
          onChange={(e) => {
            const value = e.target.value;
            const normalized = value ? value[0].toUpperCase() + value.slice(1) : '';
            setSearchInput(normalized);
          }}
          className={styles.search}
        />
      </div>

      <div className={styles.list}>
        {loading ? (
          <SkeletonLoader type="list" count={5} />
        ) : filteredClients.length === 0 ? (
          <p className={styles.empty}>{t('manageClients.noClients')}</p>
        ) : (
          paginatedClients.map((client) => (
            <div 
              key={client.id} 
              className={`${styles.item} ${client.data?.isActive === false ? styles.itemInactive : ''}`}
              onClick={() => onEditClient(client)}
            >
              <div className={styles.itemContent}>
                <div className={styles.itemNameGroup}>
                  <div className={styles.itemName}>
                    {client.data?.surname || ''} {client.data?.name || ''}
                  </div>
                  {client.data?.isActive === false && (
                    <span className={styles.inactiveBadge}>{t('manageClients.inactive')}</span>
                  )}
                </div>
                <div className={styles.itemGym}>
                  {client.data?.gym || t('manageClients.notSpecified')}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {!loading && filteredClients.length > 0 && totalPages > 1 && (
        <div className={styles.pagination}>
          {Array.from({ length: totalPages }, (_, index) => {
            const page = index + 1;
            const isActive = page === currentPage;
            return (
              <button
                key={page}
                type="button"
                className={`${styles.pageButton} ${isActive ? styles.pageButtonActive : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            );
          })}
        </div>
      )}

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
                onChange={(e) => onModalChange('surname', normalizeFirstLetter(e.target.value))}
                className={styles.formInput}
              />
              <input
                type='text'
                placeholder={t('manageClients.name')}
                value={editingClient.data.name || ''}
                onChange={(e) => onModalChange('name', normalizeFirstLetter(e.target.value))}
                className={styles.formInput}
              />
              <input
                type='text'
                placeholder={t('manageClients.phone')}
                value={editingClient.data.phone || ''}
                onChange={(e) => onModalChange('phone', normalizePhone(e.target.value))}
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
                value={getSelectedGymId(editingClient.data)}
                onChange={(e) => {
                  const selectedGymId = e.target.value;
                  const selectedGym = gyms.find((gym) => gym.id === selectedGymId);
                  setEditingClient((prev) => ({
                    ...prev,
                    data: {
                      ...prev.data,
                      gym: selectedGym?.name || '',
                      gymId: selectedGymId
                    }
                  }));
                }}
                className={styles.formInput}
              >
                <option value=''>{t('home.gym')}</option>
                {gyms.map((gym) => (
                  <option key={gym.id} value={gym.id}>
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
