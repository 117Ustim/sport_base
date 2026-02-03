import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { workoutsService, workoutHistoryService, assignedWorkoutsService, clientsService } from "../../firebase/services";
import CustomDatePicker from "../CustomDatePicker";
import Notification from "../Notification";
import { useNotification } from "../../hooks/useNotification";
import styles from './WorkoutDetails.module.scss';
import BackButton from "../BackButton";

const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function WorkoutDetails() {
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  const { t } = useTranslation();
  const { notification, showNotification } = useNotification();
  
  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [latestDates, setLatestDates] = useState({});
  const [pendingSessions, setPendingSessions] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [clientData, setClientData] = useState(null);
  const [isSendingWorkout, setIsSendingWorkout] = useState(false);
  const [lastAssignedWeek, setLastAssignedWeek] = useState(null);

  useEffect(() => {
    console.log('🚀 useEffect запущен - перезагрузка данных');
    console.log('📍 Параметры:', { 
      workoutId: params.workoutId, 
      clientId: params.clientId, 
      locationKey: location.key 
    });
    
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Загружаем данные клиента
        console.log('📥 Начинаем загрузку clientData');
        const clientStartTime = Date.now();
        const client = await clientsService.getById(params.clientId);
        console.log('✅ clientData загружен за:', Date.now() - clientStartTime, 'мс');
        console.log('👤 Клиент:', client?.data?.name, client?.data?.surname);
        setClientData(client);
        
// Загружаем шаблон тренировки
        console.log('📥 Начинаем загрузку workout template');
        const workoutStartTime = Date.now();
        const workoutData = await workoutsService.getById(params.workoutId);
        console.log('✅ workoutData загружен за:', Date.now() - workoutStartTime, 'мс');
        
        if (workoutData) {
          // Нормализация структуры недель
          if (workoutData.days && !workoutData.weeks) {
            workoutData.weeks = [{ weekNumber: 1, days: workoutData.days }];
            delete workoutData.days;
          }
          if (!workoutData.weeks) {
            workoutData.weeks = [];
          }
        }

        // Загружаем ПОСЛЕДНЮЮ отправленную тренировку из assignedWorkouts для получения дат
        console.log('📥 Начинаем загрузку assignedWorkouts');
        const assignedStartTime = Date.now();
        const assignments = await assignedWorkoutsService.getAssignedWorkoutsByClientId(params.clientId);
        console.log('✅ assignedWorkouts загружены за:', Date.now() - assignedStartTime, 'мс');
        
        // Инициализируем объект для дат
        const dates = {};
        let initialWeekIndex = 0;
        let lastAssignedWeekNum = null;

        if (assignments.length > 0) {
          // Берем последнюю отправленную тренировку
          const latestAssignment = assignments[0];
          lastAssignedWeekNum = latestAssignment.weekNumber;
          console.log('📋 Последняя назначенная неделя:', lastAssignedWeekNum);
          
          if (latestAssignment.weekData && latestAssignment.weekData.dates) {
             Object.keys(latestAssignment.weekData.dates).forEach(dayKey => {
               // Важно: мы сохраняем даты с привязкой к номеру недели из назначения!
               // Так как мы загружаем ПОЛНЫЙ список недель из шаблона, нам нужно знать
               // к какой именно неделе (по индексу) привязать эти даты.
               // Находим индекс недели в шаблоне, у которой weekNumber совпадает с назначенным
               
               const weekIndex = workoutData.weeks.findIndex(w => w.weekNumber === latestAssignment.weekNumber);
               
               if (weekIndex !== -1) {
                  const dateKey = `week${weekIndex}_${dayKey}`;
                  dates[dateKey] = latestAssignment.weekData.dates[dayKey];
                  initialWeekIndex = weekIndex; // Открываем эту неделю
               }
            });
            console.log('📅 Восстановлены даты из назначения:', dates);
          }
        }

        setLatestDates(dates);
        setWorkout(workoutData); // Всегда устанавливаем полный шаблон
        setSelectedWeekIndex(initialWeekIndex);
        setLastAssignedWeek(lastAssignedWeekNum);
        
        console.log('🎯 setWorkout выполнен (шаблон + даты из назначения)');


        console.log('🏁 setLoading(false) - страница должна отобразиться');
        setLoading(false);
        
      } catch (error) {
        console.error('❌ Критическая ошибка загрузки:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [params.workoutId, params.clientId, location.key]);

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

  const handleSendWorkoutToClient = async () => {
    console.log('🚀 Начало отправки тренировки');
    const startTime = Date.now();
    
    // Проверяем есть ли userId у клиента
    if (!clientData || !clientData.data.userId) {
      showNotification(t('workoutDetails.clientNoAccount'), 'error');
      return;
    }

    // Проверяем есть ли выбранная неделя
    if (!workout.weeks || !workout.weeks[selectedWeekIndex]) {
      showNotification(t('workoutDetails.weekNotFound'), 'error');
      return;
    }

    const weekData = workout.weeks[selectedWeekIndex];

    // Проверяем не является ли эта неделя последней отправленной
    if (lastAssignedWeek === weekData.weekNumber) {
      showNotification(t('workoutDetails.weekAlreadySent'), 'error');
      return;
    }

    // Проверяем что все дни с упражнениями имеют даты
    const daysWithExercises = DAYS_ORDER.filter(dayKey => {
      const dayExercises = weekData.days[dayKey]?.exercises || [];
      return dayExercises.length > 0;
    });

    const daysWithoutDates = daysWithExercises.filter(dayKey => {
      const dateKey = `week${selectedWeekIndex}_${dayKey}`;
      return !latestDates[dateKey];
    });

    if (daysWithoutDates.length > 0) {
      const missingDaysNames = daysWithoutDates.map(dayKey => t(`daysFull.${dayKey}`)).join(', ');
      showNotification(t('workoutDetails.missingDates', { days: missingDaysNames }), 'error');
      return;
    }

    try {
      setIsSendingWorkout(true);
      console.log('⏱️ Проверки прошли за:', Date.now() - startTime, 'мс');
      
      // Подготавливаем данные недели с датами
      const weekDataWithDates = {
        ...weekData,
        dates: {}
      };
      
      // Собираем даты для каждого дня недели
      DAYS_ORDER.forEach(dayKey => {
        const dateKey = `week${selectedWeekIndex}_${dayKey}`;
        if (latestDates[dateKey]) {
          // Убеждаемся, что дата остается в строковом формате DD.MM.YYYY
          const dateString = latestDates[dateKey];
          console.log(`📅 Дата для ${dayKey}:`, dateString);
          weekDataWithDates.dates[dayKey] = dateString;
        }
      });
      
      console.log('📦 Данные подготовлены за:', Date.now() - startTime, 'мс');
      
      // НЕ удаляем старые назначения - сохраняем историю!
      // Просто добавляем новое назначение
      console.log('➕ Добавляем новое назначение (история сохраняется)');
      
      // Отправляем клиенту новую тренировку
      const assignTime = Date.now();
      await assignedWorkoutsService.assignWeekToClient(
        params.clientId,
        clientData.data.userId,
        weekDataWithDates,
        workout.name,
        params.workoutId
      );
      console.log('✅ Отправка клиенту заняла:', Date.now() - assignTime, 'мс');
      
      // НЕ сохраняем даты в workouts - шаблон должен оставаться без дат!
      // Даты сохраняются только в assignedWorkouts
      
      // Обновляем состояние
      setLastAssignedWeek(weekData.weekNumber);
      setPendingSessions([]);
      setHasUnsavedChanges(false);
      
      console.log('🎉 Общее время:', Date.now() - startTime, 'мс');
      showNotification(t('workoutDetails.trainingSentSuccess'), 'success');
      
    } catch (error) {
      console.error('❌ Ошибка отправки тренировки:', error);
      console.log('⏱️ Время до ошибки:', Date.now() - startTime, 'мс');
      showNotification(t('workoutDetails.sendError'), 'error');
    } finally {
      setIsSendingWorkout(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.workoutDetails}>
        <p className={styles.loadingMessage}>{t('workoutDetails.loading')}</p>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className={styles.workoutDetails}>
        <p className={styles.errorMessage}>{t('workoutDetails.notFound')}</p>
        <BackButton onClick={onButtonBack} />
      </div>
    );
  }

  return (
    <div className={styles.workoutDetails}>
      <Notification notification={notification} />
      
      <div className={styles.detailsHeader}>
        <BackButton onClick={onButtonBack} />
        <div className={styles.clientName}>
          {clientData?.data?.surname || ''} {clientData?.data?.name || ''}
        </div>
        <div className={styles.headerButtons}>
          <button className={styles.editButton} onClick={onButtonEdit}>
            {t('common.edit')}
          </button>
          <button 
            className={styles.sendButton} 
            onClick={handleSendWorkoutToClient}
            disabled={isSendingWorkout || !clientData?.data?.userId}
          >
            {isSendingWorkout ? t('workoutDetails.sending') : t('workoutDetails.sendToClient')}
          </button>
        </div>
      </div>
      
      <h1 className={styles.workoutTitle}>{workout.name}</h1>

      <div className={styles.weeklyPlanContainer}>
        {workout.weeks && workout.weeks.length > 0 ? (
          <>
            {workout.weeks[selectedWeekIndex] && (
              <div className={styles.weekSection}>
                <h2 className={styles.weekTitle}>{t('workoutDetails.week')} {workout.weeks[selectedWeekIndex].weekNumber}</h2>
                
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
                        >
                          {t(`daysFull.${dayKey}`)}
                        </h3>
                        {selectedDate ? (
                          <span 
                            className={styles.selectedDate}
                            onClick={() => handleDayClick(dayKey)}
                            style={{ cursor: 'pointer' }}
                          >
                            {selectedDate}
                          </span>
                        ) : (
                          <span className={styles.noDate} onClick={() => handleDayClick(dayKey)}>
                            {t('workoutDetails.selectDate')}
                          </span>
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
                                      
                                      // Получаем вес из exerciseData (может быть объектом или массивом)
                                      let weight = '';
                                      if (ex.exerciseData) {
                                        // Проверяем формат объекта {weight: '...', sets: '...', reps: '...'}
                                        if (ex.exerciseData.weight) {
                                          weight = ex.exerciseData.weight;
                                        }
                                        // Проверяем формат массива [вес1, вес2, ...]
                                        else if (ex.exerciseData[ex.numberTimes - 1]) {
                                          weight = ex.exerciseData[ex.numberTimes - 1];
                                        }
                                      }
                                      
                                      // Получаем подходы и повторения
                                      const sets = ex.exerciseData?.sets || ex.numberSteps || '';
                                      const reps = ex.exerciseData?.reps || ex.numberTimes || '';
                                      
                                      return (
                                        <span key={idx} className={styles.groupExerciseItem}>
                                          <span className={styles.exerciseName}>{ex.name}</span>
                                          {isAerobic ? (
                                            <span className={styles.exerciseParams}>
                                              {ex.duration || 30} {t('createWorkout.minutes')}
                                            </span>
                                          ) : (
                                            <>
                                              <span className={styles.exerciseParams}>
                                                {sets}×{reps}
                                              </span>
                                              {weight && (
                                                <span className={styles.exerciseWeight}>
                                                  ({weight})
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
                          
                          // Получаем вес из exerciseData (может быть объектом или массивом)
                          let weight = '';
                          if (exercise.exerciseData) {
                            // Проверяем формат объекта {weight: '...', sets: '...', reps: '...'}
                            if (exercise.exerciseData.weight) {
                              weight = exercise.exerciseData.weight;
                            }
                            // Проверяем формат массива [вес1, вес2, ...]
                            else if (exercise.exerciseData[exercise.numberTimes - 1]) {
                              weight = exercise.exerciseData[exercise.numberTimes - 1];
                            }
                          }
                          
                          // Получаем подходы и повторения
                          const sets = exercise.exerciseData?.sets || exercise.numberSteps || '';
                          const reps = exercise.exerciseData?.reps || exercise.numberTimes || '';
                          
                          return (
                            <li key={exercise.id} className={styles.exerciseItem}>
                              <div className={styles.exerciseRow}>
                                <span className={styles.exerciseNumber}>{index + 1}.</span>
                                <span className={styles.exerciseName}>{exercise.name}</span>
                                {isAerobic ? (
                                  <span className={styles.exerciseParams}>
                                    {exercise.duration || 30} {t('createWorkout.minutes')}
                                  </span>
                                ) : (
                                  <>
                                    <span className={styles.exerciseParams}>
                                      {sets} × {reps}
                                    </span>
                                    {weight && (
                                      <span className={styles.exerciseWeight}>
                                        ({weight})
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
                  <p className={styles.noExercisesMessage}>{t('workoutDetails.noExercisesWeek')}</p>
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
          <p className={styles.noExercisesMessage}>{t('workoutDetails.noWeeks')}</p>
        )}
      </div>

      {isDateModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsDateModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{t('workoutDetails.selectTrainingDate')}</h3>
            <p className={styles.modalSubtitle}>
              {selectedDay && t(`daysFull.${selectedDay.dayKey}`)}
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
