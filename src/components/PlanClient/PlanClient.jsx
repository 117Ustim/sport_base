import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { clientsService, clientBaseService, workoutsService } from "../../firebase/services";
import { useNotification } from '../../hooks/useNotification';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { useOptimisticUpdate } from '../../hooks';
import { useTranslation } from 'react-i18next';
import Notification from '../Notification';
import ConfirmDialog from '../ConfirmDialog';
import styles from './PlanClient.module.scss';
import React from 'react';

export default function PlanClient() {
  const navigate = useNavigate();
  const params = useParams();
  const { t } = useTranslation();
  
  const [clientName, setClientName] = useState('');
  const [workouts, setWorkouts] = useState([]);
  const [editingWorkoutId, setEditingWorkoutId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [clientsList, setClientsList] = useState([]);
  const [isClientsLoading, setIsClientsLoading] = useState(false);
  const [transferWorkout, setTransferWorkout] = useState(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const { notification, showNotification } = useNotification();
  const { confirmDialog, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();
  const { executeOptimistic } = useOptimisticUpdate();

  useEffect(() => {
    clientsService.getById(params.id).then((client) => {
      if (client?.data) {
        const fullName = `${client.data.surname} ${client.data.name}`;
        setClientName(fullName);
      }
    });

    workoutsService.getByClientId(params.id).then((data) => {
      const migratedWorkouts = data.map(workout => {
        if (workout.days && !workout.weeks) {
          return {
            ...workout,
            weeks: [
              {
                weekNumber: 1,
                days: workout.days
              }
            ]
          };
        }
        return workout;
      });
      
      // Сортируем тренировки по названию с учётом чисел (натуральная сортировка)
      const sortedWorkouts = migratedWorkouts.sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        
        // Используем localeCompare с numeric: true для правильной сортировки чисел
        // Это обеспечит порядок: ТРЕНИРОВКА_1, ТРЕНИРОВКА_2, ..., ТРЕНИРОВКА_10
        return nameA.localeCompare(nameB, 'ru', { numeric: true, sensitivity: 'base' });
      });
      
      setWorkouts(sortedWorkouts);
    }).catch((error) => {
      showNotification(t('notifications.workoutLoadError'), 'error');
    });
  }, [params.id, t]); // Убрал showNotification из зависимостей - он вызывает бесконечный цикл

  const onButtonBack = () => {
    navigate('/');
  };

  const onButtonBase = () => {
    navigate(`/client_base/${params.id}`);
  };

  const onButtonAddTraining = () => {
    navigate(`/create_workout/${params.id}`);
  };

  const onWorkoutClick = (workoutId) => {
    navigate(`/workout_details/${params.id}/${workoutId}`);
  };

  const onDeleteWorkout = async (e, workoutId, workoutName) => {
    e.stopPropagation();
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('Attempting to delete workout:', { workoutId, workoutName });
    }
    
    showConfirm(
      t('dialogs.confirmDeleteWorkout', { name: workoutName }),
      async () => {
        // Сохраняем предыдущее состояние для отката
        const previousWorkouts = [...workouts];
        
        await executeOptimistic({
          // 1. Мгновенно удаляем из UI
          optimisticUpdate: () => {
            if (process.env.NODE_ENV === 'development') {
              console.warn('Optimistic delete: removing from UI...');
            }
            setWorkouts(workouts.filter(w => w.id !== workoutId));
            showNotification(t('notifications.workoutDeleted'), 'success');
          },
          // 2. Реальный API запрос
          apiCall: async () => {
            if (process.env.NODE_ENV === 'development') {
              console.warn('Calling workoutsService.delete...');
            }
            return await workoutsService.delete(workoutId);
          },
          // 3. Откат при ошибке
          rollback: () => {
            if (process.env.NODE_ENV === 'development') {
              console.warn('Delete failed, rolling back...');
            }
            setWorkouts(previousWorkouts);
          },
          // 4. При ошибке показываем уведомление
          onError: (error) => {
            console.error('Delete failed:', error);
            showNotification(t('notifications.deleteWorkoutError'), 'error');
          }
        });
      }
    );
  };

  const onStartEditName = (e, workoutId, currentName) => {
    e.stopPropagation();
    setEditingWorkoutId(workoutId);
    setEditingName(currentName);
  };

  const onCancelEditName = (e) => {
    if (e) e.stopPropagation();
    setEditingWorkoutId(null);
    setEditingName('');
  };

  const onSaveEditName = async (e, workoutId) => {
    if (e) e.stopPropagation();
    
    const trimmedName = editingName.trim();
    if (!trimmedName) {
      showNotification('Название не может быть пустым', 'error');
      return;
    }

    const previousWorkouts = [...workouts];
    const workoutToUpdate = workouts.find(w => w.id === workoutId);
    
    if (!workoutToUpdate) {
      showNotification('Тренировка не найдена', 'error');
      return;
    }
    
    await executeOptimistic({
      optimisticUpdate: () => {
        // Обновляем название в UI и сразу пересортировываем
        const updatedWorkouts = workouts.map(w => 
          w.id === workoutId ? { ...w, name: trimmedName } : w
        );
        
        // Пересортировываем после изменения названия
        const sortedWorkouts = updatedWorkouts.sort((a, b) => {
          const nameA = (a.name || '').toLowerCase();
          const nameB = (b.name || '').toLowerCase();
          return nameA.localeCompare(nameB, 'ru', { numeric: true, sensitivity: 'base' });
        });
        
        setWorkouts(sortedWorkouts);
        setEditingWorkoutId(null);
        setEditingName('');
        showNotification('Название обновлено', 'success');
      },
      apiCall: async () => {
        // Обновляем в Firebase - передаем полный объект тренировки
        return await workoutsService.update(workoutId, {
          ...workoutToUpdate,
          name: trimmedName
        });
      },
      rollback: () => {
        setWorkouts(previousWorkouts);
      },
      onError: (error) => {
        console.error('Update failed:', error);
        showNotification('Ошибка при обновлении названия', 'error');
      }
    });
  };

  const onNameKeyDown = (e, workoutId) => {
    if (e.key === 'Enter') {
      onSaveEditName(e, workoutId);
    } else if (e.key === 'Escape') {
      onCancelEditName(e);
    }
  };

  const openTransferModal = async (event, workout) => {
    event.stopPropagation();
    setTransferWorkout(workout);
    setIsTransferModalOpen(true);
    setIsClientsLoading(true);

    try {
      const response = await clientsService.getAll({ limit: 1000 });
      const clientsData = response?.data || [];
      const filteredClients = clientsData.filter(client => client.id !== params.id);
      setClientsList(filteredClients);
    } catch (error) {
      console.error('Error loading clients:', error);
      showNotification(t('notifications.loadError'), 'error');
    } finally {
      setIsClientsLoading(false);
    }
  };

  const closeTransferModal = () => {
    if (isTransferring) return;
    setIsTransferModalOpen(false);
    setTransferWorkout(null);
  };

  const getWeightFromBaseData = (baseData, reps) => {
    if (!baseData) return '';
    const repsNumber = Number(reps) || 0;
    if (repsNumber <= 0) return '';
    const weightIndex = String(repsNumber - 1);
    const weight = baseData[weightIndex];
    if (weight && weight !== '' && weight !== '—') {
      return weight;
    }
    return '';
  };

  const mapExerciseForTransfer = (exercise, baseMap, counters) => {
    const isAerobic = exercise.category_id === '6';
    const reps = exercise.exerciseData?.reps || exercise.numberTimes || 8;
    const baseExercise = baseMap.get(exercise.exercise_id);
    const baseData = baseExercise?.data || {};

    const updatedExercise = {
      ...exercise,
      exerciseData: { ...baseData }
    };

    if (!isAerobic) {
      const weightFromBase = getWeightFromBaseData(baseData, reps);
      if (weightFromBase) {
        updatedExercise.exerciseData.weight = weightFromBase;
      } else {
        updatedExercise.exerciseData.weight = "0";
        counters.zeroWeight += 1;
      }
    }

    if (!baseExercise) {
      counters.missingExercises += 1;
    }

    return updatedExercise;
  };

  const prepareWorkoutForTransfer = (workoutData, targetClientId, targetBase) => {
    const baseMap = new Map(targetBase.map(ex => [ex.exercise_id, ex]));
    const counters = { zeroWeight: 0, missingExercises: 0 };

    let normalizedWorkout = workoutData;
    if (workoutData.days && !workoutData.weeks) {
      normalizedWorkout = {
        ...workoutData,
        weeks: [
          {
            weekNumber: 1,
            days: workoutData.days
          }
        ]
      };
    }

    const mappedWeeks = (normalizedWorkout.weeks || []).map(week => {
      const mappedDays = {};
      Object.entries(week.days || {}).forEach(([dayKey, dayData]) => {
        const exercises = dayData.exercises || [];
        const mappedExercises = exercises.map(ex => {
          if (ex.type === 'group' && Array.isArray(ex.exercises)) {
            return {
              ...ex,
              exercises: ex.exercises.map(subEx => mapExerciseForTransfer(subEx, baseMap, counters))
            };
          }
          return mapExerciseForTransfer(ex, baseMap, counters);
        });

        mappedDays[dayKey] = {
          ...dayData,
          exercises: mappedExercises
        };
      });

      return {
        ...week,
        days: mappedDays
      };
    });

    const { id, days, ...workoutWithoutId } = normalizedWorkout;

    return {
      ...workoutWithoutId,
      name: `${workoutData.name || t('common.plan')} (${t('planClient.copySuffix')})`,
      clientId: targetClientId,
      weeks: mappedWeeks,
      _transferCounters: counters
    };
  };

  const handleTransferToClient = async (targetClient) => {
    if (!transferWorkout || isTransferring) return;
    setIsTransferring(true);

    try {
      const [workoutData, targetBase] = await Promise.all([
        workoutsService.getById(transferWorkout.id),
        clientBaseService.getByClientId(targetClient.id)
      ]);

      if (!workoutData) {
        showNotification(t('notifications.workoutTransferError'), 'error');
        return;
      }

      const preparedWorkout = prepareWorkoutForTransfer(workoutData, targetClient.id, targetBase);
      const { _transferCounters, ...workoutToCreate } = preparedWorkout;

      await workoutsService.create(workoutToCreate);

      const targetName = `${targetClient.data?.surname || ''} ${targetClient.data?.name || ''}`.trim();
      showNotification(t('notifications.workoutTransferred', { name: targetName || t('common.client') }), 'success');

      if (_transferCounters.zeroWeight > 0) {
        showNotification(
          t('notifications.workoutTransferMissingWeights', { count: _transferCounters.zeroWeight }),
          'info'
        );
      }

      closeTransferModal();
    } catch (error) {
      console.error('Workout transfer failed:', error);
      showNotification(t('notifications.workoutTransferError'), 'error');
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className={styles.planClient}>
      <Notification notification={notification} />
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        message={confirmDialog.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
      {isTransferModalOpen && (
        <div className={styles.transferModal} onClick={closeTransferModal}>
          <div className={styles.transferModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.transferModalHeader}>
              <h2>{t('planClient.transferTitle')}</h2>
              <button className={styles.transferClose} onClick={closeTransferModal}>
                ✕
              </button>
            </div>
            <div className={styles.transferModalBody}>
              {isClientsLoading ? (
                <p className={styles.transferEmpty}>{t('common.loading')}</p>
              ) : clientsList.length === 0 ? (
                <p className={styles.transferEmpty}>{t('planClient.noClients')}</p>
              ) : (
                <div className={styles.transferClientsList}>
                  {clientsList.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      className={styles.transferClientItem}
                      onClick={() => handleTransferToClient(client)}
                      disabled={isTransferring}
                    >
                      <span className={styles.transferClientName}>
                        {client.data?.surname || ''} {client.data?.name || ''}
                      </span>
                      <span className={styles.transferClientGym}>
                        {client.data?.gym || t('common.notSpecified')}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className={styles.blockButton}>
        <button className={styles.buttonBack} onClick={onButtonBack}>
          {clientName || params.name || t('common.client')}
        </button>

        <button
          className={styles.buttonAddExercises}
          onClick={onButtonAddTraining}
        >
          {t('common.createWorkout')}
        </button>

        <button
          className={styles.buttonBase}        
          onClick={onButtonBase}
        >
          {t('common.base')}
        </button>
      </div>

      <div className={styles.workoutsGrid}>
        {workouts.length === 0 ? (
          <p className={styles.noWorkoutsMessage}>
            {t('planClient.noWorkouts')}
          </p>
        ) : (
          workouts.map((workout) => (
            <div 
              key={workout.id} 
              className={styles.workoutCard}
              onClick={() => editingWorkoutId !== workout.id && onWorkoutClick(workout.id)}
            >
              <div className={styles.cardActions}>
                <button
                  className={styles.transferButton}
                  onClick={(e) => openTransferModal(e, workout)}
                  title={t('planClient.transferButton')}
                >
                  ⇄
                </button>
                
                <button 
                  className={styles.editNameButton}
                  onClick={(e) => onStartEditName(e, workout.id, workout.name)}
                  title="Редактировать название"
                >
                  ✎
                </button>

                <button
                  className={styles.deleteWorkoutButton}
                  onClick={(e) => onDeleteWorkout(e, workout.id, workout.name)}
                  title={t('common.delete')}
                >
                  ×
                </button>
              </div>
              
              {editingWorkoutId === workout.id ? (
                <div className={styles.editNameContainer} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    className={styles.editNameInput}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => onNameKeyDown(e, workout.id)}
                    autoFocus
                  />
                  <div className={styles.editNameButtons}>
                    <button 
                      className={styles.saveButton}
                      onClick={(e) => onSaveEditName(e, workout.id)}
                      title="Сохранить"
                    >
                      ✓
                    </button>
                    <button 
                      className={styles.cancelButton}
                      onClick={onCancelEditName}
                      title="Отмена"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <h3 className={styles.workoutCardTitle}>{workout.name}</h3>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
