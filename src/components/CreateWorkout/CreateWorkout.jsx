import { useNavigate } from "react-router";
import { useParams } from "react-router-dom";
import { clientBaseService, categoriesService, workoutsService } from "../../firebase/services";
import { useState, useEffect } from "react";
import { arrayMove } from '@dnd-kit/sortable';
import { useNotification } from '../../hooks/useNotification';
import Notification from '../Notification';
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

  const [exercises, setExercises] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTrainingName, setNewTrainingName] = useState("");
  const [workout, setWorkout] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [selectedDay, setSelectedDay] = useState('monday');
  const [addMode, setAddMode] = useState('single'); // 'single' или 'group'
  const [groupDraft, setGroupDraft] = useState([]); // Черновик группы
  const { notification, showNotification } = useNotification();

  const isEditMode = params.workoutId !== undefined;

  useEffect(() => {
    clientBaseService.getByClientId(params.id).then((data) => {
      setExercises(data);
    });
    categoriesService.getAll().then((data) => {
      setCategories(data);
    });

    if (isEditMode) {
      workoutsService.getById(params.workoutId).then((data) => {
        if (data) {
          if (data.days && !data.weeks) {
            data.weeks = [{
              weekNumber: 1,
              days: data.days
            }];
            delete data.days;
          }
          
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
      }).catch((error) => {
        showNotification('Ошибка загрузки тренировки', 'error');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, params.workoutId]);

  const onButtonBack = () => {
    navigate(-1);
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
      showNotification("Введите название тренировки", "error");
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

  const onSelectExercise = (exercise) => {
    if (!workout) {
      showNotification("Сначала создайте тренировку", "error");
      return;
    }

    const currentDayExercises = workout.weeks[selectedWeek].days[selectedDay].exercises || [];
    
    // Проверка на дубликат упражнения
    const isDuplicate = currentDayExercises.some(ex => 
      ex.exercise_id === exercise.exercise_id || 
      (ex.type === 'group' && ex.exercises.some(e => e.exercise_id === exercise.exercise_id))
    );
    
    const isDuplicateInDraft = groupDraft.some(ex => ex.exercise_id === exercise.exercise_id);
    
    if (isDuplicate || isDuplicateInDraft) {
      showNotification(`Упражнение "${exercise.name}" уже добавлено`, "error");
      return;
    }

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
    }

    if (addMode === 'group') {
      // Добавляем в черновик группы
      setGroupDraft([...groupDraft, newExercise]);
    } else {
      // Обычное добавление
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
    }
  };

  const onConfirmGroup = () => {
    if (groupDraft.length < 2) {
      showNotification("Добавьте минимум 2 упражнения в группу", "error");
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
    showNotification("Группа упражнений создана!", "success");
  };

  const onCancelGroup = () => {
    setGroupDraft([]);
    setAddMode('single');
  };

  const onSaveWorkout = async () => {
    if (!workout) {
      showNotification("Создайте тренировку", "error");
      return;
    }

    const hasExercises = workout.weeks.some(week => 
      Object.values(week.days).some(day => day.exercises.length > 0)
    );
    
    if (!hasExercises) {
      showNotification("Добавьте хотя бы одно упражнение", "error");
      return;
    }

    try {
      const workoutToSave = {
        ...workout,
        clientId: params.id
      };
      
      if (isEditMode) {
        await workoutsService.update(params.workoutId, workoutToSave);
        showNotification("Тренировка обновлена!", "success");
      } else {
        await workoutsService.create(workoutToSave);
        showNotification("Тренировка сохранена!", "success");
      }
      
      setTimeout(() => {
        navigate(-1);
      }, 1500);
    } catch (error) {
      showNotification("Ошибка при сохранении: " + error.message, "error");
    }
  };

  const getWeightForReps = (exerciseData, reps) => {
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

    // Если перетаскивание в черновике
    if (dayKey === 'draft') {
      const oldIndex = groupDraft.findIndex(ex => ex.id === active.id);
      const newIndex = groupDraft.findIndex(ex => ex.id === over.id);
      
      const reorderedDraft = arrayMove(groupDraft, oldIndex, newIndex);
      setGroupDraft(reorderedDraft);
      return;
    }

    // Обычное перетаскивание в дне
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

  const handleUpdateExercise = (exerciseId, dayKey, field, value) => {
    // Проверяем, это упражнение в черновике или уже добавленное
    const draftExercise = groupDraft.find(ex => ex.id === exerciseId);
    
    if (draftExercise) {
      // Обновляем в черновике
      setGroupDraft(groupDraft.map(ex =>
        ex.id === exerciseId ? { ...ex, [field]: Number(value) } : ex
      ));
    } else {
      // Обновляем в тренировке
      const updatedWeeks = [...workout.weeks];
      updatedWeeks[selectedWeek] = {
        ...updatedWeeks[selectedWeek],
        days: {
          ...updatedWeeks[selectedWeek].days,
          [dayKey]: {
            exercises: updatedWeeks[selectedWeek].days[dayKey].exercises.map(ex =>
              ex.id === exerciseId ? { ...ex, [field]: Number(value) } : ex
            )
          }
        }
      };
      setWorkout({ ...workout, weeks: updatedWeeks });
    }
  };

  const handleRemoveExercise = (exerciseId, dayKey) => {
    // Проверяем, это упражнение в черновике или уже добавленное
    const draftExercise = groupDraft.find(ex => ex.id === exerciseId);
    
    if (draftExercise) {
      // Удаляем из черновика
      setGroupDraft(groupDraft.filter(ex => ex.id !== exerciseId));
    } else {
      // Удаляем из тренировки
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
  };

  return (
    <div className={styles.workoutCreator}>
      <Notification notification={notification} />

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
            />
          </div>

          <ExercisesList
            workout={workout}
            selectedWeek={selectedWeek}
            selectedDay={selectedDay}
            groupDraft={groupDraft}
            addMode={addMode}
            onDragEnd={handleDragEnd}
            onUpdateExercise={handleUpdateExercise}
            onRemoveExercise={handleRemoveExercise}
            onConfirmGroup={onConfirmGroup}
            getWeightForReps={getWeightForReps}
          />

          <ExercisesPanel
            categories={categories}
            exercises={exercises}
            onSelectExercise={onSelectExercise}
            addMode={addMode}
            onAddModeChange={(mode) => {
              if (mode === 'single' && groupDraft.length > 0) {
                if (window.confirm('Отменить создание группы?')) {
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
          <p>Нажмите "Новая тренировка" для создания недельного плана</p>
        </div>
      )}
    </div>
  );
}
