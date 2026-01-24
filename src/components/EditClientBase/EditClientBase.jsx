import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { categoriesService, exercisesService } from '../../firebase/services';
import { useConfirmDialog, useNotification, useSaveManager } from '../../hooks';
import ConfirmDialog from '../ConfirmDialog';
import Notification from '../Notification';
import CategoryMenu from './CategoryMenu';
import styles from './EditClientBase.module.scss';
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
  } = useSortable({ id: exercise.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    deleteExercise(exercise.id, exercise.name);
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

export default function EditClientBase() {
  const params = useParams();
  const navigate = useNavigate();
  const { confirmDialog, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();
  const { notification, showNotification } = useNotification();

  const [categories, setCategories] = useState([]);
  const [exercise, setExercise] = useState({});
  const [exercises, setExercises] = useState([]);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);

  // Используем общий хук для управления сохранением
  const saveManager = useSaveManager({
    onSave: async (newItems) => {
      // Сохраняем новые упражнения на сервер с порядком
      for (let i = 0; i < newItems.length; i++) {
        const exerciseData = newItems[i];
        const { id, ...dataToSave } = exerciseData;
        
        // Находим индекс этого упражнения в общем списке
        const indexInExercises = exercises.findIndex(ex => ex.id === exerciseData.id);
        dataToSave.order = indexInExercises;
        
        await exercisesService.create(dataToSave);
      }
      
      // Обновляем порядок ВСЕХ упражнений (включая старые)
      await exercisesService.updateOrder(exercises);
      
      // Обновляем список упражнений с сервера
      const updatedExercises = await exercisesService.getAll();
      setExercises(updatedExercises);
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

    exercisesService.getAll().then((data) => {
      setExercises(data);
      saveManager.setOriginalData(data);
    });
  }, []);

  const onButtonBackClient = async () => {
    if (saveManager.hasUnsavedChanges) {
      await saveManager.saveChanges();
    }
    navigate(-1);
  };

  const buttonAddExercises = () => {
    if (!exercise.categoryId || !exercise.name || exercise.name.trim() === '') {
      showNotification('Будь ласка, заповніть всі поля: Категорія та Вправа', 'error');
      return;
    }

    const alreadyExists = exercises.some(
      ex => ex.name.trim().toLowerCase() === exercise.name.trim().toLowerCase() && ex.categoryId === exercise.categoryId
    );

    if (alreadyExists) {
      showNotification('Вправа з такою назвою вже існує в цій категорії', 'error');
      return;
    }

    const exerciseData = {
      categoryId: exercise.categoryId,
      name: exercise.name,
      id: `temp_${Date.now()}` // Временный ID для локального отображения
    };

    if (params.id) {
      exerciseData.clientId = params.id;
    }

    // Добавляем упражнение локально
    setExercises([...exercises, exerciseData]);
    saveManager.addNewItem(exerciseData);
    setExercise({});
    showNotification('Вправу додано. Натисніть "Зберегти" для збереження', 'info');
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

  const deleteExercise = (id, exerciseName) => {
    showConfirm(
      `Ви впевнені, що хочете видалити вправу "${exerciseName}"?`,
      async () => {
        try {
          // Проверяем, это новое упражнение (еще не сохранено на сервере)?
          const isNewExercise = id.toString().startsWith('temp_');
          
          if (isNewExercise) {
            // Удаляем локально
            setExercises(exercises.filter((exercise) => exercise.id !== id));
            saveManager.removeNewItem(id);
          } else {
            // Удаляем с сервера
            await exercisesService.delete(id);
            setExercises(exercises.filter((exercise) => exercise.id !== id));
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

    const categoryExercises = exercises.filter(ex => ex.categoryId === categoryId);
    const otherExercises = exercises.filter(ex => ex.categoryId !== categoryId);

    const oldIndex = categoryExercises.findIndex(ex => ex.id === active.id);
    const newIndex = categoryExercises.findIndex(ex => ex.id === over.id);

    const reorderedCategoryExercises = arrayMove(categoryExercises, oldIndex, newIndex);
    const updatedExercises = [...otherExercises, ...reorderedCategoryExercises];

    setExercises(updatedExercises);
    saveManager.markAsChanged();
  };

  const handleAddCategory = async (categoryName) => {
    try {
      await categoriesService.createCategory(categoryName);
      const updatedCategories = await categoriesService.getAll();
      setCategories(updatedCategories);
      showNotification(`Категорію "${categoryName}" успішно додано`, 'success');
    } catch (error) {
      console.error('Error adding category:', error);
      showNotification('Помилка додавання категорії', 'error');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      // Проверяем, есть ли упражнения в этой категории
      const categoryExercises = exercises.filter(ex => ex.categoryId === categoryId);
      
      if (categoryExercises.length > 0) {
        showNotification('Неможливо видалити категорію з вправами. Спочатку видаліть всі вправи.', 'error');
        return;
      }

      await categoriesService.deleteCategory(categoryId);
      const updatedCategories = await categoriesService.getAll();
      setCategories(updatedCategories);
      showNotification('Категорію успішно видалено', 'success');
    } catch (error) {
      console.error('Error deleting category:', error);
      showNotification('Помилка видалення категорії', 'error');
    }
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
      
      <CategoryMenu
        categories={categories}
        onAddCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory}
        isOpen={isCategoryMenuOpen}
        onClose={() => setIsCategoryMenuOpen(false)}
      />
      
      <div className={styles.buttonBack}>
        <button
          className='red'
          type='button'
          onClick={onButtonBackClient}>
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

        <button
          className={styles.categoryMenuButton}
          type='button'
          onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
          title="Керування категоріями"
        >
          ⚙️
        </button>
      </div>

      <div className='_container'>
        <div className={styles.blockCategory}>
          <div className={styles.category}>
            <select
              name='categoryId'
              value={exercise?.categoryId || ''}
              onChange={onChange}>
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
            <button
              className='red'
              type='button'
              onClick={buttonAddExercises}>
              <i className='icon ion-md-lock'></i>Додати
            </button>
          </div>
        </div>

        <div className={styles.blockOutputCategoryExercises}>
          <div className={styles.columnCategory}>
            {categories?.map((category) => {
              const categoryExercises = exercises.filter((exercise) => exercise.categoryId === category.id);
              
              return (
                <div className={styles.textCategory} key={category.id}>
                  <h4>Категория {category.name}</h4>
                  <div className={styles.blockTextExercises}>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event) => handleDragEnd(event, category.id)}
                    >
                      <SortableContext
                        items={categoryExercises.map(ex => ex.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {categoryExercises.map((exercise) => (
                          <SortableExerciseItem
                            key={exercise.id}
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
