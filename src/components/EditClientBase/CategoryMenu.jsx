import { useState } from 'react';
import styles from './CategoryMenu.module.scss';

export default function CategoryMenu({ 
  categories, 
  onAddCategory, 
  onDeleteCategory,
  isOpen,
  onClose 
}) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteList, setShowDeleteList] = useState(false);

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName.trim());
      setNewCategoryName('');
      setShowAddForm(false);
    }
  };

  const handleDeleteCategory = (categoryId, categoryName) => {
    if (window.confirm(`Ви впевнені, що хочете видалити категорію "${categoryName}"?`)) {
      onDeleteCategory(categoryId);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.menu}>
        <div className={styles.menuHeader}>
          <h3>Керування категоріями</h3>
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
              }}
            >
              <span className={styles.icon}>+</span>
              Додати категорію
            </button>

            {showAddForm && (
              <div className={styles.addForm}>
                <input
                  type="text"
                  placeholder="Назва категорії"
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
                    Зберегти
                  </button>
                  <button 
                    className={styles.cancelButton}
                    onClick={() => {
                      setShowAddForm(false);
                      setNewCategoryName('');
                    }}
                  >
                    Скасувати
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Удалить категорию */}
          <div className={styles.menuSection}>
            <button 
              className={styles.menuButton}
              onClick={() => {
                setShowDeleteList(!showDeleteList);
                setShowAddForm(false);
              }}
            >
              <span className={styles.icon}>−</span>
              Видалити категорію
            </button>

            {showDeleteList && (
              <div className={styles.deleteList}>
                {categories.length === 0 ? (
                  <p className={styles.emptyMessage}>Немає категорій для видалення</p>
                ) : (
                  categories.map((category) => (
                    <div key={category.id} className={styles.categoryItem}>
                      <span>{category.name}</span>
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDeleteCategory(category.id, category.name)}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
