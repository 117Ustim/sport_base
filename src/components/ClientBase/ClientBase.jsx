import { clientBaseService, categoriesService, clientsService } from "../../firebase/services";
import BaseExercisesOut from "./BaseExercisesOut";
import { NUMBER_TIMES } from '../../constants';
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import Notification from '../Notification';
import ConfirmDialog from '../ConfirmDialog';
import styles from './ClientBase.module.scss';

export default function ClientBase() {
  const params = useParams();
  const navigate = useNavigate();

  const [exercisesArray, setExercisesArray] = useState([]);
  const [categories, setCategories] = useState([]);
  const [columns, setColumns] = useState([]);
  const [newColumnName, setNewColumnName] = useState('');
  const [deleteMode, setDeleteMode] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingBase, setIsCreatingBase] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasCategoryOrderChanges, setHasCategoryOrderChanges] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const { notification, showNotification } = useNotification();
  const { confirmDialog, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();
  
  const exercisesRef = useRef(exercisesArray);
  const columnsRef = useRef(columns);
  
  useEffect(() => {
    exercisesRef.current = exercisesArray;
    columnsRef.current = columns;
  }, [exercisesArray, columns]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    categoriesService.getAll().then(setCategories);

    clientsService.getById(params.id).then((client) => {
      if (client?.data) {
        const fullName = `${client.data.surname} ${client.data.name}`;
        setClientName(fullName);
      }
    });

    Promise.all([
      clientBaseService.getByClientId(params.id),
      clientBaseService.getMetadata(params.id)
    ]).then(([exercises, metadata]) => {
      setExercisesArray(exercises);
      
      if (metadata.columns && Array.isArray(metadata.columns)) {
        setColumns(metadata.columns);
      } else {
        const columnCount = metadata.columnCount || NUMBER_TIMES;
        const defaultColumns = Array.from({ length: columnCount }, (_, i) => ({
          id: i,
          name: String(i + 1)
        }));
        setColumns(defaultColumns);
      }
    });
  }, [params.id]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        saveBaseSync();
        e.preventDefault();
        e.returnValue = '';
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && hasUnsavedChanges) {
        saveBaseSync();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (hasUnsavedChanges) {
        saveBaseSync();
      }
    };
  }, [hasUnsavedChanges]);

  const saveBaseSync = () => {
    if (!params.id || exercisesRef.current.length === 0) return;
    
    clientBaseService.updateBase(params.id, exercisesRef.current, columnsRef.current)
      .then(() => setHasUnsavedChanges(false))
      .catch((error) => console.error('Auto-save failed:', error));
  };

  const backPlanClient = () => {
    const name = clientName || 'Client';
    navigate(`/plan_client/${params.id}/${name}`);
  };

  const openEditModal = () => {
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setDeleteMode(false);
  };

  const editExercises = () => {
    navigate(`/edit_client_exercises/${params.id}`);
  };

  const createBase = async () => {
    // Проверка: если база уже создана (есть упражнения), показываем предупреждение
    if (exercisesArray.length > 0) {
      showNotification('База вже створена! Використовуйте "Редагувати вправи" для змін.', 'error');
      return;
    }

    setIsCreatingBase(true);
    
    try {
      await clientBaseService.createBase(params.id);
      await categoriesService.getAll().then(setCategories);
      
      const [exercises, metadata] = await Promise.all([
        clientBaseService.getByClientId(params.id),
        clientBaseService.getMetadata(params.id)
      ]);
      
      setExercisesArray(exercises);
      
      if (metadata.columns && Array.isArray(metadata.columns)) {
        setColumns(metadata.columns);
      } else {
        const columnCount = metadata.columnCount || NUMBER_TIMES;
        const defaultColumns = Array.from({ length: columnCount }, (_, i) => ({
          id: i,
          name: String(i + 1)
        }));
        setColumns(defaultColumns);
      }
      
      showNotification('База успішно створена!', 'success');
    } catch (error) {
      console.error('Error creating base:', error);
      showNotification('Помилка створення бази', 'error');
    } finally {
      setIsCreatingBase(false);
    }
  };

  const saveBase = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      await clientBaseService.updateBase(params.id, exercisesArray, columns);
      setHasUnsavedChanges(false);
      showNotification('Збережено успішно!', 'success');
    } catch (error) {
      console.error('Error saving base:', error);
      showNotification('Помилка збереження. Спробуйте ще раз.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const addColumn = () => {
    const columnName = newColumnName.trim() || String(columns.length + 1);
    const newColumnId = columns.length > 0 ? Math.max(...columns.map(c => c.id)) + 1 : 0;
    const newColumn = {
      id: newColumnId,
      name: columnName
    };
    
    const updatedColumns = [...columns, newColumn];
    setColumns(updatedColumns);
    
    const updatedExercises = exercisesArray.map((exercise) => ({
      ...exercise,
      data: {
        ...exercise.data,
        [newColumnId]: ''
      }
    }));
    
    setExercisesArray(updatedExercises);
    setNewColumnName('');
    setHasUnsavedChanges(true);
    showNotification(`Колонка "${columnName}" додана`, 'success');
  };

  const toggleDeleteMode = () => {
    setDeleteMode(!deleteMode);
  };

  const deleteColumn = (columnId) => {
    if (!deleteMode) return;
    
    if (columns.length <= 1) {
      showNotification('Нельзя удалить последнюю колонку', 'error');
      return;
    }

    const columnToDelete = columns.find(c => c.id === columnId);
    
    showConfirm(
      `Ви впевнені, що хочете видалити колонку "${columnToDelete.name}"?`,
      () => {
        const updatedColumns = columns.filter(c => c.id !== columnId);
        setColumns(updatedColumns);
        
        const updatedExercises = exercisesArray.map((exercise) => {
          const newData = { ...exercise.data };
          delete newData[columnId];
          
          return {
            ...exercise,
            data: newData
          };
        });
        
        setExercisesArray(updatedExercises);
        setDeleteMode(false);
        setHasUnsavedChanges(true);
        showNotification(`Колонка "${columnToDelete.name}" видалена`, 'success');
      }
    );
  };

  const onChangeBase = (value, exerciseId, key) => {
    const oldValue = [...exercisesArray];
    const oldExerciseIndex = oldValue.findIndex((e) => e.exercise_id === exerciseId);
    const temp = oldValue[oldExerciseIndex];
    const newValue = { ...temp, data: { ...temp.data, [key]: value } };
    oldValue.splice(oldExerciseIndex, 1, newValue);
    setExercisesArray(oldValue);
    setHasUnsavedChanges(true);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    setCategories((items) => {
      const activeCategory = items.find(item => item.id === activeId);
      const overCategory = items.find(item => item.id === overId);

      if (!activeCategory || !overCategory) return items;

      const activeColumn = activeCategory.column;
      const overColumn = overCategory.column;

      // Если перетаскиваем в другую колонку
      if (activeColumn !== overColumn) {
        const leftColumn = items.filter(item => item.column === 0);
        const rightColumn = items.filter(item => item.column === 1);
        
        const sourceColumn = activeColumn === 0 ? leftColumn : rightColumn;
        const targetColumn = overColumn === 0 ? leftColumn : rightColumn;

        // Удаляем из исходной колонки
        const newSourceColumn = sourceColumn.filter(item => item.id !== activeId);
        
        // Находим позицию в целевой колонке
        const targetIndex = targetColumn.findIndex(item => item.id === overId);
        
        // Вставляем в целевую колонку
        const updatedActiveCategory = {
          ...activeCategory,
          column: overColumn
        };
        
        const newTargetColumn = [
          ...targetColumn.slice(0, targetIndex),
          updatedActiveCategory,
          ...targetColumn.slice(targetIndex)
        ];

        // Обновляем order для обеих колонок
        const updatedSourceColumn = newSourceColumn.map((item, index) => ({
          ...item,
          order: index
        }));

        const updatedTargetColumn = newTargetColumn.map((item, index) => ({
          ...item,
          order: index
        }));

        // Собираем обратно
        const result = activeColumn === 0
          ? [...updatedSourceColumn, ...updatedTargetColumn]
          : [...updatedTargetColumn, ...updatedSourceColumn];

        return result;
      }

      return items;
    });
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    setCategories((items) => {
      const activeCategory = items.find(item => item.id === activeId);
      const overCategory = items.find(item => item.id === overId);

      if (!activeCategory || !overCategory) return items;

      const activeColumn = activeCategory.column;
      const overColumn = overCategory.column;

      // Разделяем категории по колонкам
      const leftColumn = items.filter(item => item.column === 0);
      const rightColumn = items.filter(item => item.column === 1);

      // Если перетаскиваем в ту же колонку
      if (activeColumn === overColumn) {
        const columnItems = activeColumn === 0 ? leftColumn : rightColumn;
        const oldIndex = columnItems.findIndex(item => item.id === activeId);
        const newIndex = columnItems.findIndex(item => item.id === overId);

        // Перемещаем внутри колонки
        const reorderedColumn = arrayMove(columnItems, oldIndex, newIndex);
        
        // Обновляем order для элементов в этой колонке
        const updatedColumn = reorderedColumn.map((item, index) => ({
          ...item,
          order: index
        }));

        // Собираем обратно все категории
        const otherColumn = activeColumn === 0 ? rightColumn : leftColumn;
        const result = activeColumn === 0 
          ? [...updatedColumn, ...otherColumn]
          : [...otherColumn, ...updatedColumn];

        return result;
      }

      // Если перетаскиваем в другую колонку - уже обработано в handleDragOver
      return items;
    });

    setHasCategoryOrderChanges(true);
  };

  // Сохранить порядок категорий на сервер
  const saveCategoryOrder = async () => {
    if (!hasCategoryOrderChanges) {
      return;
    }

    setIsSavingOrder(true);
    try {
      await categoriesService.updateOrder(categories);
      setHasCategoryOrderChanges(false);
      showNotification('Порядок категорій успішно збережено', 'success');
    } catch (error) {
      console.error('Помилка збереження порядку категорій:', error);
      showNotification('Помилка збереження порядку категорій', 'error');
    } finally {
      setIsSavingOrder(false);
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
      <div className={styles.buttonPanel}>
        <div className={styles.leftButtons}>
          <button className={styles.button} onClick={backPlanClient}>Назад</button>
          <button 
            className={styles.saveBtn} 
            onClick={saveBase}
            disabled={isSaving}
          >
            {isSaving && (
              <span className={styles.spinner}></span>
            )}
            {isSaving ? 'Збереження...' : 'Сохранить'}
            {hasUnsavedChanges && !isSaving && ' *'}
          </button>
        </div>
        <div className={styles.rightButtons}>
          <button 
            className={styles.button} 
            onClick={createBase}
            disabled={isCreatingBase}
          >
            {isCreatingBase && (
              <span className={styles.spinner}></span>
            )}
            {isCreatingBase ? 'Створення...' : 'Создать базу'}
          </button>
          <button className={styles.button} onClick={openEditModal}>Редагування</button>
        </div>
      </div>

      {deleteMode && (
        <div className={styles.deleteModeHint}>
          Кликните на номер колонки, которую хотите удалить
        </div>
      )}

      <div className={`${styles.editSidebar} ${showEditModal ? styles.open : ''}`}>
        <div className={styles.sidebarHeader}>
          <h3>Редагування</h3>
          <button className={styles.closeBtn} onClick={closeEditModal}>×</button>
        </div>
        <div className={styles.sidebarContent}>
          <div className={styles.sidebarButtons}>
            <div className={styles.addColumnSection}>
              <input
                type="text"
                className={styles.columnNameInput}
                placeholder="Назва колонки (необов'язково)"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addColumn()}
              />
              <button onClick={addColumn}>+ Добавить колонку</button>
            </div>
            <button 
              className={deleteMode ? styles.deleteModeActive : ''} 
              onClick={toggleDeleteMode}
            >
              {deleteMode ? 'Отменить удаление' : '- Удалить колонку'}
            </button>
            <button onClick={editExercises}>
              Редагувати вправи
            </button>
            <button 
              className={hasCategoryOrderChanges ? styles.saveCategoryBtn : ''}
              onClick={saveCategoryOrder}
              disabled={!hasCategoryOrderChanges || isSavingOrder}
            >
              {isSavingOrder ? 'Збереження...' : 'Зберегти позицію'}
              {hasCategoryOrderChanges && !isSavingOrder && ' *'}
            </button>
          </div>
          {deleteMode && (
            <div className={styles.sidebarHint}>
              Кликните на название колонки в таблице, которую хотите удалить
            </div>
          )}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        {exercisesArray.length > 0 ? (
          <div className={styles.categoriesGrid}>
            <div className={styles.categoryColumn} data-column="0">
              <SortableContext
                items={categories.filter(c => c.column === 0).map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                {categories
                  .filter(c => c.column === 0)
                  .sort((a, b) => a.order - b.order)
                  .map((category) => (
                    <SortableCategory
                      key={category.id}
                      category={category}
                      exercisesArray={exercisesArray}
                      onChangeBase={onChangeBase}
                      columns={columns}
                      deleteMode={deleteMode}
                      deleteColumn={deleteColumn}
                    />
                  ))}
              </SortableContext>
            </div>
            
            <div className={styles.categoryColumn} data-column="1">
              <SortableContext
                items={categories.filter(c => c.column === 1).map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                {categories
                  .filter(c => c.column === 1)
                  .sort((a, b) => a.order - b.order)
                  .map((category) => (
                    <SortableCategory
                      key={category.id}
                      category={category}
                      exercisesArray={exercisesArray}
                      onChangeBase={onChangeBase}
                      columns={columns}
                      deleteMode={deleteMode}
                      deleteColumn={deleteColumn}
                    />
                  ))}
              </SortableContext>
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>Натисніть "Создать базу" щоб почати</p>
          </div>
        )}
      </DndContext>
    </>
  );
}

function SortableCategory({ category, exercisesArray, onChangeBase, columns, deleteMode, deleteColumn }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const categoryExercises = exercisesArray.filter(
    (exercise) => exercise.category_id === category.id
  );

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`${styles.categoryWrapper} ${isDragging ? styles.dragging : ''}`}
    >
      <div 
        {...attributes} 
        {...listeners} 
        className={styles.categoryHeader}
      >
        <h2>{category.name}</h2>
      </div>
      <div className={styles.tableContainer}>
        <table className={styles.exerciseTable}>
          <thead>
            <tr>
              <th>Упражнение</th>
              {columns.map((column) => (
                <th 
                  className={`${styles.numCol} ${deleteMode ? styles.deleteMode : ''}`}
                  key={column.id}
                  onClick={() => deleteMode && deleteColumn(column.id)}
                  title={deleteMode ? `Удалить колонку "${column.name}"` : column.name}
                >
                  {column.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categoryExercises.map((row) => (
              <BaseExercisesOut 
                data={row} 
                saveBase={onChangeBase} 
                key={row.exercise_id}
                columns={columns}
              /> 
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
