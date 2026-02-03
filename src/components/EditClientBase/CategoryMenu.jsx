import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './CategoryMenu.module.scss';
import ConfirmDialog from '../ConfirmDialog';

export default function CategoryMenu({ 
  categories, 
  onAddCategory, 
  onDeleteCategory,
  onUpdateCategory,
  isOpen,
  onClose 
}) {
  const { t } = useTranslation();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteList, setShowDeleteList] = useState(false);
  const [showEditList, setShowEditList] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    message: '',
    categoryId: null,
    categoryName: ''
  });

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName.trim());
      setNewCategoryName('');
      setShowAddForm(false);
    }
  };

  const handleDeleteCategory = (categoryId, categoryName) => {
    setConfirmDialog({
      isOpen: true,
      message: t('editBase.confirmDeleteCategory', { name: categoryName }),
      categoryId,
      categoryName
    });
  };

  const handleEditCategory = (categoryId, categoryName) => {
    setEditingCategory(categoryId);
    setEditCategoryName(categoryName);
  };

  const handleUpdateCategory = () => {
    if (editCategoryName.trim() && editingCategory) {
      onUpdateCategory(editingCategory, editCategoryName.trim());
      setEditingCategory(null);
      setEditCategoryName('');
    }
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setEditCategoryName('');
  };

  const confirmDelete = () => {
    onDeleteCategory(confirmDialog.categoryId);
    setConfirmDialog({
      isOpen: false,
      message: '',
      categoryId: null,
      categoryName: ''
    });
  };

  const cancelDelete = () => {
    setConfirmDialog({
      isOpen: false,
      message: '',
      categoryId: null,
      categoryName: ''
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.menu}>
        <div className={styles.menuHeader}>
          <h3>{t('editBase.manageCategories')}</h3>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.menuContent}>
          {/* Добавить категорию */}
          <div className={styles.menuSection}>
            <button 
              className={styles.menuButton}
              onClick={() => {
                setShowAddForm(!showAddForm);
                setShowDeleteList(false);
                setShowEditList(false);
              }}
            >
              <span className={styles.icon}>+</span>
              {t('editBase.addCategory')}
            </button>

            {showAddForm && (
              <div className={styles.addForm}>
                <input
                  type="text"
                  placeholder={t('editBase.categoryNamePlaceholder')}
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                  autoFocus
                />
                <div className={styles.formButtons}>
                  <button 
                    className={styles.saveButton}
                    onClick={handleAddCategory}
                    disabled={!newCategoryName.trim()}
                  >
                    {t('common.save')}
                  </button>
                  <button 
                    className={styles.cancelButton}
                    onClick={() => {
                      setShowAddForm(false);
                      setNewCategoryName('');
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Удалить категорию */}
          <div className={styles.menuSection}>
            <button 
              className={`${styles.menuButton} ${styles.deleteMenuButton}`}
              onClick={() => {
                setShowDeleteList(!showDeleteList);
                setShowAddForm(false);
                setShowEditList(false);
              }}
            >
              <span className={styles.icon}>−</span>
              {t('editBase.deleteCategory')}
            </button>

            {showDeleteList && (
              <div className={styles.deleteList}>
                <h4>{t('editBase.categoriesList')}</h4>
                {categories.length === 0 ? (
                  <div className={styles.emptyMessage}>
                    <p>{t('editBase.noCategoriesToDelete')}</p>
                    <p>{t('editBase.addCategoriesFirst')}</p>
                  </div>
                ) : (
                  categories.map((category) => (
                    <div key={category.id} className={styles.categoryItem}>
                      <span>{category.name}</span>
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDeleteCategory(category.id, category.name)}
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Редактировать категории */}
          <div className={styles.menuSection}>
            <button 
              className={styles.menuButton}
              onClick={() => {
                setShowEditList(!showEditList);
                setShowAddForm(false);
                setShowDeleteList(false);
              }}
            >
              <span className={styles.icon}>✓</span>
              {t('editBase.editCategory')}
            </button>

            {showEditList && (
              <div className={styles.editList}>
                <h4>{t('editBase.categoriesList')}</h4>
                {categories.length === 0 ? (
                  <div className={styles.emptyMessage}>
                    <p>{t('editBase.noCategoriesToEdit')}</p>
                    <p>{t('editBase.addCategoriesFirst')}</p>
                  </div>
                ) : (
                  categories.map((category) => (
                    <div key={category.id} className={styles.categoryItem}>
                      {editingCategory === category.id ? (
                        <div className={styles.editForm}>
                          <input
                            type="text"
                            value={editCategoryName}
                            onChange={(e) => setEditCategoryName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleUpdateCategory()}
                            autoFocus
                            className={styles.editInput}
                          />
                          <div className={styles.editButtons}>
                            <button
                              className={styles.saveButton}
                              onClick={handleUpdateCategory}
                              disabled={!editCategoryName.trim()}
                            >
                              {t('common.save')}
                            </button>
                            <button
                              className={styles.cancelButton}
                              onClick={cancelEdit}
                            >
                              {t('common.cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <span>{category.name}</span>
                          <button
                            className={styles.editButton}
                            onClick={() => handleEditCategory(category.id, category.name)}
                          >
                            {t('editBase.editCategoryName')}
                          </button>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        message={confirmDialog.message}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </>
  );
}
