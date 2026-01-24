import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { workoutsService, workoutHistoryService } from "../../firebase/services";
import CustomDatePicker from "../CustomDatePicker";
import Notification from "../Notification";
import { useNotification } from "../../hooks/useNotification";
import styles from './WorkoutDetails.module.scss';

const DAY_LABELS = {
  monday: 'ПОНЕДЕЛЬНИК',
  tuesday: 'ВТОРНИК',
  wednesday: 'СРЕДА',
  thursday: 'ЧЕТВЕРГ',
  friday: 'ПЯТНИЦА',
  saturday: 'СУББОТА',
  sunday: 'ВОСКРЕСЕНЬЕ'
};

const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function WorkoutDetails() {
  const navigate = useNavigate();
  const params = useParams();
  const { notification, showNotification } = useNotification();
  
  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [latestDates, setLatestDates] = useState({});
  const [pendingSessions, setPendingSessions] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await workoutsService.getById(params.workoutId);
        if (data) {
          if (data.days && !data.weeks) {
            data.weeks = [
              {
                weekNumber: 1,
                days: data.days
              }
            ];
            delete data.days;
          }
          
          if (!data.weeks || data.weeks.length === 0) {
            data.weeks = [];
          }
        }
        
        setWorkout(data);

        // Загружаем последние даты для каждого дня
        if (data && data.weeks) {
          const dates = {};
          for (let weekIndex = 0; weekIndex < data.weeks.length; weekIndex++) {
            const week = data.weeks[weekIndex];
            const dayKeys = Object.keys(week.days || {});
            
            for (const dayKey of dayKeys) {
              const latestDate = await workoutHistoryService.getLatestDateForDay(
                params.workoutId,
                week.weekNumber,
                dayKey
              );
              
              if (latestDate) {
                const key = `week${weekIndex}_${dayKey}`;
                dates[key] = latestDate;
              }
            }
          }
          setLatestDates(dates);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading workout data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [params.workoutId]);

  const onButtonBack = () => {
    navigate(`/plan_client/${params.clientId}/client`);
  };

  const onButtonEdit = () => {
    navigate(`/edit_workout/${params.clientId}/${params.workoutId}`);
  };

  const handleDayClick = (dayKey) => {
    setSelectedDay({ weekIndex: selectedWeekIndex, dayKey });
    setIsDateModalOpen(true);
  };

  const handleDateSelect = (date) => {
    if (selectedDay && date && workout) {
      const week = workout.weeks[selectedDay.weekIndex];
      const dayExercises = week.days[selectedDay.dayKey]?.exercises || [];
      
      // Создаем сессию для сохранения
      const session = {
        workoutId: params.workoutId,
        clientId: params.clientId,
        weekNumber: week.weekNumber,
        dayKey: selectedDay.dayKey,
        date: date,
        exercises: dayExercises
      };
      
      // Добавляем в список ожидающих сохранения
      setPendingSessions(prev => [...prev, session]);
      
      // Обновляем отображаемую дату
      const key = `week${selectedDay.weekIndex}_${selectedDay.dayKey}`;
      setLatestDates(prev => ({
        ...prev,
        [key]: date
      }));
      
      setHasUnsavedChanges(true);
    }
    setIsDateModalOpen(false);
    setSelectedDay(null);
  };

  const handleCancelDatePicker = () => {
    setIsDateModalOpen(false);
    setSelectedDay(null);
  };

  const handleSaveToServer = async () => {
    try {
      // Сохраняем все ожидающие сессии
      for (const session of pendingSessions) {
        await workoutHistoryService.saveWorkoutSession(session);
      }
      
      console.log('Все сессии сохранены на сервер:', pendingSessions);
      
      // Очищаем список ожидающих
      setPendingSessions([]);
      setHasUnsavedChanges(false);
      
      showNotification('Даты тренировок успешно сохранены!', 'success');
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      showNotification('Ошибка при сохранении дат', 'error');
    }
  };

  if (loading) {
    return (
      <div className={styles.workoutDetails}>
        <p className={styles.loadingMessage}>Загрузка...</p>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className={styles.workoutDetails}>
        <p className={styles.errorMessage}>Тренировка не найдена</p>
        <button className={styles.backButton} onClick={onButtonBack}>
          Назад
        </button>
      </div>
    );
  }

  return (
    <div className={styles.workoutDetails}>
      <Notification notification={notification} />
      
      <div className={styles.detailsHeader}>
        <button className={styles.backButton} onClick={onButtonBack}>
          Назад
        </button>
        <h1 className={styles.workoutTitle}>{workout.name}</h1>
        <button className={styles.editButton} onClick={onButtonEdit}>
          Редактировать
        </button>
      </div>

      {hasUnsavedChanges && (
        <div className={styles.saveButtonContainer}>
          <button className={styles.saveButton} onClick={handleSaveToServer}>
            Сохранить даты на сервер
          </button>
        </div>
      )}

      <div className={styles.weeklyPlanContainer}>
        {workout.weeks && workout.weeks.length > 0 ? (
          <>
            {workout.weeks[selectedWeekIndex] && (
              <div className={styles.weekSection}>
                <h2 className={styles.weekTitle}>НЕДЕЛЯ {workout.weeks[selectedWeekIndex].weekNumber}</h2>
                
                {DAYS_ORDER.map((dayKey) => {
                  const dayExercises = workout.weeks[selectedWeekIndex].days[dayKey]?.exercises || [];
                  
                  if (dayExercises.length === 0) return null;
                  
                  const dateKey = `week${selectedWeekIndex}_${dayKey}`;
                  const selectedDate = latestDates[dateKey];
                  
                  return (
                    <div key={dayKey} className={styles.daySection}>
                      <div className={styles.dayHeader}>
                        <h3 
                          className={styles.dayTitle} 
                          onClick={() => handleDayClick(dayKey)}
                        >
                          {DAY_LABELS[dayKey]}
                        </h3>
                        {selectedDate && (
                          <span className={styles.selectedDate}>{selectedDate}</span>
                        )}
                      </div>
                      <ul className={styles.exercisesList}>
                        {dayExercises.map((exercise, index) => {
                          // Проверяем, является ли это группой
                          const isGroup = exercise.type === 'group' && exercise.exercises && exercise.exercises.length > 0;
                          
                          if (isGroup) {
                            // Отображаем группу упражнений в одну строку
                            return (
                              <li key={exercise.id} className={styles.exerciseItem}>
                                <div className={styles.exerciseRow}>
                                  <span className={styles.exerciseNumber}>{index + 1}.</span>
                                  <div className={styles.groupExercises}>
                                    {exercise.exercises.map((ex, idx) => {
                                      const isAerobic = ex.category_id === '6';
                                      
                                      return (
                                        <span key={idx} className={styles.groupExerciseItem}>
                                          <span className={styles.exerciseName}>{ex.name}</span>
                                          {isAerobic ? (
                                            <span className={styles.exerciseParams}>
                                              {ex.duration || 30} хв
                                            </span>
                                          ) : (
                                            <>
                                              <span className={styles.exerciseParams}>
                                                {ex.numberSteps}×{ex.numberTimes}
                                              </span>
                                              {ex.exerciseData && ex.exerciseData[ex.numberTimes - 1] && (
                                                <span className={styles.exerciseWeight}>
                                                  ({ex.exerciseData[ex.numberTimes - 1]})
                                                </span>
                                              )}
                                            </>
                                          )}
                                          {idx < exercise.exercises.length - 1 && (
                                            <span className={styles.plusSign}> + </span>
                                          )}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              </li>
                            );
                          }
                          
                          // Обычное упражнение
                          const isAerobic = exercise.category_id === '6';
                          
                          return (
                            <li key={exercise.id} className={styles.exerciseItem}>
                              <div className={styles.exerciseRow}>
                                <span className={styles.exerciseNumber}>{index + 1}.</span>
                                <span className={styles.exerciseName}>{exercise.name}</span>
                                {isAerobic ? (
                                  <span className={styles.exerciseParams}>
                                    {exercise.duration || 30} хв
                                  </span>
                                ) : (
                                  <>
                                    <span className={styles.exerciseParams}>
                                      {exercise.numberSteps} × {exercise.numberTimes}
                                    </span>
                                    {exercise.exerciseData && exercise.exerciseData[exercise.numberTimes - 1] && (
                                      <span className={styles.exerciseWeight}>
                                        ({exercise.exerciseData[exercise.numberTimes - 1]})
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
                
                {Object.values(workout.weeks[selectedWeekIndex].days).every(day => !day.exercises || day.exercises.length === 0) && (
                  <p className={styles.noExercisesMessage}>В этой неделе нет упражнений</p>
                )}
              </div>
            )}

            {workout.weeks.length > 1 && (
              <div className={styles.pagination}>
                {workout.weeks.map((week, index) => (
                  <button
                    key={index}
                    className={`${styles.pageButton} ${selectedWeekIndex === index ? styles.active : ''}`}
                    onClick={() => setSelectedWeekIndex(index)}
                  >
                    {week.weekNumber}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className={styles.noExercisesMessage}>В этой тренировке нет недель</p>
        )}
      </div>

      {isDateModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsDateModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Выберите дату тренировки</h3>
            <p className={styles.modalSubtitle}>
              {selectedDay && DAY_LABELS[selectedDay.dayKey]}
            </p>
            <CustomDatePicker 
              onDateSelect={handleDateSelect}
              onCancel={handleCancelDatePicker}
            />
          </div>
        </div>
      )}
    </div>
  );
}
