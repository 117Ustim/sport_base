// Тесты для categoriesService
import { categoriesService } from '../categoriesService';
import { BaseService } from '../baseService';
import { doc, setDoc } from 'firebase/firestore';

// Mock BaseService
jest.mock('../baseService');

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
  collection: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
}));

// Mock Firebase config
jest.mock('../../config', () => ({
  db: {},
}));

describe('categoriesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should initialize categories if none exist', async () => {
      BaseService.prototype.getAll = jest.fn().mockResolvedValue([]);
      doc.mockReturnValue('doc-ref');
      setDoc.mockResolvedValue();

      const result = await categoriesService.getAll();

      expect(BaseService.prototype.getAll).toHaveBeenCalled();
      expect(setDoc).toHaveBeenCalledTimes(7); // 7 default categories
      expect(result).toHaveLength(7);
      expect(result[0]).toEqual({
        id: '1',
        name: 'Ноги',
        order: 0,
        column: 0,
      });
      expect(result[1]).toEqual({
        id: '2',
        name: 'Грудь',
        order: 1,
        column: 1,
      });
    });

    it('should return existing categories sorted by order', async () => {
      const mockCategories = [
        { id: '3', name: 'Спина', order: 2, column: 0 },
        { id: '1', name: 'Ноги', order: 0, column: 0 },
        { id: '2', name: 'Грудь', order: 1, column: 1 },
      ];

      BaseService.prototype.getAll = jest.fn().mockResolvedValue(mockCategories);

      const result = await categoriesService.getAll();

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Ноги');
      expect(result[1].name).toBe('Грудь');
      expect(result[2].name).toBe('Спина');
    });

    it('should migrate categories without column field', async () => {
      const mockCategories = [
        { id: '1', name: 'Ноги', order: 0 },
        { id: '2', name: 'Грудь', order: 1 },
      ];

      const migratedCategories = [
        { id: '1', name: 'Ноги', order: 0, column: 0 },
        { id: '2', name: 'Грудь', order: 1, column: 1 },
      ];

      BaseService.prototype.getAll = jest.fn()
        .mockResolvedValueOnce(mockCategories)
        .mockResolvedValueOnce(migratedCategories);
      
      BaseService.prototype.update = jest.fn().mockResolvedValue();

      const result = await categoriesService.getAll();

      expect(BaseService.prototype.update).toHaveBeenCalledTimes(2);
      expect(BaseService.prototype.update).toHaveBeenCalledWith('1', { column: 0, order: 0 });
      expect(BaseService.prototype.update).toHaveBeenCalledWith('2', { column: 1, order: 1 });
      expect(result[0].column).toBe(0);
      expect(result[1].column).toBe(1);
    });

    it('should handle categories without order field', async () => {
      const mockCategories = [
        { id: '1', name: 'Ноги' },
        { id: '2', name: 'Грудь', order: 1, column: 1 },
      ];

      BaseService.prototype.getAll = jest.fn().mockResolvedValue(mockCategories);

      const result = await categoriesService.getAll();

      expect(result[0].order).toBe(1);
      expect(result[1].order).toBe(999999); // Default order for missing
    });

    it('should handle errors', async () => {
      BaseService.prototype.getAll = jest.fn().mockRejectedValue(new Error('Firestore error'));

      await expect(categoriesService.getAll()).rejects.toThrow('Firestore error');
    });
  });

  describe('sortCategories', () => {
    it('should sort categories by order', () => {
      const categories = [
        { id: '3', name: 'Третя', order: 2, column: 0 },
        { id: '1', name: 'Перша', order: 0, column: 0 },
        { id: '2', name: 'Друга', order: 1, column: 1 },
      ];

      const result = categoriesService.sortCategories(categories);

      expect(result[0].name).toBe('Перша');
      expect(result[1].name).toBe('Друга');
      expect(result[2].name).toBe('Третя');
    });

    it('should handle missing order field', () => {
      const categories = [
        { id: '1', name: 'З порядком', order: 0, column: 0 },
        { id: '2', name: 'Без порядку', column: 1 },
      ];

      const result = categoriesService.sortCategories(categories);

      expect(result[0].name).toBe('З порядком');
      expect(result[0].order).toBe(0);
      expect(result[1].name).toBe('Без порядку');
      expect(result[1].order).toBe(999999);
    });

    it('should handle missing column field', () => {
      const categories = [
        { id: '1', name: 'Без колонки', order: 0 },
      ];

      const result = categoriesService.sortCategories(categories);

      expect(result[0].column).toBe(0);
    });
  });

  describe('migrateColumns', () => {
    it('should add column field to categories', async () => {
      const categories = [
        { id: '1', name: 'Ноги', order: 0 },
        { id: '2', name: 'Грудь', order: 1 },
        { id: '3', name: 'Спина', order: 2 },
      ];

      BaseService.prototype.update = jest.fn().mockResolvedValue();

      await categoriesService.migrateColumns(categories);

      expect(BaseService.prototype.update).toHaveBeenCalledTimes(3);
      expect(BaseService.prototype.update).toHaveBeenCalledWith('1', { column: 0, order: 0 });
      expect(BaseService.prototype.update).toHaveBeenCalledWith('2', { column: 1, order: 1 });
      expect(BaseService.prototype.update).toHaveBeenCalledWith('3', { column: 0, order: 2 });
    });

    it('should handle categories without order', async () => {
      const categories = [
        { id: '1', name: 'Без порядку' },
        { id: '2', name: 'Теж без порядку' },
      ];

      BaseService.prototype.update = jest.fn().mockResolvedValue();

      await categoriesService.migrateColumns(categories);

      expect(BaseService.prototype.update).toHaveBeenCalledWith('1', { column: 0, order: 0 });
      expect(BaseService.prototype.update).toHaveBeenCalledWith('2', { column: 1, order: 1 });
    });

    it('should handle errors', async () => {
      const categories = [{ id: '1', name: 'Категорія' }];

      BaseService.prototype.update = jest.fn().mockRejectedValue(new Error('Firestore error'));

      await expect(categoriesService.migrateColumns(categories)).rejects.toThrow('Firestore error');
    });
  });

  describe('initCategories', () => {
    it('should initialize 7 default categories', async () => {
      categoriesService.collectionName = 'categories';
      doc.mockReturnValue('doc-ref');
      setDoc.mockResolvedValue();

      await categoriesService.initCategories();

      expect(setDoc).toHaveBeenCalledTimes(7);
      expect(setDoc).toHaveBeenCalledWith('doc-ref', {
        name: 'Ноги',
        order: 0,
        column: 0,
      });
      expect(setDoc).toHaveBeenCalledWith('doc-ref', {
        name: 'Грудь',
        order: 1,
        column: 1,
      });
    });

    it('should handle errors', async () => {
      categoriesService.collectionName = 'categories';
      doc.mockReturnValue('doc-ref');
      setDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(categoriesService.initCategories()).rejects.toThrow('Firestore error');
    });
  });

  describe('createCategory', () => {
    it('should create new category', async () => {
      const mockCategories = [
        { id: '1', name: 'Ноги' },
        { id: '2', name: 'Грудь' },
      ];

      BaseService.prototype.getAll = jest.fn().mockResolvedValue(mockCategories);
      
      // Mock collectionName
      categoriesService.collectionName = 'categories';
      
      doc.mockReturnValue('doc-ref');
      setDoc.mockResolvedValue();

      const result = await categoriesService.createCategory('Нова категорія');

      expect(doc).toHaveBeenCalledWith({}, 'categories', '3');
      expect(setDoc).toHaveBeenCalledWith('doc-ref', { name: 'Нова категорія' });
      expect(result).toEqual({
        id: '3',
        name: 'Нова категорія',
      });
    });

    it('should handle errors', async () => {
      BaseService.prototype.getAll = jest.fn().mockResolvedValue([]);
      categoriesService.collectionName = 'categories';
      doc.mockReturnValue('doc-ref');
      setDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(categoriesService.createCategory('Категорія')).rejects.toThrow('Firestore error');
    });
  });

  describe('updateCategory', () => {
    it('should update category name', async () => {
      BaseService.prototype.update = jest.fn().mockResolvedValue();

      const result = await categoriesService.updateCategory('1', 'Оновлена назва');

      expect(BaseService.prototype.update).toHaveBeenCalledWith('1', { name: 'Оновлена назва' });
      expect(result).toEqual({
        id: '1',
        name: 'Оновлена назва',
      });
    });

    it('should handle errors', async () => {
      BaseService.prototype.update = jest.fn().mockRejectedValue(new Error('Firestore error'));

      await expect(categoriesService.updateCategory('1', 'Назва')).rejects.toThrow('Firestore error');
    });
  });

  describe('deleteCategory', () => {
    it('should delete category', async () => {
      BaseService.prototype.delete = jest.fn().mockResolvedValue();

      await categoriesService.deleteCategory('1');

      expect(BaseService.prototype.delete).toHaveBeenCalledWith('1');
    });

    it('should handle errors', async () => {
      BaseService.prototype.delete = jest.fn().mockRejectedValue(new Error('Firestore error'));

      await expect(categoriesService.deleteCategory('1')).rejects.toThrow('Firestore error');
    });
  });

  describe('updateOrder', () => {
    it('should update order and column for multiple categories', async () => {
      const categories = [
        { id: '1', name: 'Перша', order: 0, column: 0 },
        { id: '2', name: 'Друга', order: 1, column: 1 },
        { id: '3', name: 'Третя', order: 2, column: 0 },
      ];

      BaseService.prototype.update = jest.fn().mockResolvedValue();

      await categoriesService.updateOrder(categories);

      expect(BaseService.prototype.update).toHaveBeenCalledTimes(3);
      expect(BaseService.prototype.update).toHaveBeenCalledWith('1', { order: 0, column: 0 });
      expect(BaseService.prototype.update).toHaveBeenCalledWith('2', { order: 1, column: 1 });
      expect(BaseService.prototype.update).toHaveBeenCalledWith('3', { order: 2, column: 0 });
    });

    it('should handle empty array', async () => {
      BaseService.prototype.update = jest.fn().mockResolvedValue();

      await categoriesService.updateOrder([]);

      expect(BaseService.prototype.update).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const categories = [{ id: '1', order: 0, column: 0 }];

      BaseService.prototype.update = jest.fn().mockRejectedValue(new Error('Firestore error'));

      await expect(categoriesService.updateOrder(categories)).rejects.toThrow('Firestore error');
    });
  });
});
