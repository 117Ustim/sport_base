import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { categoriesService, clientBaseService } from '../../firebase/services';
import { useConfirmDialog, useNotification, useSaveManager } from '../../hooks';
import ConfirmDialog from '../ConfirmDialog';
import Notification from '../Notification';
import styles from './EditClientExercises.module.scss';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Компонент для перетаскиваемого упражнения
function SortableExerciseItem({ exercise, deleteExercise }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.exercise_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    deleteExercise(exercise.exercise_id, exercise.name);
  };

  const handleButtonPointerDown = (e) => {
    e.stopPropagation();
  };

  const handleButtonMouseDown = (e) => {
    e.stopPropagation();
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.sortableExerciseWrapper}>
      <ul>
        <div className={styles.blockExercises}>
          <li>
            <h5 className={styles.textExercises}>
              <span {...attributes} {...listeners} style={{ cursor: 'move', flex: 1, display: 'inline-block' }}>
                {exercise.name}
              </span>
              <button
                className={styles.delete}
                onClick={handleDelete}
                onPointerDown={handleButtonPointerDown}
                onMouseDown={handleButtonMouseDown}
                type="button"
                style={{ pointerEvents: 'auto', zIndex: 10, position: 'relative' }}
              >
                <span>Del</span>
              </button>
            </h5>
          </li>
        </div>
      </ul>
    </div>
  );
}

export default function EditClientExercises() {
  const params = useParams();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [clientExercises, setClientExercises] = useState([]);
  const [originalExercises, setOriginalExercises] = useState([]);
  const [exercise, setExercise] = useState({ categoryId: '', name: '' });
  const { confirmDialog, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();
  const { notification, showNotification } = useNotification();

  // Используем общий хук для управления сохранением
  const saveManager = useSaveManager({
    onSave: async (newItems) => {
      // Находим удаленные упражнения (были в оригинале, но нет в текущем списке)
      const originalIds = originalExercises.map(ex => ex.exercise_id);
      const currentIds = clientExercises.map(ex => ex.exercise_id);
      const deletedIds = originalIds.filter(id => !currentIds.includes(id) && !id.toString().startsWith('temp_'));
      
      // Удаляем упражнения с сервера
      for (const exerciseId of deletedIds) {
        await clientBaseService.deleteExercise(params.id, exerciseId);
      }
      
      // Сохраняем новые упражнения на сервер с порядком
      for (let i = 0; i < newItems.length; i++) {
        const exerciseData = newItems[i];
        const { exercise_id, ...dataToSave } = exerciseData;
        
        // Находим индекс этого упражнения в общем списке
        const indexInExercises = clientExercises.findIndex(ex => ex.exercise_id === exerciseData.exercise_id);
        dataToSave.order = indexInExercises;
        
        await clientBaseService.addExerciseToClient(params.id, dataToSave);
      }
      
      // Обновляем порядок ВСЕХ упражнений (включая старые)
      await clientBaseService.updateExercisesOrder(params.id, clientExercises);
      
      // Обновляем список упражнений с сервера
      const updatedExercises = await clientBaseService.getByClientId(params.id);
      setClientExercises(updatedExercises);
      setOriginalExercises(updatedExercises);
      saveManager.setOriginalData(updatedExercises);
    },
    showNotification
  });
  
  // Sensors для dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    categoriesService.getAll().then((data) => {
      setCategories(data);
    });

    loadClientExercises();
  }, []);

  const loadClientExercises = () => {
    clientBaseService.getByClientId(params.id).then((data) => {
      setClientExercises(data);
      setOriginalExercises(data);
      saveManager.setOriginalData(data);
    });
  };

  const onButtonBack = async () => {
    if (saveManager.hasUnsavedChanges) {
      await saveManager.saveChanges();
    }
    navigate(`/client_base/${params.id}`);
  };

  const onChange = (event) => {
    const { name, value } = event.target;

    if (name === 'name' && value) {
      const formattedValue = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      setExercise({ ...exercise, [name]: formattedValue });
    } else {
      setExercise({ ...exercise, [name]: value });
    }
  };

  const addExerciseToClient = () => {
    if (!exercise.categoryId || !exercise.name) {
      showNotification('Будь ласка, заповніть всі поля: Категорія та Вправа', 'error');
      return;
    }

    const alreadyExists = clientExercises.some(
      ex => ex.name.toLowerCase() === exercise.name.toLowerCase() && ex.category_id === exercise.categoryId
    );

    if (alreadyExists) {
      showNotification('Ця вправа вже додана', 'error');
      return;
    }

    const newExercise = {
      exercise_id: `temp_${Date.now()}`, // Временный ID
      name: exercise.name,
      category_id: exercise.categoryId,
      categoryId: exercise.categoryId
    };

    // Добавляем упражнение локально
    setClientExercises([...clientExercises, newExercise]);
    saveManager.addNewItem(newExercise);
    setExercise({ categoryId: '', name: '' });
    showNotification('Вправу додано. Натисніть "Зберегти" для збереження', 'info');
  };

  const deleteExercise = (exerciseId, exerciseName) => {
    showConfirm(
      `Ви впевнені, що хочете видалити вправу "${exerciseName}"?`,
      async () => {
        try {
          // Проверяем, это новое упражнение (еще не сохранено на сервере)?
          const isNewExercise = exerciseId.toString().startsWith('temp_');
          
          // Удаляем локально
          const updatedExercises = clientExercises.filter((ex) => ex.exercise_id !== exerciseId);
          setClientExercises(updatedExercises);
          
          if (isNewExercise) {
            // Если это новое упражнение, просто убираем из списка новых
            saveManager.removeNewItem(exerciseId);
          } else {
            // Если это существующее упражнение, помечаем как измененное
            saveManager.markAsChanged();
          }
        } catch (error) {
          console.error('Error deleting exercise:', error);
          showNotification('Помилка видалення вправи: ' + error.message, 'error');
        }
      }
    );
  };

  const handleDragEnd = (event, categoryId) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const categoryExercises = clientExercises.filter(ex => ex.category_id === categoryId);
    const otherExercises = clientExercises.filter(ex => ex.category_id !== categoryId);

    const oldIndex = categoryExercises.findIndex(ex => ex.exercise_id === active.id);
    const newIndex = categoryExercises.findIndex(ex => ex.exercise_id === over.id);

    const reorderedCategoryExercises = arrayMove(categoryExercises, oldIndex, newIndex);
    const updatedExercises = [...otherExercises, ...reorderedCategoryExercises];

    setClientExercises(updatedExercises);
    saveManager.markAsChanged();
  };

  return (
    <>
      <Notification notification={notification} />
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        message={confirmDialog.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
      
      <div className={styles.buttonBack}>
        <button className='red' type='button' onClick={onButtonBack}>
          <i className='icon ion-md-lock'></i>Назад
        </button>
        
        <button
          className={`red ${styles.saveButton} ${!saveManager.hasUnsavedChanges ? styles.saveButtonDisabled : ''}`}
          type='button'
          onClick={saveManager.saveChanges}
          disabled={!saveManager.hasUnsavedChanges || saveManager.isSaving}>
          <i className='icon ion-md-checkmark'></i>
          {saveManager.isSaving ? 'Збереження...' : 'Зберегти'}
        </button>
      </div>

      <div className='_container'>
        <div className={styles.blockCategory}>
          <div className={styles.category}>
            <select
              name='categoryId'
              value={exercise?.categoryId || ''}
              onChange={onChange}
            >
              <option className='select'>Категорiя</option>
              {categories.map((c) => {
                return (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                );
              })}
            </select>
          </div>

          <div className={styles.exercise}>
            <input
              name='name'
              placeholder='Вправа'
              value={exercise?.name || ''}
              onChange={onChange}
            />
          </div>

          <div className={styles.button}>
            <button className='red' type='button' onClick={addExerciseToClient}>
              <i className='icon ion-md-lock'></i>Додати
            </button>
          </div>
        </div>

        <div className={styles.blockOutputCategoryExercises}>
          <div className={styles.columnCategory}>
            {categories.map((category) => {
              const categoryExercises = clientExercises.filter(
                (ex) => ex.category_id === category.id
              );

              if (categoryExercises.length === 0) return null;

              return (
                <div key={category.id} className={styles.textCategory}>
                  <h4>Категория {category.name}</h4>
                  <div className={styles.blockTextExercises}>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event) => handleDragEnd(event, category.id)}
                    >
                      <SortableContext
                        items={categoryExercises.map(ex => ex.exercise_id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {categoryExercises.map((exercise) => (
                          <SortableExerciseItem
                            key={exercise.exercise_id}
                            exercise={exercise}
                            deleteExercise={deleteExercise}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
