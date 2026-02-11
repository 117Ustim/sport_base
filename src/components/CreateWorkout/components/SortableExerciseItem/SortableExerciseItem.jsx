import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import CustomSelect from '../CustomSelect';
import { TIME_OPTIONS, SETS_OPTIONS, REPS_OPTIONS } from '../../constants';
import styles from './SortableExerciseItem.module.scss';

export default function SortableExerciseItem({ exercise, index, dayKey, onUpdate, onRemove, onConfirm, getWeightForReps, isInDraft, columns, onStarWeightClick }) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Создаём опции для селекта повторений на основе цифровых колонок
  const repsOptions = columns && columns.length > 0
    ? columns
        .filter(col => !isNaN(parseInt(col.name))) // Только колонки с цифровыми названиями
        .map(col => parseInt(col.name)) // Преобразуем в числа
        .sort((a, b) => a - b) // Сортируем по возрастанию
    : REPS_OPTIONS; // Fallback на стандартные опции если колонок нет

  // Проверяем, является ли это группой упражнений
  const isGroup = exercise.type === 'group' && exercise.exercises && exercise.exercises.length > 0;

  if (isGroup) {
    return (
      <li 
        ref={setNodeRef} 
        style={style}
        className={`${styles.exerciseRow} ${styles.groupRow} ${isDragging ? styles.dragging : ''}`}
      >
        <div className={styles.exerciseContent}>
          <span className={styles.dragHandle} {...attributes} {...listeners} title={t('createWorkout.dragToReorder')}>
            ⋮⋮
          </span>
          <span className={styles.exerciseIndex}>{index + 1}.</span>
          
          <div className={styles.groupExercises}>
            {exercise.exercises.map((ex, idx) => {
              const isAerobic = ex.category_id === '6';
              const isAbs = ex.name && ex.name.toLowerCase().includes('прес'); // Проверка на "Пресс"
              
              return (
                <span key={idx} className={styles.groupExerciseItem}>
                  <span className={styles.exerciseTitle}>{ex.name}</span>
                  
                  {isAerobic ? (
                    <span className={styles.exerciseParams}>
                      {ex.duration || 30} {t('createWorkout.minutes')}
                    </span>
                  ) : isAbs ? (
                    <span className={styles.exerciseParams}>
                      {ex.numberSteps}×∞
                    </span>
                  ) : (
                    <span className={styles.exerciseParams}>
                      {ex.numberSteps}×{ex.numberTimes} ({getWeightForReps(ex.exerciseData, ex.numberTimes)})
                    </span>
                  )}
                  
                  {idx < exercise.exercises.length - 1 && (
                    <span className={styles.plusSign}> + </span>
                  )}
                </span>
              );
            })}
          </div>
          
          <button
            className={styles.deleteExerciseButton}
            onClick={() => onRemove(exercise.id, dayKey)}
            title={t('createWorkout.deleteGroup')}
          >
            ×
          </button>
        </div>
      </li>
    );
  }

  // Обычное упражнение (существующий код)
  const isAerobic = exercise.category_id === '6';
  const isAbs = exercise.name && exercise.name.toLowerCase().includes('прес'); // Проверка на "Пресс"

  return (
    <li 
      ref={setNodeRef} 
      style={style}
      className={`${styles.exerciseRow} ${isDragging ? styles.dragging : ''}`}
    >
      <div className={styles.exerciseContent}>
        <span className={styles.dragHandle} {...attributes} {...listeners} title={t('createWorkout.dragToReorder')}>
          ⋮⋮
        </span>
        <span className={styles.exerciseIndex}>{index + 1}.</span>
        <span className={styles.exerciseTitle}>{exercise.name}</span>
        
        {isAerobic ? (
          <>
            <span className={styles.timeLabel}>{t('createWorkout.timeLabel')}:</span>
            <div className={styles.selectWrapper}>
              <CustomSelect
                value={exercise.duration || 30}
                options={TIME_OPTIONS}
                onChange={(val) => onUpdate(exercise.id, dayKey, 'duration', val)}
                className="timeSelector"
                suffix={` ${t('createWorkout.minutes')}`}
              />
            </div>
          </>
        ) : isAbs ? (
          <>
            <div className={styles.selectWrapper}>
              <CustomSelect
                value={exercise.numberSteps}
                options={SETS_OPTIONS}
                onChange={(val) => onUpdate(exercise.id, dayKey, 'numberSteps', val)}
                className="setsSelector"
              />
            </div>
            
            <span className={styles.multiplySymbol}>×</span>
            
            <span className={styles.infinitySymbol} title={t('createWorkout.infinityReps')}>
              ∞
            </span>
          </>
        ) : (
          <>
            <div className={styles.selectWrapper}>
              <CustomSelect
                value={exercise.numberSteps}
                options={SETS_OPTIONS}
                onChange={(val) => onUpdate(exercise.id, dayKey, 'numberSteps', val)}
                className="setsSelector"
              />
            </div>
            
            <span className={styles.multiplySymbol}>×</span>
            
            <div className={styles.selectWrapper}>
              <CustomSelect
                value={exercise.numberTimes}
                options={repsOptions}
                onChange={(val) => onUpdate(exercise.id, dayKey, 'numberTimes', val)}
                className="repsSelector"
              />
            </div>
            
            <span className={styles.weightFromDatabase}>
              ({getWeightForReps(exercise.exerciseData, exercise.numberTimes)})
              {exercise.isFromStarColumn && (
                <span className={styles.starIndicator} title="Вес из колонки *">*</span>
              )}
            </span>
          </>
        )}
        
        <button
          className={styles.deleteExerciseButton}
          onClick={() => onRemove(exercise.id, dayKey)}
          title={t('createWorkout.deleteExercise')}
        >
          ×
        </button>
      </div>
    </li>
  );
}
