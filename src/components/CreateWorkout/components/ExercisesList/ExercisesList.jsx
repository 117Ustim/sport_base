import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableExerciseItem from '../SortableExerciseItem';
import { DAYS_OF_WEEK } from '../../constants';
import styles from './ExercisesList.module.scss';

export default function ExercisesList({ 
  workout, 
  selectedWeek, 
  selectedDay,
  groupDraft,
  addMode,
  onDragEnd, 
  onUpdateExercise, 
  onRemoveExercise,
  onConfirmGroup,
  getWeightForReps 
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const hasAnyExercises = Object.values(workout.weeks[selectedWeek]?.days || {})
    .some(day => day.exercises && day.exercises.length > 0);

  return (
    <div className={styles.selectedDayExercises}>
      <h3 className={styles.sectionTitle}>
        Неделя {workout.weeks[selectedWeek]?.weekNumber || selectedWeek + 1} - Все тренировки
      </h3>
      <p className={styles.infoMessageSmall}>
        Выбран день: <strong>{DAYS_OF_WEEK.find(d => d.key === selectedDay)?.label}</strong> (новые упражнения добавятся сюда)
      </p>
      
      {/* Черновик группы */}
      {addMode === 'group' && groupDraft.length > 0 && (
        <div className={styles.groupDraftSection}>
          <div className={styles.groupDraftHeader}>
            <h4 className={styles.groupDraftTitle}>Создается группа ({groupDraft.length} упр.)</h4>
            <button
              className={styles.confirmGroupButton}
              onClick={onConfirmGroup}
              title="Завершить группу"
            >
              ✓
            </button>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => onDragEnd(event, 'draft')}
          >
            <SortableContext
              items={groupDraft.map(ex => ex.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className={styles.exercisesList}>
                {groupDraft.map((exercise, index) => (
                  <SortableExerciseItem
                    key={exercise.id}
                    exercise={exercise}
                    index={index}
                    dayKey={selectedDay}
                    onUpdate={onUpdateExercise}
                    onRemove={onRemoveExercise}
                    onConfirm={null}
                    getWeightForReps={getWeightForReps}
                    isInDraft={true}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      )}
      
      {DAYS_OF_WEEK.map((day) => {
        const dayExercises = workout.weeks[selectedWeek]?.days[day.key]?.exercises || [];
        
        if (dayExercises.length === 0) return null;
        
        return (
          <div key={day.key} className={styles.dayExercisesSection}>
            <h4 className={styles.daySectionTitle}>{day.label}</h4>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => onDragEnd(event, day.key)}
            >
              <SortableContext
                items={dayExercises.map(ex => ex.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className={styles.exercisesList}>
                  {dayExercises.map((exercise, index) => (
                    <SortableExerciseItem
                      key={exercise.id}
                      exercise={exercise}
                      index={index}
                      dayKey={day.key}
                      onUpdate={onUpdateExercise}
                      onRemove={onRemoveExercise}
                      getWeightForReps={getWeightForReps}
                      isInDraft={false}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </div>
        );
      })}
      
      {!hasAnyExercises && groupDraft.length === 0 && (
        <p className={styles.infoMessage}>Нет упражнений. Кликните на упражнение справа для добавления</p>
      )}
    </div>
  );
}
