import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { clientsService, workoutsService } from "../../firebase/services";
import { useNotification } from '../../hooks/useNotification';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import Notification from '../Notification';
import ConfirmDialog from '../ConfirmDialog';
import styles from './PlanClient.module.scss';

export default function PlanClient() {
  const navigate = useNavigate();
  const params = useParams();
  
  const [clientName, setClientName] = useState('');
  const [workouts, setWorkouts] = useState([]);
  const { notification, showNotification } = useNotification();
  const { confirmDialog, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();

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
      
      setWorkouts(migratedWorkouts);
    }).catch((error) => {
      showNotification('Помилка завантаження тренувань', 'error');
    });
  }, [params.id, showNotification]);

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
    
    console.log('Attempting to delete workout:', { workoutId, workoutName });
    
    showConfirm(
      `Ви впевнені, що хочете видалити тренування "${workoutName}"?`,
      async () => {
        try {
          console.log('User confirmed deletion, calling workoutsService.delete...');
          await workoutsService.delete(workoutId);
          console.log('Delete successful, updating local state...');
          setWorkouts(workouts.filter(w => w.id !== workoutId));
          showNotification('Тренування видалено', 'success');
        } catch (error) {
          console.error('Delete failed:', error);
          showNotification('Помилка при видаленні тренування', 'error');
        }
      }
    );
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
          {clientName || params.name || 'Клиент'}
        </button>

        <button
          className={styles.buttonAddExercises}
          onClick={onButtonAddTraining}
        >
          Создать тренировку
        </button>

        <button
          className={styles.buttonBase}        
          onClick={onButtonBase}
        >
          База
        </button>
      </div>

      <div className={styles.workoutsGrid}>
        {workouts.length === 0 ? (
          <p className={styles.noWorkoutsMessage}>
            Нет созданных тренировок. Нажмите "Создать тренировку" для добавления.
          </p>
        ) : (
          workouts.map((workout) => (
            <div 
              key={workout.id} 
              className={styles.workoutCard}
              onClick={() => onWorkoutClick(workout.id)}
            >
              <button 
                className={styles.deleteWorkoutButton}
                onClick={(e) => onDeleteWorkout(e, workout.id, workout.name)}
                title="Удалить тренировку"
              >
                ×
              </button>
              <h3 className={styles.workoutCardTitle}>{workout.name}</h3>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
