import styles from './ExercisesPanel.module.scss';

export default function ExercisesPanel({ categories, exercises, onSelectExercise, addMode, onAddModeChange, groupDraft, onCancelGroup }) {
  return (
    <div className={styles.exercisesSelectorPanel}>
      <h3 className={styles.panelTitle}>Выберите упражнения</h3>
      
      <div className={styles.addModeSelector}>
        <label className={styles.radioLabel}>
          <input
            type="radio"
            name="addMode"
            value="single"
            checked={addMode === 'single'}
            onChange={(e) => onAddModeChange(e.target.value)}
          />
          <span>Обычная</span>
        </label>
        <label className={styles.radioLabel}>
          <input
            type="radio"
            name="addMode"
            value="group"
            checked={addMode === 'group'}
            onChange={(e) => onAddModeChange(e.target.value)}
          />
          <span>Групповая</span>
        </label>
        
        {addMode === 'group' && groupDraft.length > 0 && (
          <div className={styles.groupDraftInfo}>
            <span>В группе: {groupDraft.length} упр.</span>
            <button className={styles.cancelGroupButton} onClick={onCancelGroup}>
              Отмена
            </button>
          </div>
        )}
      </div>
      
      <p className={styles.instructionHint}>Кликните на упражнение для добавления</p>
      
      <div className={styles.categoriesGrid}>
        {categories?.map((category) => (
          <div className={styles.categoryColumn} key={category.id}>
            <h4 className={styles.categoryName}>{category.name}</h4>
            <div className={styles.exercisesInCategory}>
              {exercises
                .filter((exercise) => exercise.category_id === category.id)
                .map((exercise) => (
                  <div
                    key={exercise.exercise_id}
                    className={styles.exerciseNameItem}
                    onClick={() => onSelectExercise(exercise)}
                  >
                    {exercise.name}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
