import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { categoriesService, exercisesService } from '../../firebase/services';
import { useConfirmDialog, useNotification, useSaveManager } from '../../hooks';
import ConfirmDialog from '../ConfirmDialog';
import Notification from '../Notification';
import CategoryMenu from './CategoryMenu';
import CustomSelect from '../CustomSelect';
import BackButton from '../BackButton';
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
                <span>{t('common.delete')}</span>
              </button>
            </h5>
          </li>
        </div>
      </ul>
    </div>
  );
}

export default function EditClientBase() {
  const { t } = useTranslation();
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
      try {
        console.log('Saving new exercises:', newItems);
        
        // Сохраняем новые упражнения на сервер
        for (const exerciseData of newItems) {
          const { id, ...dataToSave } = exerciseData;
          
          // Пропускаем упражнения без имени
          if (!dataToSave.name) {
            console.warn('Skipping exercise without name:', exerciseData);
            continue;
          }
          
          // Находим индекс этого упражнения в общем списке для order
          const indexInExercises = exercises.findIndex(ex => ex.id === exerciseData.id);
          dataToSave.order = indexInExercises >= 0 ? indexInExercises : 999999;
          
          console.log('Creating exercise:', dataToSave);
          await exercisesService.create(dataToSave);
        }
        
        // Обновляем список упражнений с сервера (получаем реальные ID)
        const updatedExercises = await exercisesService.getAll();
        console.log('Updated exercises from server:', updatedExercises);
        
        setExercises(updatedExercises);
        saveManager.setOriginalData(updatedExercises);
        
      } catch (error) {
        console.error('Error in save process:', error);
        throw error;
      }
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
      showNotification(t('editExercises.fillAllFields'), 'error');
      return;
    }

    const alreadyExists = exercises.some(
      ex => ex.name && ex.name.trim().toLowerCase() === exercise.name.trim().toLowerCase() && ex.categoryId === exercise.categoryId
    );

    if (alreadyExists) {
      showNotification(t('editBase.exerciseExists'), 'error');
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
    showNotification(t('editExercises.addedHint'), 'info');
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
      t('editExercises.confirmDelete', { name: exerciseName }),
      async () => {
        try {
          // Проверяем, это новое упражнение (еще не сохранено на сервере)?
          const isNewExercise = id.toString().startsWith('temp_');
          
          if (isNewExercise) {
            // Удаляем локально
            setExercises(exercises.filter((exercise) => exercise.id !== id));
            saveManager.removeNewItem(id);
            showNotification(t('editBase.exerciseDeleted'), 'success');
          } else {
            // Удаляем с сервера
            await exercisesService.delete(id);
            const updatedExercises = exercises.filter((exercise) => exercise.id !== id);
            setExercises(updatedExercises);
            
            // Обновляем порядок оставшихся упражнений на сервере
            await exercisesService.updateOrder(updatedExercises);
            
            showNotification(t('editBase.exerciseDeletedServer'), 'success');
          }
        } catch (error) {
          console.error('Error deleting exercise:', error);
          showNotification(t('editExercises.deleteError', { error: error.message }), 'error');
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
      showNotification(t('editBase.categoryAdded', { name: categoryName }), 'success');
    } catch (error) {
      console.error('Error adding category:', error);
      showNotification(t('editBase.addCategoryError'), 'error');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      // Проверяем, есть ли упражнения в этой категории
      const categoryExercises = exercises.filter(ex => ex.categoryId === categoryId);
      
      if (categoryExercises.length > 0) {
        showNotification(t('editBase.categoryNotEmpty'), 'error');
        return;
      }

      await categoriesService.deleteCategory(categoryId);
      const updatedCategories = await categoriesService.getAll();
      setCategories(updatedCategories);
      showNotification(t('editBase.categoryDeleted'), 'success');
    } catch (error) {
      console.error('Error deleting category:', error);
      showNotification(t('editBase.deleteCategoryError'), 'error');
    }
  };

  const handleUpdateCategory = async (categoryId, newName) => {
    try {
      await categoriesService.updateCategory(categoryId, newName);
      const updatedCategories = await categoriesService.getAll();
      setCategories(updatedCategories);
      showNotification(t('editBase.categoryUpdated', { name: newName }), 'success');
    } catch (error) {
      console.error('Error updating category:', error);
      showNotification(t('editBase.updateCategoryError'), 'error');
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
        onUpdateCategory={handleUpdateCategory}
        isOpen={isCategoryMenuOpen}
        onClose={() => setIsCategoryMenuOpen(false)}
      />
      
      <div className={styles.buttonBack}>
        <BackButton onClick={onButtonBackClient} />
        
        <div className={styles.rightButtons}>
          <button
            className={`${styles.saveButton} ${!saveManager.hasUnsavedChanges ? styles.saveButtonDisabled : styles.saveButtonActive}`}
            type='button'
            onClick={saveManager.saveChanges}
            disabled={!saveManager.hasUnsavedChanges || saveManager.isSaving}>
            {saveManager.isSaving ? t('editExercises.saving') : t('common.save')}
          </button>

          <button
            className={styles.categoryMenuButton}
            type='button'
            onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
            title={t('editBase.manageCategories')}
          >
            {t('editBase.categoriesBtn')}
          </button>
        </div>
      </div>

      <div className='_container'>
        <div className={styles.blockCategory}>
          <div className={styles.category}>
            <CustomSelect
              name="categoryId"
              options={categories.map(c => ({ value: c.id, label: c.name }))}
              value={exercise?.categoryId || ''}
              onChange={onChange}
              placeholder={t('editExercises.categoryPlaceholder')}
            />
          </div>

          <div className={styles.exercise}>
            <input
              name='name'
              placeholder={t('editExercises.exercisePlaceholder')}
              value={exercise?.name || ''}
              onChange={onChange}
            />
          </div>

          <div className={styles.button}>
            <button
              className='red'
              type='button'
              onClick={buttonAddExercises}>
              <i className='icon ion-md-lock'></i>{t('common.add')}
            </button>
          </div>
        </div>

        <div className={styles.blockOutputCategoryExercises}>
          <div className={styles.columnCategory}>
            {categories?.map((category) => {
              const categoryExercises = exercises.filter((exercise) => exercise.categoryId === category.id);
              
              return (
                <div className={styles.textCategory} key={category.id}>
                  <h4>{t('editExercises.categoryTitle', { name: category.name })}</h4>
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
