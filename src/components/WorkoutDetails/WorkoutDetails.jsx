import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { workoutsService, assignedWorkoutsService, clientsService, clientBaseService } from "../../firebase/services";
import CustomDatePicker from "../CustomDatePicker";
import Notification from "../Notification";
import { useNotification } from "../../hooks/useNotification";
import styles from './WorkoutDetails.module.scss';
import BackButton from "../BackButton";
import SkeletonLoader from "../SkeletonLoader";

const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// Функция для конвертации даты из YYYY-MM-DD в DD.MM.YYYY для отображения
const formatDateForDisplay = (isoDate) => {
  if (!isoDate) return '';
  
  // Если дата уже в формате DD.MM.YYYY, возвращаем как есть
  if (isoDate.includes('.')) return isoDate;
  
  // Конвертируем из YYYY-MM-DD в DD.MM.YYYY
  const [year, month, day] = isoDate.split('-');
  return `${day}.${month}.${year}`;
};

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
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState('');
  const [exerciseComments, setExerciseComments] = useState({});
  const [clientBase, setClientBase] = useState([]); // 🔥 База упражнений клиента

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
        
        // ✅ ОПТИМИЗАЦИЯ: Загружаем все данные параллельно (включая clientBase)
        console.log('📥 Начинаем параллельную загрузку данных');
        const startTime = Date.now();
        
        const [client, workoutData, assignments, clientBaseData] = await Promise.all([
          clientsService.getById(params.clientId),
          workoutsService.getById(params.workoutId),
          assignedWorkoutsService.getAssignedWorkoutsByClientId(params.clientId),
          clientBaseService.getByClientId(params.clientId) // 🔥 Загружаем базу упражнений
        ]);
        
        console.log('✅ Все данные загружены за:', Date.now() - startTime, 'мс');
        console.log('👤 Клиент:', client?.data?.name, client?.data?.surname);
        console.log('📦 Данные тренировки:', workoutData);
        console.log('🏋️ База упражнений клиента:', clientBaseData.length, 'упражнений');
        
        setClientData(client);
        setClientBase(clientBaseData); // 🔥 Сохраняем базу упражнений
        
        // Нормализация структуры недель
        if (workoutData) {
          // Если есть старая структура days без weeks - конвертируем
          if (workoutData.days && !workoutData.weeks) {
            console.log('🔄 Конвертируем старую структуру days в weeks');
            workoutData.weeks = [{ weekNumber: 1, days: workoutData.days }];
            delete workoutData.days;
          }
          
          // Если есть totalWeeks (даже 0) но нет weeks - пробуем загрузить из subcollection
          if (workoutData.totalWeeks !== undefined && (!workoutData.weeks || workoutData.weeks.length === 0)) {
            console.log('📦 Обнаружена структура с subcollection, totalWeeks:', workoutData.totalWeeks);
            
            try {
              const loadedWeeks = [];
              let weekNumber = 1;
              let maxAttempts = 20; // Максимум 20 недель для безопасности
              
              // Загружаем недели пока они существуют
              while (weekNumber <= maxAttempts) {
                const weekRef = doc(db, 'workouts', params.workoutId, 'weeks', String(weekNumber));
                const weekSnap = await getDoc(weekRef);
                
                if (weekSnap.exists()) {
                  loadedWeeks.push(weekSnap.data());
                  weekNumber++;
                } else {
                  // Если неделя не найдена - прекращаем поиск
                  break;
                }
              }
              
              workoutData.weeks = loadedWeeks;
              console.log('✅ Загружено недель из subcollection:', workoutData.weeks.length);
            } catch (error) {
              console.error('❌ Ошибка загрузки недель из subcollection:', error);
              workoutData.weeks = [];
            }
          }
          
          // Если всё ещё нет weeks - устанавливаем пустой массив
          if (!workoutData.weeks) {
            console.log('⚠️ Недели не найдены, устанавливаем пустой массив');
            workoutData.weeks = [];
          }
        }

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
               const weekIndex = workoutData.weeks.findIndex(w => w.weekNumber === latestAssignment.weekNumber);
               
               if (weekIndex !== -1) {
                  const dateKey = `week${weekIndex}_${dayKey}`;
                  dates[dateKey] = latestAssignment.weekData.dates[dayKey];
                  initialWeekIndex = weekIndex;
               }
            });
            console.log('📅 Восстановлены даты из назначения:', dates);
          }
        }

        setLatestDates(dates);
        setWorkout(workoutData);
        setSelectedWeekIndex(initialWeekIndex);
        setLastAssignedWeek(lastAssignedWeekNum);
        
        // Загружаем комментарии из назначенных тренировок
        const commentsMap = {};
        if (assignments.length > 0) {
          assignments.forEach(assignment => {
            if (assignment.weekData && assignment.weekData.days) {
              Object.keys(assignment.weekData.days).forEach(dayKey => {
                const dayExercises = assignment.weekData.days[dayKey]?.exercises || [];
                dayExercises.forEach((exercise, exIndex) => {
                  // Проверяем обычное упражнение
                  if (exercise.exerciseData?.comment) {
                    const key = `${exercise.id || exercise.exercise_id}_${dayKey}`;
                    commentsMap[key] = exercise.exerciseData.comment;
                  }
                  
                  // Проверяем упражнения в группе (суперсет)
                  if (exercise.type === 'group' && exercise.exercises) {
                    exercise.exercises.forEach((subEx, subIndex) => {
                      if (subEx.exerciseData?.comment) {
                        const key = `${subEx.id || subEx.exercise_id}_${dayKey}`;
                        commentsMap[key] = subEx.exerciseData.comment;
                      }
                    });
                  }
                });
              });
            }
          });
        }
        setExerciseComments(commentsMap);
        
        console.log('🎯 setWorkout выполнен (шаблон + даты из назначения)');
        console.log('💬 Загружено комментариев:', Object.keys(commentsMap).length);
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
    const editUrl = `/edit_workout/${params.clientId}/${params.workoutId}`;
    console.log('🔧 Переход на редактирование:', editUrl);
    console.log('📍 Параметры:', { clientId: params.clientId, workoutId: params.workoutId });
    navigate(editUrl);
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

  // Обработчик клика на иконку комментария
  const handleCommentClick = (e, comment) => {
    e.stopPropagation();
    setSelectedComment(comment);
    setCommentModalOpen(true);
  };

  const handleCloseCommentModal = () => {
    setCommentModalOpen(false);
    setSelectedComment('');
  };

  // 🔥 Функция для получения актуального веса из client_base
  const getActualWeight = (exerciseId, numberTimes) => {
    if (!clientBase || clientBase.length === 0) return null;
    
    // Ищем упражнение в базе по exercise_id
    const exercise = clientBase.find(ex => ex.exercise_id === exerciseId);
    if (!exercise || !exercise.data) return null;
    
    // Индекс = количество раз - 1 (например, 8 раз = индекс 7)
    const weightIndex = String(numberTimes - 1);
    const weight = exercise.data[weightIndex];
    
    // Возвращаем вес только если он не пустой
    if (weight && weight !== '' && weight !== '—') {
      return weight;
    }
    
    return null;
  };

  // Для упражнений из колонок "* X" приоритет у сохраненного веса со звездочкой
  const hasStarWeight = (exercise) => {
    const starWeight = exercise?.exerciseData?.weight;
    return Boolean(
      exercise?.exerciseData?.weightFromStar &&
      starWeight &&
      starWeight !== '' &&
      starWeight !== '—'
    );
  };

  // 🔥 Функция для обновления весов в weekData перед отправкой клиенту
  const updateWeightsInWeekData = (weekData) => {
    const updatedWeekData = { ...weekData };
    
    // Проходим по всем дням недели
    DAYS_ORDER.forEach(dayKey => {
      const dayExercises = weekData.days[dayKey]?.exercises || [];
      
      if (dayExercises.length > 0) {
        // Обновляем упражнения в этом дне
        const updatedExercises = dayExercises.map(exercise => {
          // Проверяем, является ли это группой
          if (exercise.type === 'group' && exercise.exercises && exercise.exercises.length > 0) {
            // Обновляем упражнения в группе
            const updatedGroupExercises = exercise.exercises.map(ex => {
              const isAerobic = ex.category_id === '6';
              if (isAerobic) return ex; // Аэробные упражнения не имеют веса

              // Не перезаписываем вес, если он выбран из колонки "*"
              if (hasStarWeight(ex)) return ex;
              
              const reps = ex.exerciseData?.reps || ex.numberTimes || 8;
              const actualWeight = getActualWeight(ex.exercise_id, reps);
              
              if (actualWeight) {
                return {
                  ...ex,
                  exerciseData: {
                    ...ex.exerciseData,
                    weight: actualWeight
                  }
                };
              }
              
              return ex;
            });
            
            return {
              ...exercise,
              exercises: updatedGroupExercises
            };
          }
          
          // Обычное упражнение
          const isAerobic = exercise.category_id === '6';
          if (isAerobic) return exercise; // Аэробные упражнения не имеют веса

          // Не перезаписываем вес, если он выбран из колонки "*"
          if (hasStarWeight(exercise)) return exercise;
          
          const reps = exercise.exerciseData?.reps || exercise.numberTimes || 8;
          const actualWeight = getActualWeight(exercise.exercise_id, reps);
          
          if (actualWeight) {
            return {
              ...exercise,
              exerciseData: {
                ...exercise.exerciseData,
                weight: actualWeight
              }
            };
          }
          
          return exercise;
        });
        
        // Обновляем день с новыми упражнениями
        if (!updatedWeekData.days) {
          updatedWeekData.days = {};
        }
        updatedWeekData.days[dayKey] = {
          ...updatedWeekData.days[dayKey],
          exercises: updatedExercises
        };
      }
    });
    
    return updatedWeekData;
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

    // ✅ УБРАНА ПРОВЕРКА: Теперь можно отправлять любую неделю повторно
    // Это позволяет отправлять одну и ту же неделю несколько раз с разными датами

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
      
      // 🔥 ОБНОВЛЯЕМ ВЕСА: Получаем актуальные веса из client_base перед отправкой
      const weekDataWithUpdatedWeights = updateWeightsInWeekData(weekData);
      console.log('✅ Веса обновлены из client_base');
      
      // Подготавливаем данные недели с датами
      const weekDataWithDates = {
        ...weekDataWithUpdatedWeights,
        dates: {}
      };
      
      // Собираем даты для каждого дня недели
      DAYS_ORDER.forEach(dayKey => {
        const dateKey = `week${selectedWeekIndex}_${dayKey}`;
        if (latestDates[dateKey]) {
          // Конвертируем дату из DD.MM.YYYY в YYYY-MM-DD для совместимости с dayjs
          const dateString = latestDates[dateKey]; // DD.MM.YYYY
          const parts = dateString.split('.');
          
          // Проверяем что все части даты присутствуют
          if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
            const [day, month, year] = parts;
            const isoDate = `${year}-${month}-${day}`; // YYYY-MM-DD
            console.log(`📅 Дата для ${dayKey}:`, isoDate);
            weekDataWithDates.dates[dayKey] = isoDate;
          } else {
            console.error(`❌ Некорректный формат даты для ${dayKey}:`, dateString);
          }
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
        <SkeletonLoader type="details" />
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
      <div className={styles.workoutDetailsContent}>
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
                            {formatDateForDisplay(selectedDate)}
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
                                      const isStarWeight = hasStarWeight(ex);
                                      
                                      // 🔥 Получаем актуальный вес из client_base (используем exercise_id, а не id!)
                                      const actualWeight = isStarWeight ? null : getActualWeight(ex.exercise_id, reps);
                                      const displayWeight = (isStarWeight ? ex.exerciseData?.weight : null) || actualWeight || weight;
                                      
                                      // Проверяем наличие комментария для этого упражнения
                                      const commentKey = `${ex.id || ex.exercise_id}_${dayKey}`;
                                      const hasComment = exerciseComments[commentKey];
                                      
                                      return (
                                        <span key={idx} className={styles.groupExerciseItem}>
                                          <span className={styles.exerciseName}>{ex.name}</span>
                                          {/* Иконка комментария для упражнения в группе */}
                                          {hasComment && (
                                            <span 
                                              className={styles.commentIcon}
                                              onClick={(e) => handleCommentClick(e, hasComment)}
                                              title={t('workoutDetails.viewComment') || 'Посмотреть комментарий'}
                                            >
                                              ⚠️
                                            </span>
                                          )}
                                          {isAerobic ? (
                                            <span className={styles.exerciseParams}>
                                              {ex.duration || 30} {t('createWorkout.minutes')}
                                            </span>
                                          ) : (
                                            <>
                                              <span className={styles.exerciseParams}>
                                                {sets}×{reps}
                                              </span>
                                              {displayWeight && (
                                                <span className={styles.exerciseWeight}>
                                                  ({displayWeight})
                                                  {isStarWeight && <span className={styles.starWeightMark}>*</span>}
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
                          const isStarWeight = hasStarWeight(exercise);
                          
                          // 🔥 Получаем актуальный вес из client_base (используем exercise_id, а не id!)
                          const actualWeight = isStarWeight ? null : getActualWeight(exercise.exercise_id, reps);
                          const displayWeight = (isStarWeight ? exercise.exerciseData?.weight : null) || actualWeight || weight;
                          
                          // Проверяем наличие комментария для этого упражнения
                          const commentKey = `${exercise.id || exercise.exercise_id}_${dayKey}`;
                          const hasComment = exerciseComments[commentKey];
                          
                          return (
                            <li key={exercise.id} className={styles.exerciseItem}>
                              <div className={styles.exerciseRow}>
                                <span className={styles.exerciseNumber}>{index + 1}.</span>
                                <span className={styles.exerciseName}>{exercise.name}</span>
                                {/* Иконка комментария */}
                                {hasComment && (
                                  <span 
                                    className={styles.commentIcon}
                                    onClick={(e) => handleCommentClick(e, hasComment)}
                                    title={t('workoutDetails.viewComment') || 'Посмотреть комментарий'}
                                  >
                                    ⚠️
                                  </span>
                                )}
                                {isAerobic ? (
                                  <span className={styles.exerciseParams}>
                                    {exercise.duration || 30} {t('createWorkout.minutes')}
                                  </span>
                                ) : (
                                  <>
                                    <span className={styles.exerciseParams}>
                                      {sets} × {reps}
                                    </span>
                                    {displayWeight && (
                                      <span className={styles.exerciseWeight}>
                                        ({displayWeight})
                                        {isStarWeight && <span className={styles.starWeightMark}>*</span>}
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
      </div> {/* Закрываем workoutDetailsContent */}

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

      {/* Модальное окно для отображения комментария */}
      {commentModalOpen && (
        <div className={styles.modalOverlay} onClick={handleCloseCommentModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Комментарий к упражнению</h3>
            <p className={styles.commentText}>{selectedComment}</p>
            <button className={styles.closeButton} onClick={handleCloseCommentModal}>
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
