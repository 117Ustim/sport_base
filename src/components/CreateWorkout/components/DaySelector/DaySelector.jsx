import { useTranslation } from 'react-i18next';
import { DAYS_OF_WEEK } from '../../constants';
import styles from './DaySelector.module.scss';
import { DndContext, useDraggable, useDroppable, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';

function DraggableDayButton({ day, selectedDay, exercisesCount, onSelectDay, t }) {
  const { attributes, listeners, setNodeRef: setDraggableRef, isDragging } = useDraggable({
    id: `draggable-${day.key}`,
    data: { dayKey: day.key }
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `droppable-${day.key}`,
    data: { dayKey: day.key }
  });

  const setRef = (node) => {
    setDraggableRef(node);
    setDroppableRef(node);
  };

  return (
    <button
      ref={setRef}
      {...attributes}
      {...listeners}
      className={`${styles.dayButton} ${selectedDay === day.key ? styles.activeDay : ''} ${isOver ? styles.isOver : ''} ${isDragging ? styles.isDragging : ''}`}
      onClick={() => onSelectDay(day.key)}
    >
      <span className={styles.dayLabel}>{t(`days.${day.key}`)}</span>
      {exercisesCount > 0 && (
        <span className={styles.dayExercisesCount}>{exercisesCount}</span>
      )}
    </button>
  );
}

export default function DaySelector({ selectedDay, workout, selectedWeek, onSelectDay, onSwapDays }) {
  const { t } = useTranslation();
  
  // Добавляем constraint, чтобы клики работали нормально, а драг начинался только после сдвига
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 5,
    }
  }));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active && over && active.data.current?.dayKey !== over.data.current?.dayKey) {
      if (onSwapDays) {
        onSwapDays(active.data.current.dayKey, over.data.current.dayKey);
      }
    }
  };

  return (
    <div className={styles.daysSelectorSidebar}>
      <h3 className={styles.sidebarTitle}>{t('createWorkout.daysTitle')}</h3>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className={styles.daysButtons}>
          {DAYS_OF_WEEK.map((day) => {
            const exercisesCount = workout.weeks[selectedWeek]?.days[day.key]?.exercises?.length || 0;
            return (
              <DraggableDayButton
                key={day.key}
                day={day}
                selectedDay={selectedDay}
                exercisesCount={exercisesCount}
                onSelectDay={onSelectDay}
                t={t}
              />
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}
