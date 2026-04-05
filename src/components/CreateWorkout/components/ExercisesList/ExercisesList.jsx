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
import { useTranslation } from 'react-i18next';
import SortableExerciseItem from '../SortableExerciseItem';
import { DAYS_OF_WEEK } from '../../constants';
import styles from './ExercisesList.module.scss';

const LETTER_COLUMN_REGEX = /^[A-Za-zА-Яа-яЁёІіЇїЄєҐґ]+$/;

export default function ExercisesList({ 
  workout, 
  selectedWeek, 
  selectedDay,
  groupDraft,
  addMode,
  columns,
  onDragEnd, 
  onUpdateExercise, 
  onRemoveExercise,
  onConfirmGroup,
  getWeightForReps,
  onBulkChangeReps,
  onColumnWeightClick,
  onStarWeightClick
}) {
  const { t } = useTranslation();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const hasAnyExercises = Object.values(workout.weeks[selectedWeek]?.days || {})
    .some(day => day.exercises && day.exercises.length > 0);
  const selectedDayExercises = workout.weeks[selectedWeek]?.days[selectedDay]?.exercises || [];
  const hasSelectedDayExercises = selectedDayExercises.length > 0;
  const starColumns = columns && columns.length > 0
    ? columns.filter(col => String(col.name || '').trim().startsWith('* '))
    : [];
  const starRepsColumns = starColumns
    .filter(col => /^\*\s*\d+$/.test(String(col.name || '').trim()))
    .sort((a, b) => {
      const aValue = parseInt(String(a.name).trim().replace(/^\*\s*/, ''), 10);
      const bValue = parseInt(String(b.name).trim().replace(/^\*\s*/, ''), 10);
      return aValue - bValue;
    });
  const letterColumns = columns && columns.length > 0
    ? columns
      .filter((col) => LETTER_COLUMN_REGEX.test(String(col.name || '').trim()))
      .filter((col) => Number.isFinite(Number(col.targetReps)) && Number(col.targetReps) > 0)
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    : [];

  return (
    <div className={styles.selectedDayExercises}>
      <h3 className={styles.sectionTitle}>
        {t('createWorkout.week')} {workout.weeks[selectedWeek]?.weekNumber || selectedWeek + 1} - {t('createWorkout.allTrainings')}
      </h3>
      <div className={styles.infoMessageSmall}>
        <span>
          {t('createWorkout.selectedDay')}: <strong>{t(`days.${selectedDay}`)}</strong> ({t('createWorkout.newExercisesHere')})
        </span>
        <div className={styles.bulkRepsButtons}>
          <span className={styles.bulkRepsLabel}>{t('createWorkout.times')}:</span>
          <button 
            className={styles.bulkRepsButton} 
            onClick={() => onBulkChangeReps(8)}
            title={t('createWorkout.setRepsTitle', { reps: 8 })}
          >
            8
          </button>
          <button 
            className={styles.bulkRepsButton} 
            onClick={() => onBulkChangeReps(12)}
            title={t('createWorkout.setRepsTitle', { reps: 12 })}
          >
            12
          </button>
          {/* Кнопки "*" для колонок "* X" */}
          {starRepsColumns.map((col) => {
            const reps = parseInt(String(col.name).trim().replace(/^\*\s*/, ''), 10);
            return (
              <button 
                key={col.id}
                className={styles.starRepsButton} 
                onClick={() => onStarWeightClick(reps)}
                title={`Подставить вес из колонки "${col.name}" для последнего добавленного упражнения`}
              >
                * {reps}
              </button>
            );
          })}

          {/* Кнопки для буквенных колонок (A, Б и т.д.) */}
          {letterColumns.map((col) => (
            <button
              key={`letter-${col.id}`}
              className={`${styles.starRepsButton} ${styles.aerobicRepsButton}`}
              onClick={() => onStarWeightClick(col.name)}
              title={`Подставить данные из колонки "${col.name}" для последней завершенной группы или последнего добавленного упражнения (${col.targetReps} повторений)`}
            >
              {col.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Черновик группы */}
      {addMode === 'group' && groupDraft.length > 0 && (
        <div className={styles.groupDraftSection}>
          <div className={styles.groupDraftHeader}>
            <h4 className={styles.groupDraftTitle}>{t('createWorkout.creatingGroup')} ({groupDraft.length} {t('createWorkout.exercises')})</h4>
            <button
              className={styles.confirmGroupButton}
              onClick={onConfirmGroup}
              title={t('createWorkout.finishGroupTitle')}
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
                    columns={columns}
                    onStarWeightClick={onStarWeightClick}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      )}
      
      {hasSelectedDayExercises && DAYS_OF_WEEK.map((day) => {
        const dayExercises = workout.weeks[selectedWeek]?.days[day.key]?.exercises || [];
        
        if (dayExercises.length === 0) return null;
        
        return (
          <div key={day.key} className={styles.dayExercisesSection}>
            <h4 className={styles.daySectionTitle}>{t(`days.${day.key}`)}</h4>
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
                      columns={columns}
                      onStarWeightClick={onStarWeightClick}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </div>
        );
      })}
      
      {!hasAnyExercises && groupDraft.length === 0 && (
        <p className={styles.infoMessage}>{t('createWorkout.noExercisesHint')}</p>
      )}
    </div>
  );
}
