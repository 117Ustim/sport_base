import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { categoriesService, clientBaseService } from '../../firebase/services';
import { useConfirmDialog, useNotification, useSaveManager } from '../../hooks';
import ConfirmDialog from '../ConfirmDialog';
import Notification from '../Notification';
import CustomSelect from '../CustomSelect';
import BackButton from '../BackButton';
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
  const { t } = useTranslation();
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
                <span>{t('common.delete')}</span>
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
  const { t } = useTranslation();

  const [categories, setCategories] = useState([]);
  const [clientExercises, setClientExercises] = useState([]);
  const [originalExercises, setOriginalExercises] = useState([]);
  const [exercise, setExercise] = useState({ categoryId: '', name: '' });
  const { confirmDialog, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();
  const { notification, showNotification } = useNotification();

  // Используем общий хук для управления сохранением
  const saveManager = useSaveManager({
    onSave: async (currentExercises, originalExercisesList) => {
      console.log('=== SAVE START ===');
      console.log('Saving exercises for client:', params.id);
      console.log('originalExercisesList:', originalExercisesList);
      console.log('currentExercises:', currentExercises);
      
      // 1. Находим удаленные упражнения (были в оригинале, но нет в текущем списке)
      const originalIds = originalExercisesList.map(ex => ex.exercise_id);
      const currentIds = currentExercises.map(ex => ex.exercise_id);
      console.log('originalIds:', originalIds);
      console.log('currentIds:', currentIds);
      
      // ВАЖНО: Удаляем ВСЕ упражнения, которых нет в текущем списке (включая temp_)
      const deletedIds = originalIds.filter(id => !currentIds.includes(id));
      console.log('deletedIds:', deletedIds);
      
      // 2. Удаляем упражнения с сервера
      for (const exerciseId of deletedIds) {
        console.log('Deleting exercise from server:', exerciseId);
        await clientBaseService.deleteExercise(params.id, exerciseId);
      }
      
      // 3. Находим новые упражнения (с temp_ ID) в текущем списке
      const newExercises = currentExercises.filter(ex => ex.exercise_id.toString().startsWith('temp_'));
      console.log('New exercises to add:', newExercises);
      
      // 4. Добавляем новые упражнения на сервер
      for (const exerciseData of newExercises) {
        // Пропускаем упражнения без имени
        if (!exerciseData.name) {
          console.warn('Skipping exercise without name:', exerciseData);
          continue;
        }
        
        const exerciseToSave = {
          id: exerciseData.exercise_id, // Используем существующий temp_ ID
          name: exerciseData.name,
          categoryId: exerciseData.category_id || exerciseData.categoryId,
          order: 999999 // Временный order, обновим ниже
        };
        
        console.log('Adding exercise to client:', exerciseToSave);
        await clientBaseService.addExerciseToClient(params.id, exerciseToSave);
      }
      
      // 5. Получаем обновлённый список с сервера (с реальными ID)
      const updatedExercises = await clientBaseService.getByClientId(params.id);
      console.log('Updated exercises from server:', updatedExercises);
      
      // 6. Обновляем порядок ВСЕХ упражнений согласно текущему списку
      // Создаём мапу для быстрого поиска позиций
      const orderMap = new Map();
      currentExercises.forEach((ex, index) => {
        // Для новых упражнений ищем по имени и категории
        if (ex.exercise_id.toString().startsWith('temp_')) {
          orderMap.set(`${ex.name}_${ex.category_id}`, index);
        } else {
          orderMap.set(ex.exercise_id, index);
        }
      });
      
      // Применяем порядок к обновлённым упражнениям
      const exercisesWithOrder = updatedExercises.map(ex => {
        const key = `${ex.name}_${ex.category_id}`;
        const order = orderMap.has(ex.exercise_id) 
          ? orderMap.get(ex.exercise_id) 
          : orderMap.get(key);
        
        return {
          ...ex,
          order: order !== undefined ? order : ex.order
        };
      });
      
      // Сортируем по order
      exercisesWithOrder.sort((a, b) => a.order - b.order);
      
      // 7. Сохраняем обновлённый порядок на сервер
      console.log('Updating exercises order:', exercisesWithOrder);
      await clientBaseService.updateExercisesOrder(params.id, exercisesWithOrder);
      
      // 8. Финальная загрузка с сервера
      const finalExercises = await clientBaseService.getByClientId(params.id);
      console.log('Final exercises from server:', finalExercises);
      
      setClientExercises(finalExercises);
      setOriginalExercises(finalExercises);
      saveManager.setOriginalData(finalExercises);
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
      await saveManager.saveChanges(clientExercises, originalExercises);
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
      showNotification(t('editExercises.fillAllFields'), 'error');
      return;
    }

    const alreadyExists = clientExercises.some(
      ex => ex.name.toLowerCase() === exercise.name.toLowerCase() && ex.category_id === exercise.categoryId
    );

    if (alreadyExists) {
      showNotification(t('editExercises.alreadyExists'), 'error');
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
    saveManager.markAsChanged(); // Просто помечаем как изменённое
    setExercise({ categoryId: '', name: '' });
    showNotification(t('editExercises.addedHint'), 'info');
  };

  const deleteExercise = (exerciseId, exerciseName) => {
    showConfirm(
      t('editExercises.confirmDelete', { name: exerciseName }),
      async () => {
        try {
          console.log('=== DELETE EXERCISE START ===');
          console.log('exerciseId:', exerciseId);
          console.log('clientExercises BEFORE delete:', clientExercises.map(ex => ({ id: ex.exercise_id, name: ex.name })));
          
          // Удаляем локально
          const updatedExercises = clientExercises.filter((ex) => ex.exercise_id !== exerciseId);
          console.log('clientExercises AFTER delete:', updatedExercises.map(ex => ({ id: ex.exercise_id, name: ex.name })));
          setClientExercises(updatedExercises);
          
          // Помечаем как изменённое
          saveManager.markAsChanged();
          
          console.log('=== DELETE EXERCISE END ===');
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
        <BackButton onClick={onButtonBack} />
        
        <div className={styles.rightButtons}>
          <button
            className={`${styles.saveButton} ${!saveManager.hasUnsavedChanges ? styles.saveButtonDisabled : styles.saveButtonActive}`}
            type='button'
            onClick={() => saveManager.saveChanges(clientExercises, originalExercises)}
            disabled={!saveManager.hasUnsavedChanges || saveManager.isSaving}>
            {saveManager.isSaving ? t('editExercises.saving') : t('common.save')}
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
              onClick={addExerciseToClient}>
              <i className='icon ion-md-lock'></i>{t('common.add')}
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
                  <h4>{t('editExercises.categoryTitle', { name: category.name })}</h4>
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
