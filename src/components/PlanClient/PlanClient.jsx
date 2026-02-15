import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { clientsService, workoutsService } from "../../firebase/services";
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

  return (
    <div className={styles.planClient}>
      <Notification notification={notification} />
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        message={confirmDialog.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
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
              <button 
                className={styles.deleteWorkoutButton}
                onClick={(e) => onDeleteWorkout(e, workout.id, workout.name)}
                title={t('common.delete')}
              >
                ×
              </button>
              
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
                <div className={styles.titleContainer}>
                  <h3 className={styles.workoutCardTitle}>{workout.name}</h3>
                  <button 
                    className={styles.editNameButton}
                    onClick={(e) => onStartEditName(e, workout.id, workout.name)}
                    title="Редактировать название"
                  >
                    ✎
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
