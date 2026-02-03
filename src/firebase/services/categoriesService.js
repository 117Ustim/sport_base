import { BaseService } from './baseService';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config';

// Начальные категории (как в PostgreSQL)
const DEFAULT_CATEGORIES = [
  { id: '1', name: 'Ноги' },
  { id: '2', name: 'Грудь' },
  { id: '3', name: 'Спина' },
  { id: '4', name: 'Плечі' },
  { id: '5', name: 'Руки' },
  { id: '6', name: 'Аеробне' },
  { id: '7', name: 'Общее' }
];

class CategoriesService extends BaseService {
  constructor() {
    super('categories');
  }

  // Переопределяем getAll для инициализации категорий
  async getAll() {
    try {
      const categories = await super.getAll();
      
      // Если категорий нет - инициализируем
      if (categories.length === 0) {
        await this.initCategories();
        return DEFAULT_CATEGORIES.map((cat, i) => ({
          ...cat,
          order: i,
          column: i % 2
        }));
      }
      
      // Проверяем, есть ли у категорий поле column
      const needsMigration = categories.some(cat => cat.column === undefined);
      
      if (needsMigration) {
        await this.migrateColumns(categories);
        // Перезагружаем после миграции
        const updatedCategories = await super.getAll();
        return this.sortCategories(updatedCategories);
      }
      
      return this.sortCategories(categories);
    } catch (error) {
      console.error('Error getting categories:', error);
      throw error;
    }
  }

  // Сортировка категорий
  sortCategories(categories) {
    const sortedCategories = categories.sort((a, b) => {
      const orderA = a.order !== undefined ? a.order : 999999;
      const orderB = b.order !== undefined ? b.order : 999999;
      return orderA - orderB;
    });
    
    return sortedCategories.map(cat => ({
      id: cat.id,
      name: cat.name,
      order: cat.order !== undefined ? cat.order : 999999,
      column: cat.column !== undefined ? cat.column : 0
    }));
  }

  // Миграция существующих категорий - добавление поля column
  async migrateColumns(categories) {
    try {
      const updatePromises = categories.map((category, index) => {
        const column = index % 2; // Четные в левую (0), нечетные в правую (1)
        return super.update(category.id, { 
          column: column,
          order: category.order !== undefined ? category.order : index
        });
      });
      
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error migrating categories:', error);
      throw error;
    }
  }

  // Инициализировать категории (один раз)
  async initCategories() {
    try {
      for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
        const category = DEFAULT_CATEGORIES[i];
        const docRef = doc(db, this.collectionName, category.id);
        await setDoc(docRef, { 
          name: category.name,
          order: i,
          column: i % 2 // 0 - левая колонка, 1 - правая колонка (четные слева, нечетные справа)
        });
      }
    } catch (error) {
      console.error('Error initializing categories:', error);
      throw error;
    }
  }

  // Создать новую категорию
  async createCategory(name) {
    try {
      const categories = await this.getAll();
      const newId = String(categories.length + 1);
      const docRef = doc(db, this.collectionName, newId);
      await setDoc(docRef, { name });
      return { id: newId, name };
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  // Обновить категорию
  async updateCategory(id, name) {
    try {
      await super.update(id, { name });
      return { id, name };
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  // Удалить категорию (наследуется от BaseService, но можно переопределить)
  async deleteCategory(id) {
    try {
      await super.delete(id);
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  // Обновить порядок и колонку категорий
  async updateOrder(categories) {
    try {
      // Обновляем порядок и колонку для каждой категории
      const updatePromises = categories.map((category) => {
        return super.update(category.id, { 
          order: category.order,
          column: category.column 
        });
      });
      
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error updating categories order:', error);
      throw error;
    }
  }
}

export const categoriesService = new CategoriesService();
