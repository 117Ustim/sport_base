import { useNavigate } from "react-router";
import { useLocation, useParams } from "react-router-dom";
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
import { getWeightFromBase } from '../../utils/weightUtils';
import TopBar from './components/TopBar';
import WorkoutModal from './components/WorkoutModal';
import DaySelector from './components/DaySelector';
import WeekSelector from './components/WeekSelector';
import ExercisesList from './components/ExercisesList';
import ExercisesPanel from './components/ExercisesPanel';
import { DAYS_OF_WEEK } from './constants';
import styles from './CreateWorkout.module.scss';

// Функция для нормализации похожих символов латиницы и кириллицы
const normalizeHomoglyphs = (text) => {
  if (!text) return '';
  const map = {
    'А': 'A', 'В': 'B', 'С': 'C', 'Е': 'E', 'Н': 'H', 'К': 'K', 'М': 'M', 'О': 'O', 'Р': 'P', 'Т': 'T', 'Х': 'X', 'У': 'Y', 'І': 'I', 'Ї': 'I', 'Ј': 'J',
    'а': 'a', 'в': 'b', 'с': 'c', 'е': 'e', 'н': 'h', 'к': 'k', 'м': 'm', 'о': 'o', 'р': 'p', 'т': 't', 'х': 'x', 'у': 'y', 'і': 'i', 'ї': 'i', 'ј': 'j'
  };
  return text.split('').map(char => map[char] || char).join('').toUpperCase();
};

const WEIGHT_SOURCE = {
  LETTER: 'letter',
  STAR: 'star'
};

const withoutColumnWeightMeta = (exerciseData = {}, removeWeight = false) => {
  const nextData = { ...exerciseData };
  delete nextData.weightFromStar;
  delete nextData.weightSource;
  delete nextData.weightSourceColumnId;
  delete nextData.weightSourceColumnName;
  if (removeWeight) {
    delete nextData.weight;
  }
  return nextData;
};

export default function CreateWorkout() {
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
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
  const [lastAddedGroupId, setLastAddedGroupId] = useState(null); // ID последней завершенной группы
  const [selectedTarget, setSelectedTarget] = useState(null); // Выбранное упражнение/группа для быстрых кнопок повторений
  const { notification, showNotification } = useNotification();
  const { executeOptimistic } = useOptimisticUpdate();

  const isEditMode = params.workoutId !== undefined;
  const initialTrainingNameFromRoute = location.state?.initialTrainingName;
  const editDraftStorageKey = isEditMode ? `editWorkoutDraft:${params.id}:${params.workoutId}` : null;

  const createEmptyWorkout = useCallback((name) => ({
    id: Date.now(),
    name,
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
  }), [params.id]);

  const readEditDraft = useCallback(() => {
    if (!isEditMode || !editDraftStorageKey) return null;

    try {
      const rawDraft = sessionStorage.getItem(editDraftStorageKey);
      if (!rawDraft) return null;
      const parsedDraft = JSON.parse(rawDraft);

      if (!parsedDraft || typeof parsedDraft !== 'object' || !parsedDraft.workout) {
        return null;
      }
      return parsedDraft; // Возвращаем весь объект черновика
    } catch (e) {
      console.error('Error reading draft:', e);
      return null;
    }
  }, [isEditMode, editDraftStorageKey]);


  /**
   * Функция для автоматической синхронизации весов всего плана с Базой
   */
  const syncWorkoutWithBase = useCallback((workoutData) => {
    if (!workoutData || !workoutData.weeks || exercises.length === 0) return workoutData;

    console.log('🔄 Синхронизация плана с Базой...');
    let syncCount = 0;

    const updatedWeeks = workoutData.weeks.map(week => {
      const updatedDays = { ...week.days };
      
      Object.keys(updatedDays).forEach(dayKey => {
        const day = updatedDays[dayKey];
        if (!day.exercises || !Array.isArray(day.exercises)) return;

        day.exercises = day.exercises.map(ex => {
          // Обработка групп
          if (ex.type === 'group' && Array.isArray(ex.exercises)) {
            ex.exercises = ex.exercises.map(subEx => {
              const isStarred = subEx.isFromStarColumn || subEx.exerciseData?.weightFromStar || String(subEx.exerciseData?.weight || '').includes('*');
              const isLetter = subEx.exerciseData?.weightSource === WEIGHT_SOURCE.LETTER;
              
              // Для групп или буквенного источника предпочитаем колонку А
              const freshWeight = getWeightFromBase(subEx.exercise_id, subEx.numberTimes, exercises, columns, { 
                isStarred, 
                isGroup: true,
                preferAColumn: isLetter
              });
              
              if (freshWeight && freshWeight !== String(subEx.exerciseData?.weight || '').replace(/\*/g, '').trim()) {
                syncCount++;
                return {
                  ...subEx,
                  exerciseData: { ...subEx.exerciseData, weight: freshWeight, weightSource: 'base_sync' }
                };
              }
              return subEx;
            });
            return ex;
          }

          // Обработка обычных
          const isStarred = ex.isFromStarColumn || ex.exerciseData?.weightFromStar || String(ex.exerciseData?.weight || '').includes('*');
          const isLetter = ex.exerciseData?.weightSource === WEIGHT_SOURCE.LETTER;
          
          const freshWeight = getWeightFromBase(ex.exercise_id, ex.numberTimes, exercises, columns, { 
            isStarred,
            preferAColumn: isLetter
          });
          
          if (freshWeight && freshWeight !== String(ex.exerciseData?.weight || '').replace(/\*/g, '').trim()) {
            syncCount++;
            return {
              ...ex,
              exerciseData: { ...ex.exerciseData, weight: freshWeight, weightSource: 'base_sync' }
            };
          }
          return ex;
        });
      });

      return { ...week, days: updatedDays };
    });

    if (syncCount > 0) {
      console.log(`✅ Синхронизировано упражнений: ${syncCount}`);
    }

    return { ...workoutData, weeks: updatedWeeks };
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
          const existingDraft = readEditDraft();
          if (existingDraft) {
            setWorkout(existingDraft.workout);
            setSelectedWeek(typeof existingDraft.selectedWeek === 'number' ? existingDraft.selectedWeek : 0);
            setSelectedDay(typeof existingDraft.selectedDay === 'string' ? existingDraft.selectedDay : 'monday');
            setAddMode(existingDraft.addMode === 'group' ? 'group' : 'single');
            return;
          }

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
  }, [params.id, params.workoutId, isEditMode, readEditDraft]); // ✅ Убрали showNotification и t из зависимостей

  useEffect(() => {
    if (isEditMode || workout) return;

    const trimmedName = typeof initialTrainingNameFromRoute === 'string'
      ? initialTrainingNameFromRoute.trim()
      : '';

    if (!trimmedName) return;

    setWorkout(createEmptyWorkout(trimmedName));
    setSelectedWeek(0);
    setSelectedDay('monday');
  }, [isEditMode, workout, initialTrainingNameFromRoute, createEmptyWorkout]);

  useEffect(() => {
    if (!isEditMode || !editDraftStorageKey || !workout) return;

    try {
      const draftPayload = {
        workout,
        selectedWeek,
        selectedDay,
        addMode
      };

      sessionStorage.setItem(editDraftStorageKey, JSON.stringify(draftPayload));
    } catch (error) {
      console.error('Failed to save edit workout draft:', error);
    }
  }, [isEditMode, editDraftStorageKey, workout, selectedWeek, selectedDay, addMode]);

  useEffect(() => {
    setSelectedTarget(null);
  }, [selectedWeek, selectedDay]);

  const onButtonBack = () => {
    if (isEditMode) {
      navigate(`/workout_details/${params.id}/${params.workoutId}`);
      return;
    }
    navigate(-1);
  };

  const onGoToClientBase = () => {
    // Переход в client_base данного клиента
    navigate(`/client_base/${params.id}`, {
      state: { returnTo: location.pathname }
    });
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

    const newWorkout = createEmptyWorkout(newTrainingName.trim());

    setWorkout(newWorkout);
    setSelectedWeek(0);
    setSelectedDay('monday');
    onCloseModal();
  };

  const onAddWeek = () => {
    if (!workout) return;
    
    const previousWeek = workout.weeks[workout.weeks.length - 1];
    const firstPlannedDay = DAYS_OF_WEEK.find((day) => {
      const dayExercises = previousWeek?.days?.[day.key]?.exercises || [];
      return dayExercises.length > 0;
    })?.key || 'monday';

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
    setSelectedDay(firstPlannedDay);
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
      const weightByReps = getWeightFromBase(exercise.exercise_id, newExercise.numberTimes, exercises, columns);
      
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
      setLastAddedGroupId(null);
      setSelectedTarget({
        id: newExercise.id,
        type: 'single',
        dayKey: selectedDay,
        isDraft: false
      });
      
      if (isAerobic && addMode === 'group') {
         showNotification(t('createWorkout.aerobicAddedAsSingle'), "info");
      }
    }
  }, [workout, selectedWeek, selectedDay, addMode, groupDraft, exercises, columns, showNotification, t]);

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
    setLastAddedGroupId(newGroup.id);
    setLastAddedExerciseId(null);
    setSelectedTarget({
      id: newGroup.id,
      type: 'group',
      dayKey: selectedDay,
      isDraft: false
    });
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
      // 4. При успехе: в edit-режиме остаёмся на текущей странице
      onSuccess: () => {
        if (isEditMode && editDraftStorageKey) {
          sessionStorage.removeItem(editDraftStorageKey);
        }

        if (!isEditMode) {
          setTimeout(() => {
            navigate(-1);
          }, 1500);
        }
      },
      // 5. При ошибке показываем уведомление
      onError: (error) => {
        showNotification(t('createWorkout.saveError', { error: error.message }), "error");
      }
    });
  };

  const getWeightForReps = (exerciseData, reps, exerciseId) => {
    // 🔥 ПРИОРИТЕТ 1: Берём актуальный вес из client_base (всегда самый свежий!)
    if (exerciseId) {
      const isLetter = exerciseData?.weightSource === WEIGHT_SOURCE.LETTER;
      const isStarred = exerciseData?.weightSource === WEIGHT_SOURCE.STAR || exerciseData?.weightFromStar === true;
      
      const weightFromBase = getWeightFromBase(exerciseId, reps, exercises, columns, { 
        isStarred, 
        preferAColumn: isLetter 
      });
      if (weightFromBase) {
        return weightFromBase;
      }
    }

    // 🔥 ПРИОРИТЕТ 2: Если актуального веса нет, используем сохранённое значение из быстрой колонки
    if (
      exerciseData &&
      exerciseData.weight &&
      (exerciseData.weightSource === WEIGHT_SOURCE.STAR ||
        exerciseData.weightSource === WEIGHT_SOURCE.LETTER ||
        exerciseData.weightFromStar === true)
    ) {
      return exerciseData.weight;
    }
    
    // 🔥 ПРИОРИТЕТ 3: Если есть сохранённый обычный вес, используем его
    if (exerciseData && exerciseData.weight) {
      return exerciseData.weight;
    }
    
    // 🔥 ПРИОРИТЕТ 4 (fallback): Берём вес из exerciseData по индексу (старая логика)
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
    setLastAddedGroupId(null);
    setSelectedTarget({
      id: exerciseId,
      type: 'single',
      dayKey,
      isDraft: dayKey === 'draft'
    });
    
    const draftExercise = groupDraft.find(ex => ex.id === exerciseId);
    
    if (draftExercise) {
      // Обновляем упражнение в черновике группы
      const updatedDraft = groupDraft.map(ex => {
        if (ex.id === exerciseId) {
          const updated = { ...ex, [field]: Number(value) };
          
          // 🔥 Если изменили количество повторений → автоматически обновляем вес
          if (field === 'numberTimes' && ex.exerciseData) {
            const newReps = Number(value);
            const weightForNewReps = getWeightFromBase(ex.exercise_id, newReps, exercises, columns);
            
            // Сбрасываем флаг isFromStarColumn при изменении повторений
            delete updated.isFromStarColumn;
            
            if (weightForNewReps) {
              updated.exerciseData = {
                ...withoutColumnWeightMeta(ex.exerciseData),
                weight: weightForNewReps
              };
              console.log(`✅ Вес обновлен для "${ex.name}": ${weightForNewReps} кг (${newReps} повторений)`);
            } else {
              // Убираем вес если его нет для нового количества повторений
              updated.exerciseData = withoutColumnWeightMeta(ex.exerciseData, true);
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
                  const weightForNewReps = getWeightFromBase(ex.exercise_id, newReps, exercises, columns);
                  
                  // Сбрасываем флаг isFromStarColumn при изменении повторений
                  delete updated.isFromStarColumn;
                  
                  if (weightForNewReps) {
                    updated.exerciseData = {
                      ...withoutColumnWeightMeta(ex.exerciseData),
                      weight: weightForNewReps
                    };
                    console.log(`✅ Вес обновлен для "${ex.name}": ${weightForNewReps} кг (${newReps} повторений)`);
                  } else {
                    // Убираем вес если его нет для нового количества повторений
                    updated.exerciseData = withoutColumnWeightMeta(ex.exerciseData, true);
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
  }, [workout, selectedWeek, groupDraft, getWeightFromBase]);

  const handleRemoveExercise = useCallback((exerciseId, dayKey) => {
    const draftExercise = groupDraft.find(ex => ex.id === exerciseId);
    
    if (draftExercise) {
      setGroupDraft(groupDraft.filter(ex => ex.id !== exerciseId));
      if (selectedTarget?.id === exerciseId && selectedTarget?.isDraft) {
        setSelectedTarget(null);
      }
      if (lastAddedExerciseId === exerciseId) {
        setLastAddedExerciseId(null);
      }
    } else {
      const dayExercises = workout.weeks[selectedWeek].days[dayKey].exercises;
      const removedExercise = dayExercises.find(ex => ex.id === exerciseId);
      const removedGroupContainsSelected = removedExercise?.type === 'group'
        && Array.isArray(removedExercise.exercises)
        && selectedTarget?.type === 'single'
        && removedExercise.exercises.some(ex => ex.id === selectedTarget.id);
      const removedGroupContainsLastAdded = removedExercise?.type === 'group'
        && Array.isArray(removedExercise.exercises)
        && lastAddedExerciseId
        && removedExercise.exercises.some(ex => ex.id === lastAddedExerciseId);

      const updatedWeeks = [...workout.weeks];
      updatedWeeks[selectedWeek] = {
        ...updatedWeeks[selectedWeek],
        days: {
          ...updatedWeeks[selectedWeek].days,
          [dayKey]: {
            exercises: dayExercises.filter(ex => ex.id !== exerciseId)
          }
        }
      };
      setWorkout({ ...workout, weeks: updatedWeeks });

      if (selectedTarget?.id === exerciseId || removedGroupContainsSelected) {
        setSelectedTarget(null);
      }
      if (lastAddedExerciseId === exerciseId || removedGroupContainsLastAdded) {
        setLastAddedExerciseId(null);
      }
      if (lastAddedGroupId === exerciseId) {
        setLastAddedGroupId(null);
      }
    }
  }, [workout, selectedWeek, groupDraft, selectedTarget, lastAddedExerciseId, lastAddedGroupId]);

  const handleSelectTarget = useCallback(({ id, type, dayKey, isDraft = false }) => {
    setSelectedTarget({ id, type, dayKey, isDraft });

    if (type === 'group') {
      setLastAddedGroupId(id);
      setLastAddedExerciseId(null);
      return;
    }

    setLastAddedExerciseId(id);
    setLastAddedGroupId(null);
  }, []);

  const applyRepsToExercise = useCallback((exercise, reps) => {
    const isAerobic = exercise.category_id === '6';
    if (isAerobic) {
      return { updatedExercise: exercise, changed: false };
    }

    const updated = { ...exercise, numberTimes: reps };

    if (exercise.exerciseData) {
      const weightForNewReps = getWeightFromBase(exercise.exercise_id, reps, exercises, columns);

      if (weightForNewReps) {
        updated.exerciseData = {
          ...withoutColumnWeightMeta(exercise.exerciseData),
          weight: weightForNewReps
        };
      } else {
        updated.exerciseData = withoutColumnWeightMeta(exercise.exerciseData, true);
      }
    }

    return { updatedExercise: updated, changed: true };
  }, [getWeightFromBase]);

  const handleBulkChangeReps = useCallback((reps) => {
    if (!workout) {
      showNotification(t('createWorkout.createTrainingFirst'), "error");
      return;
    }

    const fallbackTarget = lastAddedGroupId
      ? { id: lastAddedGroupId, type: 'group', dayKey: selectedDay, isDraft: false }
      : lastAddedExerciseId
        ? { id: lastAddedExerciseId, type: 'single', dayKey: selectedDay, isDraft: false }
        : null;
    const activeTarget = selectedTarget || fallbackTarget;

    if (!activeTarget) {
      showNotification("Сначала выберите упражнение или группу", "error");
      return;
    }

    if (activeTarget.isDraft || activeTarget.dayKey === 'draft') {
      if (activeTarget.type === 'group') {
        showNotification("Для черновика группы выберите конкретное упражнение", "error");
        return;
      }

      const draftExercise = groupDraft.find(ex => ex.id === activeTarget.id);
      if (!draftExercise) {
        showNotification("Выбранное упражнение не найдено", "error");
        return;
      }

      const { updatedExercise, changed } = applyRepsToExercise(draftExercise, reps);
      if (!changed) {
        showNotification("Нельзя изменить повторения у аэробного упражнения", "error");
        return;
      }

      setGroupDraft(groupDraft.map(ex => ex.id === activeTarget.id ? updatedExercise : ex));
      showNotification(`Количество повторений изменено на ${reps} для "${draftExercise.name}"`, "success");
      return;
    }

    const targetDayKey = activeTarget.dayKey || selectedDay;
    const dayExercises = workout.weeks[selectedWeek]?.days?.[targetDayKey]?.exercises || [];

    if (dayExercises.length === 0) {
      showNotification(t('createWorkout.noExercisesInDay'), "error");
      return;
    }

    if (activeTarget.type === 'group') {
      const targetGroup = dayExercises.find(ex => ex.type === 'group' && ex.id === activeTarget.id);
      if (!targetGroup) {
        showNotification("Выбранная группа не найдена", "error");
        return;
      }

      let updatedCount = 0;
      const updatedGroupExercises = targetGroup.exercises.map((groupExercise) => {
        const { updatedExercise, changed } = applyRepsToExercise(groupExercise, reps);
        if (changed) {
          updatedCount += 1;
        }
        return updatedExercise;
      });

      if (updatedCount === 0) {
        showNotification("В выбранной группе нет упражнений с повторениями", "error");
        return;
      }

      const updatedExercises = dayExercises.map((exercise) => (
        exercise.id === activeTarget.id
          ? { ...exercise, exercises: updatedGroupExercises }
          : exercise
      ));

      const updatedWeeks = [...workout.weeks];
      updatedWeeks[selectedWeek] = {
        ...updatedWeeks[selectedWeek],
        days: {
          ...updatedWeeks[selectedWeek].days,
          [targetDayKey]: {
            exercises: updatedExercises
          }
        }
      };

      setWorkout({ ...workout, weeks: updatedWeeks });
      showNotification(`Количество повторений изменено на ${reps} для группы (${updatedCount} упр.)`, "success");
      return;
    }

    let targetName = '';
    let foundTarget = false;
    let changedTarget = false;

    const updatedExercises = dayExercises.map((exercise) => {
      if (exercise.type === 'group' && Array.isArray(exercise.exercises)) {
        let foundInGroup = false;

        const updatedGroupExercises = exercise.exercises.map((groupExercise) => {
          if (groupExercise.id !== activeTarget.id) {
            return groupExercise;
          }

          foundTarget = true;
          foundInGroup = true;
          targetName = groupExercise.name;
          const { updatedExercise, changed } = applyRepsToExercise(groupExercise, reps);
          if (changed) {
            changedTarget = true;
          }
          return updatedExercise;
        });

        return foundInGroup
          ? { ...exercise, exercises: updatedGroupExercises }
          : exercise;
      }

      if (exercise.id === activeTarget.id) {
        foundTarget = true;
        targetName = exercise.name;
        const { updatedExercise, changed } = applyRepsToExercise(exercise, reps);
        if (changed) {
          changedTarget = true;
        }
        return updatedExercise;
      }

      return exercise;
    });

    if (!foundTarget) {
      showNotification("Выбранное упражнение не найдено", "error");
      return;
    }

    if (!changedTarget) {
      showNotification("Нельзя изменить повторения у аэробного упражнения", "error");
      return;
    }

    const updatedWeeks = [...workout.weeks];
    updatedWeeks[selectedWeek] = {
      ...updatedWeeks[selectedWeek],
      days: {
        ...updatedWeeks[selectedWeek].days,
        [targetDayKey]: {
          exercises: updatedExercises
        }
      }
    };

    setWorkout({ ...workout, weeks: updatedWeeks });
    showNotification(`Количество повторений изменено на ${reps} для "${targetName}"`, "success");
  }, [
    workout,
    selectedWeek,
    selectedDay,
    selectedTarget,
    lastAddedExerciseId,
    lastAddedGroupId,
    groupDraft,
    applyRepsToExercise,
    showNotification,
    t
  ]);

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

  // Функция для подстановки данных из колонок "* X" и буквенных колонок (A, Б и т.д.)
  const handleStarWeightClick = useCallback((targetValue) => {
    if (!workout || !columns || columns.length === 0) {
      return;
    }

    const currentDayExercises = workout.weeks[selectedWeek].days[selectedDay].exercises || [];
    
    if (currentDayExercises.length === 0) {
      showNotification(t('createWorkout.noExercisesInDay'), "error");
      return;
    }

    const targetString = String(targetValue || '').trim();
    const normalizeValue = (val) => normalizeHomoglyphs(String(val || '').trim());
    const targetNormalized = normalizeValue(targetString);

    // Ищем подходящую колонку
    const selectedColumn = columns.find((col) => {
      const colName = String(col.name || '').trim();
      const colNormalized = normalizeValue(colName);

      // Если нажата кнопка со звездочкой (например "*8")
      if (targetString.startsWith('*')) {
        const numPart = targetString.replace('*', '').trim();
        // Соответствует "*8" или "* 8"
        return colNormalized === targetNormalized || colNormalized === normalizeValue(`* ${numPart}`);
      }

      // Если нажата обычная кнопка (например "A" или "8")
      return colNormalized === targetNormalized;
    });
    const selectedColumnName = selectedColumn ? selectedColumn.name : String(targetValue || '');

    if (!selectedColumn) {
      showNotification(`Колонка "${selectedColumnName}" не найдена в базе`, "error");
      return;
    }

    const getValueFromStarColumn = (exerciseItem) => {
      const baseExercise = exercises.find(ex => ex.exercise_id === exerciseItem.exercise_id);
      const sourceData = baseExercise?.data || exerciseItem.exerciseData;
      if (!sourceData) return null;

      // 1. Прямой поиск по ID
      if (sourceData[selectedColumn.id] !== undefined) return sourceData[selectedColumn.id];
      if (sourceData[String(selectedColumn.id)] !== undefined) return sourceData[String(selectedColumn.id)];

      // 2. Поиск по имени колонки (с нормализацией)
      const targetColName = normalizeValue(selectedColumn.name);
      const foundKey = Object.keys(sourceData).find(key => normalizeValue(key) === targetColName);
      if (foundKey) return sourceData[foundKey];

      // 3. Поиск по имени колонки без "*" (если колонка в базе со звездой, а мы ищем "A")
      const targetColNameClean = normalizeValue(selectedColumn.name.replace(/^\*\s*/, ''));
      const foundKeyClean = Object.keys(sourceData).find(key => {
        const cleanKey = normalizeValue(key.replace(/^\*\s*/, ''));
        return cleanKey === targetColNameClean;
      });
      if (foundKeyClean) return sourceData[foundKeyClean];

      return null;
    };

    // Для "* X" подставляем значение для выбранного или последнего добавленного упражнения
    const fallbackTarget = lastAddedGroupId
      ? { id: lastAddedGroupId, type: 'group', dayKey: selectedDay, isDraft: false }
      : lastAddedExerciseId
        ? { id: lastAddedExerciseId, type: 'single', dayKey: selectedDay, isDraft: false }
        : null;
    const activeTarget = selectedTarget || fallbackTarget;

    if (!activeTarget) {
      showNotification("Сначала выберите упражнение или группу", "error");
      return;
    }

    // 1) Обработка ОБЫЧНЫХ колонок (A, Б и т.д.)
    if (!targetString.startsWith('*')) {
      const presetReps = Number(selectedColumn.targetReps);
      if (!Number.isFinite(presetReps) || presetReps <= 0) {
        showNotification(`Для колонки "${selectedColumnName}" не заданы повторения`, "error");
        return;
      }

      // Применяем к ГРУППЕ
      if (activeTarget.type === 'group') {
        const targetGroup = currentDayExercises.find(ex => ex.type === 'group' && ex.id === activeTarget.id);
        if (targetGroup && Array.isArray(targetGroup.exercises)) {
          let updatedCount = 0;
          const updatedGroupExercises = targetGroup.exercises.map((groupExercise) => {
            const valueFromColumn = getValueFromStarColumn(groupExercise);
            const updatedExercise = { ...groupExercise, numberTimes: presetReps };

            if (!valueFromColumn || valueFromColumn === '' || valueFromColumn === '—') {
              return updatedExercise;
            }

            updatedCount += 1;
            return {
              ...updatedExercise,
              exerciseData: {
                ...groupExercise.exerciseData,
                weight: valueFromColumn,
                weightFromStar: false,
                weightSource: WEIGHT_SOURCE.LETTER,
                weightSourceColumnId: selectedColumn.id,
                weightSourceColumnName: selectedColumnName
              },
              isFromStarColumn: false
            };
          });

          const updatedExercises = currentDayExercises.map((exercise) => {
            if (exercise.id === targetGroup.id) {
              return { ...exercise, exercises: updatedGroupExercises };
            }
            return exercise;
          });

          const updatedWeeks = [...workout.weeks];
          updatedWeeks[selectedWeek] = {
            ...updatedWeeks[selectedWeek],
            days: { ...updatedWeeks[selectedWeek].days, [selectedDay]: { exercises: updatedExercises } }
          };

          setWorkout({ ...workout, weeks: updatedWeeks });
          showNotification(`Колонка "${selectedColumnName}": ${updatedCount} упр. обновлено (${presetReps} повт.)`, "success");
          return;
        }
      }

      // Применяем к ОДИНОЧНОМУ упражнению
      const targetExercise = currentDayExercises.find(ex => ex.id === activeTarget.id);
      if (!targetExercise || targetExercise.type === 'group') {
        showNotification("Упражнение не найдено", "error");
        return;
      }

      if (targetExercise.category_id === '6') {
        showNotification("Нельзя применить колонку с повторениями к аэробному упражнению", "error");
        return;
      }

      const valueFromColumn = getValueFromStarColumn(targetExercise);
      if (!valueFromColumn || valueFromColumn === '' || valueFromColumn === '—') {
        showNotification(`Данные не найдены в "${selectedColumnName}" для "${targetExercise.name}"`, "error");
        return;
      }

      const updatedExercises = currentDayExercises.map((exercise) => {
        if (exercise.id === activeTarget.id) {
          return {
            ...exercise,
            numberTimes: presetReps,
            exerciseData: {
              ...exercise.exerciseData,
              weight: valueFromColumn,
              weightFromStar: false,
              weightSource: WEIGHT_SOURCE.LETTER,
              weightSourceColumnId: selectedColumn.id,
              weightSourceColumnName: selectedColumnName
            },
            isFromStarColumn: false
          };
        }
        return exercise;
      });

      const updatedWeeks = [...workout.weeks];
      updatedWeeks[selectedWeek] = {
        ...updatedWeeks[selectedWeek],
        days: { ...updatedWeeks[selectedWeek].days, [selectedDay]: { exercises: updatedExercises } }
      };

      setWorkout({ ...workout, weeks: updatedWeeks });
      showNotification(`Колонка "${selectedColumnName}" применена к "${targetExercise.name}" (${presetReps} повт.)`, "success");
      return;
    }

    // 2) Обработка ЗВЕЗДНЫХ колонок (*8, *12)
    const targetReps = Number(targetString.replace('*', '').trim());
    if (!Number.isFinite(targetReps)) {
      showNotification(`Некорректный формат колонки: ${targetString}`, "error");
      return;
    }

    // 🎯 Применяем к ГРУППЕ
    if (activeTarget.type === 'group') {
      const targetGroup = currentDayExercises.find(ex => ex.type === 'group' && ex.id === activeTarget.id);
      if (targetGroup && Array.isArray(targetGroup.exercises)) {
        let updatedCount = 0;
        const updatedGroupExercises = targetGroup.exercises.map((groupExercise) => {
          const valueFromColumn = getValueFromStarColumn(groupExercise);
          const updatedExercise = { ...groupExercise, numberTimes: targetReps };
          if (!valueFromColumn || valueFromColumn === '' || valueFromColumn === '—') return updatedExercise;
          updatedCount++;
          return {
            ...updatedExercise,
            exerciseData: {
              ...groupExercise.exerciseData,
              weight: valueFromColumn,
              weightFromStar: true,
              weightSource: WEIGHT_SOURCE.STAR,
              weightSourceColumnId: selectedColumn.id,
              weightSourceColumnName: selectedColumnName
            },
            isFromStarColumn: true
          };
        });
        const updatedExercises = currentDayExercises.map((exercise) => 
          exercise.id === activeTarget.id ? { ...exercise, exercises: updatedGroupExercises } : exercise
        );
        const updatedWeeks = [...workout.weeks];
        updatedWeeks[selectedWeek] = {
          ...updatedWeeks[selectedWeek],
          days: { ...updatedWeeks[selectedWeek].days, [selectedDay]: { exercises: updatedExercises } }
        };
        setWorkout({ ...workout, weeks: updatedWeeks });
        showNotification(`Колонка "${selectedColumnName}": ${updatedCount} упр. обновлено (${targetReps} повт.)`, "success");
        return;
      }
    }

    const targetExercise = currentDayExercises.find(ex => ex.id === activeTarget.id);

    if (!targetExercise) {
      showNotification("Упражнение не найдено в текущем дне", "error");
      return;
    }

    if (targetExercise.category_id === '6') {
      showNotification("Нельзя применить вес к аэробному упражнению", "error");
      return;
    }

    const valueFromColumn = getValueFromStarColumn(targetExercise);
    
    if (!valueFromColumn || valueFromColumn === '' || valueFromColumn === '—') {
      showNotification(`Данные не найдены в колонке "${selectedColumnName}" для упражнения "${targetExercise.name}"`, "error");
      return;
    }

    const updatedExercises = currentDayExercises.map(exercise => {
      if (exercise.id === activeTarget.id) {
        return {
          ...exercise,
          numberTimes: targetReps, // 🔥 ОБНОВЛЯЕМ ПОВТОРЕНИЯ АВТОМАТИЧЕСКИ
          exerciseData: {
            ...exercise.exerciseData,
            weight: valueFromColumn,
            weightFromStar: true,
            weightSource: WEIGHT_SOURCE.STAR,
            weightSourceColumnId: selectedColumn.id,
            weightSourceColumnName: selectedColumnName
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
    showNotification(`Колонка "${selectedColumnName}" применена к "${targetExercise.name}" (${targetReps} повт.)`, "success");
  }, [workout, selectedWeek, selectedDay, columns, lastAddedExerciseId, lastAddedGroupId, selectedTarget, exercises, showNotification, t]);

  const handleSwapDays = useCallback((fromDayKey, toDayKey) => {
    if (!workout || !workout.weeks[selectedWeek]) return;
    if (fromDayKey === toDayKey) return;

    const updatedWeeks = [...workout.weeks];
    const currentDays = updatedWeeks[selectedWeek].days;

    // Свап данных между днями
    const newDays = {
      ...currentDays,
      [fromDayKey]: currentDays[toDayKey] || { exercises: [] },
      [toDayKey]: currentDays[fromDayKey] || { exercises: [] }
    };

    updatedWeeks[selectedWeek] = {
      ...updatedWeeks[selectedWeek],
      days: newDays
    };

    setWorkout({ ...workout, weeks: updatedWeeks });
    showNotification(`Расписание обменено: ${t(`days.${fromDayKey}`)} ⇄ ${t(`days.${toDayKey}`)}`, "success");
  }, [workout, selectedWeek, showNotification, t]);

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
          
          <div className={styles.sidebar}>
            <DaySelector
              selectedDay={selectedDay}
              workout={workout}
              selectedWeek={selectedWeek}
              onSelectDay={setSelectedDay}
              onSwapDays={handleSwapDays}
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
            selectedTarget={selectedTarget}
            onDragEnd={handleDragEnd}
            onUpdateExercise={handleUpdateExercise}
            onRemoveExercise={handleRemoveExercise}
            onSelectTarget={handleSelectTarget}
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
