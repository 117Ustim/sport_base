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
import TopBar from './components/TopBar';
import WorkoutModal from './components/WorkoutModal';
import DaySelector from './components/DaySelector';
import WeekSelector from './components/WeekSelector';
import ExercisesList from './components/ExercisesList';
import ExercisesPanel from './components/ExercisesPanel';
import { DAYS_OF_WEEK } from './constants';
import styles from './CreateWorkout.module.scss';

const LETTER_COLUMN_REGEX = /^[A-Za-zА-Яа-яЁёІіЇїЄєҐґ]+$/;

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

      return parsedDraft;
    } catch (error) {
      console.error('Failed to parse edit workout draft:', error);
      return null;
    }
  }, [isEditMode, editDraftStorageKey]);

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
      navigate(`/plan_client/${params.id}/client`);
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
  }, [workout, selectedWeek, selectedDay, addMode, groupDraft, getWeightFromBase, showNotification, t]);

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
      const weightForNewReps = getWeightFromBase(exercise.exercise_id, reps);

      if (weightForNewReps) {
        const { weightFromStar, ...dataWithoutStar } = exercise.exerciseData;
        updated.exerciseData = {
          ...dataWithoutStar,
          weight: weightForNewReps
        };
      } else {
        const { weight, weightFromStar, ...dataWithoutWeight } = exercise.exerciseData;
        updated.exerciseData = dataWithoutWeight;
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

    const normalizeValue = (value) => String(value || '').trim().toUpperCase();
    const targetString = String(targetValue || '').trim();
    const targetNumber = Number(targetValue);
    const isStarNumericTarget = Number.isFinite(targetNumber);
    const isLetterTarget = LETTER_COLUMN_REGEX.test(targetString);

    const selectedColumn = columns.find((col) => {
      const columnName = String(col.name || '').trim();

      if (isStarNumericTarget) {
        const numericTarget = String(targetNumber);
        return columnName === `* ${numericTarget}` || columnName === `*${numericTarget}`;
      }

      if (isLetterTarget) {
        const normalizedColumnName = normalizeValue(columnName);
        const normalizedStarColumnName = normalizeValue(columnName.replace(/^\*\s*/, ''));
        const normalizedTarget = normalizeValue(targetString);
        return normalizedColumnName === normalizedTarget || normalizedStarColumnName === normalizedTarget;
      }

      return false;
    });
    const selectedColumnName = selectedColumn ? selectedColumn.name : String(targetValue || '');

    if (!selectedColumn) {
      showNotification(`Колонка "${selectedColumnName}" не найдена в базе`, "error");
      return;
    }

    const getValueFromStarColumn = (exerciseItem) => {
      const baseExercise = exercises.find(ex => ex.exercise_id === exerciseItem.exercise_id);
      const sourceData = baseExercise?.data || exerciseItem.exerciseData;
      return sourceData?.[selectedColumn.id] ??
        sourceData?.[String(selectedColumn.id)] ??
        sourceData?.[selectedColumn.name];
    };

    if (isLetterTarget) {
      const presetReps = Number(selectedColumn.targetReps);
      if (!Number.isFinite(presetReps) || presetReps <= 0) {
        showNotification(`Для колонки "${selectedColumnName}" не заданы повторения`, "error");
        return;
      }

      const targetGroup = lastAddedGroupId
        ? currentDayExercises.find(
            (exercise) => exercise.type === 'group' && exercise.id === lastAddedGroupId
          )
        : null;

      // 1) Применяем к последней завершённой группе (если есть)
      if (targetGroup && Array.isArray(targetGroup.exercises)) {
        let updatedCount = 0;
        const updatedGroupExercises = targetGroup.exercises.map((groupExercise) => {
          const valueFromColumn = getValueFromStarColumn(groupExercise);
          const updatedExercise = {
            ...groupExercise,
            numberTimes: presetReps
          };

          if (!valueFromColumn || valueFromColumn === '' || valueFromColumn === '—') {
            return updatedExercise;
          }

          updatedCount += 1;
          return {
            ...updatedExercise,
            exerciseData: {
              ...groupExercise.exerciseData,
              weight: valueFromColumn,
              weightFromStar: true
            },
            isFromStarColumn: false
          };
        });

        if (updatedCount === 0) {
          showNotification(`Данные не найдены в колонке "${selectedColumnName}" для упражнений группы`, "error");
          return;
        }

        const updatedExercises = currentDayExercises.map((exercise) => {
          if (exercise.id === targetGroup.id) {
            return {
              ...exercise,
              exercises: updatedGroupExercises
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
        showNotification(`Колонка "${selectedColumnName}": ${updatedCount} упражнений обновлено (${presetReps} повторений)`, "success");
        return;
      }

      // 2) Если группы нет — применяем к последнему одиночному упражнению (режим "Обычная")
      if (!lastAddedExerciseId) {
        showNotification("Сначала добавьте упражнение", "error");
        return;
      }

      const targetExercise = currentDayExercises.find((exercise) => exercise.id === lastAddedExerciseId);

      if (!targetExercise || targetExercise.type === 'group') {
        showNotification("Последнее упражнение не найдено в текущем дне", "error");
        return;
      }

      if (targetExercise.category_id === '6') {
        showNotification("Нельзя применить колонку с повторениями к аэробному упражнению", "error");
        return;
      }

      const valueFromColumn = getValueFromStarColumn(targetExercise);
      if (!valueFromColumn || valueFromColumn === '' || valueFromColumn === '—') {
        showNotification(`Данные не найдены в колонке "${selectedColumnName}" для упражнения "${targetExercise.name}"`, "error");
        return;
      }

      const updatedExercises = currentDayExercises.map((exercise) => {
        if (exercise.id === lastAddedExerciseId) {
          return {
            ...exercise,
            numberTimes: presetReps,
            exerciseData: {
              ...exercise.exerciseData,
              weight: valueFromColumn,
              weightFromStar: true
            },
            isFromStarColumn: false
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
      showNotification(`Колонка "${selectedColumnName}" применена к "${targetExercise.name}" (${presetReps} повторений)`, "success");
      return;
    }

    // Для "* X" подставляем значение для последнего добавленного одиночного упражнения
    if (!lastAddedExerciseId) {
      showNotification("Сначала добавьте упражнение", "error");
      return;
    }

    const targetExercise = currentDayExercises.find(ex => ex.id === lastAddedExerciseId);

    if (!targetExercise) {
      showNotification("Упражнение не найдено в текущем дне", "error");
      return;
    }

    if (targetExercise.category_id === '6') {
      showNotification("Нельзя применить вес к аэробному упражнению", "error");
      return;
    }

    if (targetExercise.numberTimes !== targetNumber) {
      showNotification(`У упражнения "${targetExercise.name}" количество повторений ${targetExercise.numberTimes}, а не ${targetValue}`, "error");
      return;
    }

    const valueFromColumn = getValueFromStarColumn(targetExercise);
    
    if (!valueFromColumn || valueFromColumn === '' || valueFromColumn === '—') {
      showNotification(`Данные не найдены в колонке "${selectedColumnName}" для упражнения "${targetExercise.name}"`, "error");
      return;
    }

    const updatedExercises = currentDayExercises.map(exercise => {
      if (exercise.id === lastAddedExerciseId) {
        return {
          ...exercise,
          exerciseData: {
            ...exercise.exerciseData,
            weight: valueFromColumn,
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
    showNotification(`Вес ${valueFromColumn} кг подставлен для упражнения "${targetExercise.name}" из колонки "${selectedColumnName}"`, "success");
  }, [workout, selectedWeek, selectedDay, columns, lastAddedExerciseId, lastAddedGroupId, exercises, showNotification, t]);

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
