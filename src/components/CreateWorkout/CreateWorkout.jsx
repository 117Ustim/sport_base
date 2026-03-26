import { useNavigate } from "react-router";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { clientBaseService, categoriesService, workoutsService } from "../../firebase/services";
import { useState, useEffect, useCallback } from "react";
import { arrayMove } from '@dnd-kit/sortable';
import { useNotification } from '../../hooks/useNotification';
import { useOptimisticUpdate } from '../../hooks';
import Notification from '../Notification';
import ConfirmDialog from '../ConfirmDialog';
import TopBar from './components/TopBar';
import WorkoutModal from './components/WorkoutModal';
import DaySelector from './components/DaySelector';
import WeekSelector from './components/WeekSelector';
import ExercisesList from './components/ExercisesList';
import ExercisesPanel from './components/ExercisesPanel';
import styles from './CreateWorkout.module.scss';

export default function CreateWorkout() {
  const navigate = useNavigate();
  const params = useParams();
  const { t } = useTranslation();

  const [exercises, setExercises] = useState([]);
  const [categories, setCategories] = useState([]);
  const [columns, setColumns] = useState([]); // Колонки из client_base
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTrainingName, setNewTrainingName] = useState("");
  const [workout, setWorkout] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [selectedDay, setSelectedDay] = useState('monday');
  const [addMode, setAddMode] = useState('single');
  const [groupDraft, setGroupDraft] = useState([]);
  const [deleteWeekDialog, setDeleteWeekDialog] = useState({ isOpen: false, weekIndex: null });
  const [lastAddedExerciseId, setLastAddedExerciseId] = useState(null); // ID последнего добавленного упражнения
  const { notification, showNotification } = useNotification();
  const { executeOptimistic } = useOptimisticUpdate();

  const isEditMode = params.workoutId !== undefined;

  // 🔥 Функция для получения веса из client_base по exercise_id и количеству повторений
  const getWeightFromBase = useCallback((exerciseId, numberTimes) => {
    if (!exercises || exercises.length === 0) return '';
    
    // Ищем упражнение в базе по exercise_id
    const exercise = exercises.find(ex => ex.exercise_id === exerciseId);
    if (!exercise || !exercise.data) return '';
    
    let weight;
    
    // ✅ Пытаемся найти колонку по названию (например "8")
    if (columns && columns.length > 0) {
      const numericColumn = columns.find(col => String(col.name).trim() === String(numberTimes));
      if (numericColumn) {
        weight = exercise.data[numericColumn.id] ?? exercise.data[String(numericColumn.id)];
      }
    }
    
    // Fallback: индекс = количество раз - 1 (старая логика)
    if (weight === undefined) {
      const weightIndex = String(numberTimes - 1);
      weight = exercise.data[weightIndex];
    }
    
    // Возвращаем вес только если он не пустой
    if (weight && weight !== '' && weight !== '—') {
      return weight;
    }
    
    return '';
  }, [exercises, columns]);

  useEffect(() => {
    let isActive = true;

    const loadData = async () => {
      try {
        // Загружаем exercises, categories и metadata параллельно
        const [exercisesData, categoriesData, metadata] = await Promise.all([
          clientBaseService.getByClientId(params.id),
          categoriesService.getAll(),
          clientBaseService.getMetadata(params.id)
        ]);

        if (!isActive) return;

        setExercises(exercisesData);
        setCategories(categoriesData);
        setColumns(metadata.columns || []); // Сохраняем колонки

        if (isEditMode) {
          const data = await workoutsService.getById(params.workoutId);
          
          if (!isActive) return;

          if (data) {
            // Конвертируем старую структуру days в weeks
            if (data.days && !data.weeks) {
              data.weeks = [{
                weekNumber: 1,
                days: data.days
              }];
              delete data.days;
            }
            
            // Если есть totalWeeks но нет weeks - загружаем из subcollection
            if (data.totalWeeks !== undefined && (!data.weeks || data.weeks.length === 0)) {
              console.log('📦 Обнаружена структура с subcollection, totalWeeks:', data.totalWeeks);
              
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
                
                data.weeks = loadedWeeks;
                console.log('✅ Загружено недель из subcollection:', data.weeks.length);
              } catch (error) {
                console.error('❌ Ошибка загрузки недель из subcollection:', error);
                data.weeks = [];
              }
            }
            
            // Если всё ещё нет weeks - создаём пустую структуру
            if (!data.weeks || data.weeks.length === 0) {
              data.weeks = [{
                weekNumber: 1,
                days: {
                  monday: { exercises: [] },
                  tuesday: { exercises: [] },
                  wednesday: { exercises: [] },
                  thursday: { exercises: [] },
                  friday: { exercises: [] },
                  saturday: { exercises: [] },
                  sunday: { exercises: [] }
                }
              }];
            }
            
            setWorkout(data);
          }
        }
      } catch (error) {
        if (!isActive) return;
        showNotification(t('createWorkout.errorLoading'), 'error');
      }
    };

    loadData();

    return () => {
      isActive = false;
    };
  }, [params.id, params.workoutId, isEditMode]); // ✅ Убрали showNotification и t из зависимостей

  const onButtonBack = () => {
    navigate(-1);
  };

  const onGoToClientBase = () => {
    // Переход в client_base данного клиента
    navigate(`/client_base/${params.id}`);
  };

  const onOpenModal = () => {
    setIsModalOpen(true);
    setNewTrainingName("");
  };

  const onCloseModal = () => {
    setIsModalOpen(false);
    setNewTrainingName("");
  };

  const onCreateTraining = () => {
    if (!newTrainingName.trim()) {
      showNotification(t('createWorkout.newTrainingName'), "error");
      return;
    }

    const newWorkout = {
      id: Date.now(),
      name: newTrainingName,
      clientId: params.id,
      weeks: [{
        weekNumber: 1,
        days: {
          monday: { exercises: [] },
          tuesday: { exercises: [] },
          wednesday: { exercises: [] },
          thursday: { exercises: [] },
          friday: { exercises: [] },
          saturday: { exercises: [] },
          sunday: { exercises: [] }
        }
      }]
    };

    setWorkout(newWorkout);
    setSelectedWeek(0);
    onCloseModal();
  };

  const onAddWeek = () => {
    if (!workout) return;

    const newWeekNumber = workout.weeks.length + 1;
    const newWeek = {
      weekNumber: newWeekNumber,
      days: {
        monday: { exercises: [] },
        tuesday: { exercises: [] },
        wednesday: { exercises: [] },
        thursday: { exercises: [] },
        friday: { exercises: [] },
        saturday: { exercises: [] },
        sunday: { exercises: [] }
      }
    };

    const updatedWorkout = {
      ...workout,
      weeks: [...workout.weeks, newWeek]
    };

    setWorkout(updatedWorkout);
    setSelectedWeek(workout.weeks.length);
  };

  const onDeleteWeek = (weekIndex) => {
    if (workout.weeks.length <= 1) {
      showNotification(t('createWorkout.lastWeekError'), "error");
      return;
    }
    
    setDeleteWeekDialog({ isOpen: true, weekIndex });
  };

  const confirmDeleteWeek = () => {
    const { weekIndex } = deleteWeekDialog;
    
    if (weekIndex === null) return;

    const updatedWeeks = workout.weeks.filter((_, index) => index !== weekIndex);
    
    const renumberedWeeks = updatedWeeks.map((week, index) => ({
      ...week,
      weekNumber: index + 1
    }));

    const updatedWorkout = {
      ...workout,
      weeks: renumberedWeeks
    };

    setWorkout(updatedWorkout);
    
    if (selectedWeek === weekIndex) {
      setSelectedWeek(Math.max(0, weekIndex - 1));
    } else if (selectedWeek > weekIndex) {
      setSelectedWeek(selectedWeek - 1);
    }
    
    setDeleteWeekDialog({ isOpen: false, weekIndex: null });
    showNotification(t('createWorkout.weekDeleted'), "success");
  };

  const cancelDeleteWeek = () => {
    setDeleteWeekDialog({ isOpen: false, weekIndex: null });
  };

  const onSelectExercise = useCallback((exercise) => {
    if (!workout) {
      showNotification(t('createWorkout.createTrainingFirst'), "error");
      return;
    }

    const currentDayExercises = workout.weeks[selectedWeek].days[selectedDay].exercises || [];
    
    const isAerobic = exercise.category_id === '6';

    const newExercise = {
      id: `${Date.now()}-${Math.random()}`,
      name: exercise.name,
      exercise_id: exercise.exercise_id,
      category_id: exercise.category_id,
      exerciseData: exercise.data,
    };

    if (isAerobic) {
      newExercise.duration = 30;
    } else {
      newExercise.numberSteps = 3;
      newExercise.numberTimes = 8;
      
      // 🔥 АВТОМАТИЧЕСКАЯ ЗАГРУЗКА ВЕСА ИЗ CLIENT_BASE
      const weightByReps = getWeightFromBase(exercise.exercise_id, newExercise.numberTimes);
      
      if (weightByReps) {
        newExercise.exerciseData = {
          ...exercise.data,
          weight: weightByReps
        };
        console.log(`✅ Автозагрузка веса для "${exercise.name}": ${weightByReps} кг (${newExercise.numberTimes} повторений)`);
      } else {
        console.log(`ℹ️  Вес для "${exercise.name}" не найден для ${newExercise.numberTimes} повторений (оставляем пустым)`);
      }
    }

    if (addMode === 'group' && !isAerobic) {
      setGroupDraft([...groupDraft, newExercise]);
    } else {
      newExercise.type = 'single';
      
      const updatedWeeks = [...workout.weeks];
      
      updatedWeeks[selectedWeek] = {
        ...updatedWeeks[selectedWeek],
        days: {
          ...updatedWeeks[selectedWeek].days,
          [selectedDay]: {
            exercises: [...currentDayExercises, newExercise]
          }
        }
      };

      setWorkout({ ...workout, weeks: updatedWeeks });
      
      // 🎯 Сохраняем ID последнего добавленного упражнения
      setLastAddedExerciseId(newExercise.id);
      
      if (isAerobic && addMode === 'group') {
         showNotification(t('createWorkout.aerobicAddedAsSingle'), "info");
      }
    }
  }, [workout, selectedWeek, selectedDay, addMode, groupDraft, showNotification, t]);

  const onConfirmGroup = () => {
    if (groupDraft.length < 2) {
      showNotification(t('createWorkout.minExercisesInGroup'), "error");
      return;
    }

    const currentDayExercises = workout.weeks[selectedWeek].days[selectedDay].exercises || [];

    const newGroup = {
      id: `group-${Date.now()}-${Math.random()}`,
      type: 'group',
      exercises: groupDraft
    };

    const updatedWeeks = [...workout.weeks];
    
    updatedWeeks[selectedWeek] = {
      ...updatedWeeks[selectedWeek],
      days: {
        ...updatedWeeks[selectedWeek].days,
        [selectedDay]: {
          exercises: [...currentDayExercises, newGroup]
        }
      }
    };

    setWorkout({ ...workout, weeks: updatedWeeks });
    setGroupDraft([]);
    showNotification(t('createWorkout.groupCreated'), "success");
  };

  const onCancelGroup = () => {
    setGroupDraft([]);
    setAddMode('single');
  };

  const onSaveWorkout = async () => {
    if (!workout) {
      showNotification(t('createWorkout.createTrainingFirst'), "error");
      return;
    }

    const hasExercises = workout.weeks.some(week => 
      Object.values(week.days).some(day => day.exercises.length > 0)
    );
    
    if (!hasExercises) {
      showNotification(t('createWorkout.addExerciseError'), "error");
      return;
    }

    const workoutToSave = {
      ...workout,
      clientId: params.id
    };

    // Сохраняем предыдущее состояние для отката
    const previousWorkout = { ...workout };

    await executeOptimistic({
      // 1. Мгновенно показываем успех (optimistic)
      optimisticUpdate: () => {
        const successMessage = isEditMode 
          ? t('createWorkout.trainingUpdated') 
          : t('createWorkout.trainingSaved');
        showNotification(successMessage, "success");
      },
      // 2. Реальный API запрос
      apiCall: async () => {
        if (isEditMode) {
          return await workoutsService.update(params.workoutId, workoutToSave);
        } else {
          return await workoutsService.create(workoutToSave);
        }
      },
      // 3. Откат при ошибке
      rollback: () => {
        setWorkout(previousWorkout);
      },
      // 4. При успехе переходим назад
      onSuccess: () => {
        setTimeout(() => {
          navigate(-1);
        }, 1500);
      },
      // 5. При ошибке показываем уведомление
      onError: (error) => {
        showNotification(t('createWorkout.saveError', { error: error.message }), "error");
      }
    });
  };

  const getWeightForReps = (exerciseData, reps, exerciseId) => {
    // 🔥 ПРИОРИТЕТ 1: Если вес был выбран из колонки "*" — используем его
    if (exerciseData && exerciseData.weightFromStar && exerciseData.weight) {
      return exerciseData.weight;
    }
    
    // 🔥 ПРИОРИТЕТ 2: Берём актуальный вес из client_base (всегда самый свежий!)
    if (exerciseId) {
      const weightFromBase = getWeightFromBase(exerciseId, reps);
      if (weightFromBase) {
        return weightFromBase;
      }
    }
    
    // 🔥 ПРИОРИТЕТ 3: Если есть сохранённый вес (fallback), используем его
    if (exerciseData && exerciseData.weight) {
      return exerciseData.weight;
    }
    
    // 🔥 ПРИОРИТЕТ 3 (fallback): Берём вес из exerciseData по индексу (старая логика)
    if (!exerciseData || !exerciseData[reps - 1]) {
      return "—";
    }
    return exerciseData[reps - 1] || "—";
  };

  const handleDragEnd = (event, dayKey) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    if (dayKey === 'draft') {
      const oldIndex = groupDraft.findIndex(ex => ex.id === active.id);
      const newIndex = groupDraft.findIndex(ex => ex.id === over.id);
      
      const reorderedDraft = arrayMove(groupDraft, oldIndex, newIndex);
      setGroupDraft(reorderedDraft);
      return;
    }

    const dayExercises = workout.weeks[selectedWeek].days[dayKey].exercises;
    const oldIndex = dayExercises.findIndex(ex => ex.id === active.id);
    const newIndex = dayExercises.findIndex(ex => ex.id === over.id);

    const reorderedExercises = arrayMove(dayExercises, oldIndex, newIndex);

    const updatedWeeks = [...workout.weeks];
    updatedWeeks[selectedWeek] = {
      ...updatedWeeks[selectedWeek],
      days: {
        ...updatedWeeks[selectedWeek].days,
        [dayKey]: {
          exercises: reorderedExercises
        }
      }
    };

    setWorkout({ ...workout, weeks: updatedWeeks });
  };

  const handleUpdateExercise = useCallback((exerciseId, dayKey, field, value) => {
    // 🎯 При изменении параметров упражнения обновляем lastAddedExerciseId
    setLastAddedExerciseId(exerciseId);
    
    const draftExercise = groupDraft.find(ex => ex.id === exerciseId);
    
    if (draftExercise) {
      // Обновляем упражнение в черновике группы
      const updatedDraft = groupDraft.map(ex => {
        if (ex.id === exerciseId) {
          const updated = { ...ex, [field]: Number(value) };
          
          // 🔥 Если изменили количество повторений → автоматически обновляем вес
          if (field === 'numberTimes' && ex.exerciseData) {
            const newReps = Number(value);
            const weightForNewReps = getWeightFromBase(ex.exercise_id, newReps);
            
            // Сбрасываем флаг isFromStarColumn при изменении повторений
            delete updated.isFromStarColumn;
            
            if (weightForNewReps) {
              const { weightFromStar, ...dataWithoutStar } = ex.exerciseData;
              updated.exerciseData = {
                ...dataWithoutStar,
                weight: weightForNewReps
              };
              console.log(`✅ Вес обновлен для "${ex.name}": ${weightForNewReps} кг (${newReps} повторений)`);
            } else {
              // Убираем вес если его нет для нового количества повторений
              const { weight, weightFromStar, ...dataWithoutWeight } = ex.exerciseData;
              updated.exerciseData = dataWithoutWeight;
              console.log(`ℹ️  Вес убран для "${ex.name}" (нет веса для ${newReps} повторений)`);
            }
          }
          
          return updated;
        }
        return ex;
      });
      setGroupDraft(updatedDraft);
    } else {
      // Обновляем упражнение в тренировке
      const updatedWeeks = [...workout.weeks];
      updatedWeeks[selectedWeek] = {
        ...updatedWeeks[selectedWeek],
        days: {
          ...updatedWeeks[selectedWeek].days,
          [dayKey]: {
            exercises: updatedWeeks[selectedWeek].days[dayKey].exercises.map(ex => {
              if (ex.id === exerciseId) {
                const updated = { ...ex, [field]: Number(value) };
                
                // 🔥 Если изменили количество повторений → автоматически обновляем вес
                if (field === 'numberTimes' && ex.exerciseData) {
                  const newReps = Number(value);
                  const weightForNewReps = getWeightFromBase(ex.exercise_id, newReps);
                  
                  // Сбрасываем флаг isFromStarColumn при изменении повторений
                  delete updated.isFromStarColumn;
                  
                  if (weightForNewReps) {
                    const { weightFromStar, ...dataWithoutStar } = ex.exerciseData;
                    updated.exerciseData = {
                      ...dataWithoutStar,
                      weight: weightForNewReps
                    };
                    console.log(`✅ Вес обновлен для "${ex.name}": ${weightForNewReps} кг (${newReps} повторений)`);
                  } else {
                    // Убираем вес если его нет для нового количества повторений
                    const { weight, weightFromStar, ...dataWithoutWeight } = ex.exerciseData;
                    updated.exerciseData = dataWithoutWeight;
                    console.log(`ℹ️  Вес убран для "${ex.name}" (нет веса для ${newReps} повторений)`);
                  }
                }
                
                return updated;
              }
              return ex;
            })
          }
        }
      };
      setWorkout({ ...workout, weeks: updatedWeeks });
    }
  }, [workout, selectedWeek, groupDraft]);

  const handleRemoveExercise = useCallback((exerciseId, dayKey) => {
    const draftExercise = groupDraft.find(ex => ex.id === exerciseId);
    
    if (draftExercise) {
      setGroupDraft(groupDraft.filter(ex => ex.id !== exerciseId));
    } else {
      const updatedWeeks = [...workout.weeks];
      updatedWeeks[selectedWeek] = {
        ...updatedWeeks[selectedWeek],
        days: {
          ...updatedWeeks[selectedWeek].days,
          [dayKey]: {
            exercises: updatedWeeks[selectedWeek].days[dayKey].exercises.filter(ex => ex.id !== exerciseId)
          }
        }
      };
      setWorkout({ ...workout, weeks: updatedWeeks });
    }
  }, [workout, selectedWeek, groupDraft]);

  const handleBulkChangeReps = useCallback((reps) => {
    if (!workout) {
      showNotification(t('createWorkout.createTrainingFirst'), "error");
      return;
    }

    const currentDayExercises = workout.weeks[selectedWeek].days[selectedDay].exercises || [];
    
    if (currentDayExercises.length === 0) {
      showNotification(t('createWorkout.noExercisesInDay'), "error");
      return;
    }

    const updatedExercises = currentDayExercises.map(exercise => {
      if (exercise.type === 'group') {
        return {
          ...exercise,
          exercises: exercise.exercises.map(ex => {
            const isAerobic = ex.category_id === '6';
            if (isAerobic) return ex;
            
            const updated = { ...ex, numberTimes: reps };
            
            // 🔥 Автоматически обновляем вес для нового количества повторений
            if (ex.exerciseData) {
              const weightForNewReps = getWeightFromBase(ex.exercise_id, reps);
              
              if (weightForNewReps) {
                const { weightFromStar, ...dataWithoutStar } = ex.exerciseData;
                updated.exerciseData = {
                  ...dataWithoutStar,
                  weight: weightForNewReps
                };
              } else {
                // Убираем вес если его нет для нового количества повторений
                const { weight, weightFromStar, ...dataWithoutWeight } = ex.exerciseData;
                updated.exerciseData = dataWithoutWeight;
              }
            }
            
            return updated;
          })
        };
      } else {
        const isAerobic = exercise.category_id === '6';
        if (isAerobic) return exercise;
        
        const updated = { ...exercise, numberTimes: reps };
        
        // 🔥 Автоматически обновляем вес для нового количества повторений
        if (exercise.exerciseData) {
          const weightForNewReps = getWeightFromBase(exercise.exercise_id, reps);
          
          if (weightForNewReps) {
            const { weightFromStar, ...dataWithoutStar } = exercise.exerciseData;
            updated.exerciseData = {
              ...dataWithoutStar,
              weight: weightForNewReps
            };
          } else {
            // Убираем вес если его нет для нового количества повторений
            const { weight, weightFromStar, ...dataWithoutWeight } = exercise.exerciseData;
            updated.exerciseData = dataWithoutWeight;
          }
        }
        
        return updated;
      }
    });

    const updatedWeeks = [...workout.weeks];
    updatedWeeks[selectedWeek] = {
      ...updatedWeeks[selectedWeek],
      days: {
        ...updatedWeeks[selectedWeek].days,
        [selectedDay]: {
          exercises: updatedExercises
        }
      }
    };

    setWorkout({ ...workout, weeks: updatedWeeks });
    showNotification(t('createWorkout.repsChanged', { reps }), "success");
  }, [workout, selectedWeek, selectedDay, showNotification, t]);

  // Функция для подстановки веса из колонки "*"
  const handleColumnWeightClick = useCallback((columnId) => {
    if (!workout) {
      showNotification(t('createWorkout.createTrainingFirst'), "error");
      return;
    }

    const currentDayExercises = workout.weeks[selectedWeek].days[selectedDay].exercises || [];
    
    if (currentDayExercises.length === 0) {
      showNotification(t('createWorkout.noExercisesInDay'), "error");
      return;
    }

    let updatedCount = 0;

    const updatedExercises = currentDayExercises.map(exercise => {
      if (exercise.type === 'group') {
        return {
          ...exercise,
          exercises: exercise.exercises.map(ex => {
            const isAerobic = ex.category_id === '6';
            if (isAerobic) return ex;
            
            // Получаем вес из колонки
            if (ex.exerciseData && ex.exerciseData[columnId]) {
              const weightFromColumn = ex.exerciseData[columnId];
              
              if (weightFromColumn && weightFromColumn !== '' && weightFromColumn !== '—') {
                updatedCount++;
                return {
                  ...ex,
                  exerciseData: {
                    ...ex.exerciseData,
                    weight: weightFromColumn
                  }
                };
              }
            }
            
            return ex;
          })
        };
      } else {
        const isAerobic = exercise.category_id === '6';
        if (isAerobic) return exercise;
        
        // Получаем вес из колонки
        if (exercise.exerciseData && exercise.exerciseData[columnId]) {
          const weightFromColumn = exercise.exerciseData[columnId];
          
          if (weightFromColumn && weightFromColumn !== '' && weightFromColumn !== '—') {
            updatedCount++;
            return {
              ...exercise,
              exerciseData: {
                ...exercise.exerciseData,
                weight: weightFromColumn
              }
            };
          }
        }
        
        return exercise;
      }
    });

    if (updatedCount === 0) {
      showNotification(t('createWorkout.noWeightInColumn'), "error");
      return;
    }

    const updatedWeeks = [...workout.weeks];
    updatedWeeks[selectedWeek] = {
      ...updatedWeeks[selectedWeek],
      days: {
        ...updatedWeeks[selectedWeek].days,
        [selectedDay]: {
          exercises: updatedExercises
        }
      }
    };

    setWorkout({ ...workout, weeks: updatedWeeks });
    showNotification(t('createWorkout.weightUpdated', { count: updatedCount }), "success");
  }, [workout, selectedWeek, selectedDay, showNotification, t]);

  // Функция для подстановки веса из колонок "* X" только для последнего добавленного упражнения
  const handleStarWeightClick = useCallback((reps) => {
    if (!workout || !columns || columns.length === 0) {
      return;
    }

    // 🎯 Проверяем есть ли ID последнего добавленного упражнения
    if (!lastAddedExerciseId) {
      showNotification("Сначала добавьте упражнение", "error");
      return;
    }

    const currentDayExercises = workout.weeks[selectedWeek].days[selectedDay].exercises || [];
    
    if (currentDayExercises.length === 0) {
      showNotification(t('createWorkout.noExercisesInDay'), "error");
      return;
    }

    // Ищем колонку с названием "* X" (например "* 8" или "* 12")
    const starColumnName = `* ${reps}`;
    const starColumn = columns.find(col => col.name === starColumnName);

    if (!starColumn) {
      showNotification(`Колонка "${starColumnName}" не найдена в базе`, "error");
      return;
    }

    // 🎯 Ищем последнее добавленное упражнение
    const targetExercise = currentDayExercises.find(ex => ex.id === lastAddedExerciseId);

    if (!targetExercise) {
      showNotification("Упражнение не найдено в текущем дне", "error");
      return;
    }

    // Проверяем что это не аэробное упражнение
    const isAerobic = targetExercise.category_id === '6';
    if (isAerobic) {
      showNotification("Нельзя применить вес к аэробному упражнению", "error");
      return;
    }

    // Проверяем что количество повторений совпадает
    if (targetExercise.numberTimes !== reps) {
      showNotification(`У упражнения "${targetExercise.name}" количество повторений ${targetExercise.numberTimes}, а не ${reps}`, "error");
      return;
    }

    // Берем данные из базы клиента (актуальные) с fallback на данные упражнения
    const baseExercise = exercises.find(ex => ex.exercise_id === targetExercise.exercise_id);
    const sourceData = baseExercise?.data || targetExercise.exerciseData;
    const weightFromColumn =
      sourceData?.[starColumn.id] ??
      sourceData?.[String(starColumn.id)] ??
      sourceData?.[starColumn.name];
    
    if (!weightFromColumn || weightFromColumn === '' || weightFromColumn === '—') {
      showNotification(`Вес не найден в колонке "${starColumnName}" для упражнения "${targetExercise.name}"`, "error");
      return;
    }

    // 🎯 Обновляем вес ТОЛЬКО для этого упражнения
    const updatedExercises = currentDayExercises.map(exercise => {
      if (exercise.id === lastAddedExerciseId) {
        return {
          ...exercise,
          exerciseData: {
            ...exercise.exerciseData,
            weight: weightFromColumn,
            weightFromStar: true
          },
          isFromStarColumn: true // Флаг что вес взят из колонки "*"
        };
      }
      return exercise;
    });

    const updatedWeeks = [...workout.weeks];
    updatedWeeks[selectedWeek] = {
      ...updatedWeeks[selectedWeek],
      days: {
        ...updatedWeeks[selectedWeek].days,
        [selectedDay]: {
          exercises: updatedExercises
        }
      }
    };

    setWorkout({ ...workout, weeks: updatedWeeks });
    showNotification(`Вес ${weightFromColumn} кг подставлен для упражнения "${targetExercise.name}" из колонки "${starColumnName}"`, "success");
  }, [workout, selectedWeek, selectedDay, columns, lastAddedExerciseId, exercises, showNotification, t]);

  return (
    <div className={styles.workoutCreator}>
      <Notification notification={notification} />

      <ConfirmDialog
        isOpen={deleteWeekDialog.isOpen}
        message={t('dialogs.confirmDeleteWeek', { number: deleteWeekDialog.weekIndex !== null ? workout?.weeks[deleteWeekDialog.weekIndex]?.weekNumber : '' })}
        onConfirm={confirmDeleteWeek}
        onCancel={cancelDeleteWeek}
      />

      <WorkoutModal
        isOpen={isModalOpen}
        trainingName={newTrainingName}
        onNameChange={setNewTrainingName}
        onCreate={onCreateTraining}
        onClose={onCloseModal}
      />

      <TopBar
        workout={workout}
        isEditMode={isEditMode}
        onBack={onButtonBack}
        onOpenModal={onOpenModal}
        onSave={onSaveWorkout}
        onGoToBase={onGoToClientBase}
      />

      {workout && workout.weeks && workout.weeks.length > 0 ? (
        <div className={styles.mainContentArea}>
          
          <div>
            <DaySelector
              selectedDay={selectedDay}
              workout={workout}
              selectedWeek={selectedWeek}
              onSelectDay={setSelectedDay}
            />

            <WeekSelector
              workout={workout}
              selectedWeek={selectedWeek}
              onSelectWeek={setSelectedWeek}
              onAddWeek={onAddWeek}
              onDeleteWeek={onDeleteWeek}
            />
          </div>

          <ExercisesList
            workout={workout}
            selectedWeek={selectedWeek}
            selectedDay={selectedDay}
            groupDraft={groupDraft}
            addMode={addMode}
            columns={columns}
            onDragEnd={handleDragEnd}
            onUpdateExercise={handleUpdateExercise}
            onRemoveExercise={handleRemoveExercise}
            onConfirmGroup={onConfirmGroup}
            getWeightForReps={getWeightForReps}
            onBulkChangeReps={handleBulkChangeReps}
            onColumnWeightClick={handleColumnWeightClick}
            onStarWeightClick={handleStarWeightClick}
          />

          <ExercisesPanel
            categories={categories}
            exercises={exercises}
            onSelectExercise={onSelectExercise}
            addMode={addMode}
            onAddModeChange={(mode) => {
              if (mode === 'single' && groupDraft.length > 0) {
                if (window.confirm(t('dialogs.cancelGroup'))) {
                  setGroupDraft([]);
                  setAddMode(mode);
                }
              } else {
                setAddMode(mode);
              }
            }}
            groupDraft={groupDraft}
            onCancelGroup={onCancelGroup}
          />
        </div>
      ) : (
        <div className={styles.noWorkoutMessage}>
          <p>{t('createWorkout.noWorkoutMessage')}</p>
        </div>
      )}
    </div>
  );
}
