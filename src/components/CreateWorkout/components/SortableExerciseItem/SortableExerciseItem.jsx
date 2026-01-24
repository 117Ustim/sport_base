import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import CustomSelect from '../CustomSelect';
import { TIME_OPTIONS, SETS_OPTIONS, REPS_OPTIONS } from '../../constants';
import styles from './SortableExerciseItem.module.scss';

export default function SortableExerciseItem({ exercise, index, dayKey, onUpdate, onRemove, onConfirm, getWeightForReps, isInDraft }) {
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
          <span className={styles.dragHandle} {...attributes} {...listeners} title="Перетащите для изменения порядка">
            ⋮⋮
          </span>
          <span className={styles.exerciseIndex}>{index + 1}.</span>
          
          <div className={styles.groupExercises}>
            {exercise.exercises.map((ex, idx) => {
              const isAerobic = ex.category_id === '6';
              
              return (
                <span key={idx} className={styles.groupExerciseItem}>
                  <span className={styles.exerciseTitle}>{ex.name}</span>
                  
                  {isAerobic ? (
                    <span className={styles.exerciseParams}>
                      {ex.duration || 30} хв
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
            title="Удалить группу"
          >
            ×
          </button>
        </div>
      </li>
    );
  }

  // Обычное упражнение (существующий код)
  const isAerobic = exercise.category_id === '6';

  return (
    <li 
      ref={setNodeRef} 
      style={style}
      className={`${styles.exerciseRow} ${isDragging ? styles.dragging : ''}`}
    >
      <div className={styles.exerciseContent}>
        <span className={styles.dragHandle} {...attributes} {...listeners} title="Перетащите для изменения порядка">
          ⋮⋮
        </span>
        <span className={styles.exerciseIndex}>{index + 1}.</span>
        <span className={styles.exerciseTitle}>{exercise.name}</span>
        
        {isAerobic ? (
          <>
            <span className={styles.timeLabel}>Время:</span>
            <CustomSelect
              value={exercise.duration || 30}
              options={TIME_OPTIONS}
              onChange={(val) => onUpdate(exercise.id, dayKey, 'duration', val)}
              className="timeSelector"
              suffix=" хв"
            />
          </>
        ) : (
          <>
            <CustomSelect
              value={exercise.numberSteps}
              options={SETS_OPTIONS}
              onChange={(val) => onUpdate(exercise.id, dayKey, 'numberSteps', val)}
              className="setsSelector"
            />
            
            <span className={styles.multiplySymbol}>×</span>
            
            <CustomSelect
              value={exercise.numberTimes}
              options={REPS_OPTIONS}
              onChange={(val) => onUpdate(exercise.id, dayKey, 'numberTimes', val)}
              className="repsSelector"
            />
            
            <span className={styles.weightFromDatabase}>
              ({getWeightForReps(exercise.exerciseData, exercise.numberTimes)})
            </span>
          </>
        )}
        
        <button
          className={styles.deleteExerciseButton}
          onClick={() => onRemove(exercise.id, dayKey)}
          title="Удалить упражнение"
        >
          ×
        </button>
      </div>
    </li>
  );
}
