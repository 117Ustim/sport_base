// Тесты для exercisesService
import { exercisesService } from '../exercisesService';
import { BaseService } from '../baseService';
import { where } from 'firebase/firestore';

// Mock BaseService
jest.mock('../baseService');

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  where: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
}));

// Mock Firebase config
jest.mock('../../config', () => ({
  db: {},
}));

describe('exercisesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getBySex', () => {
    it('should get exercises by sex (male)', async () => {
      const mockExercises = [
        { id: '1', name: 'Жим лежа', sex: 'Чоловік', categoryId: 'cat1' },
        { id: '2', name: 'Присідання', sex: 'Чоловік', categoryId: 'cat2' },
      ];

      // Mock the query method to return exercises
      exercisesService.query = jest.fn().mockResolvedValue(mockExercises);
      where.mockReturnValue('where-constraint');

      const result = await exercisesService.getBySex('Чоловік');

      expect(where).toHaveBeenCalledWith('sex', '==', 'Чоловік');
      expect(exercisesService.query).toHaveBeenCalledWith(['where-constraint']);
      expect(result).toEqual(mockExercises);
      expect(result).toHaveLength(2);
    });

    it('should get exercises by sex (female)', async () => {
      const mockExercises = [
        { id: '3', name: 'Випади', sex: 'Жінка', categoryId: 'cat3' },
      ];

      exercisesService.query = jest.fn().mockResolvedValue(mockExercises);
      where.mockReturnValue('where-constraint');

      const result = await exercisesService.getBySex('Жінка');

      expect(where).toHaveBeenCalledWith('sex', '==', 'Жінка');
      expect(result).toEqual(mockExercises);
      expect(result).toHaveLength(1);
    });

    it('should return empty array if no exercises found', async () => {
      exercisesService.query = jest.fn().mockResolvedValue([]);
      where.mockReturnValue('where-constraint');

      const result = await exercisesService.getBySex('Чоловік');

      expect(result).toEqual([]);
    });

    it('should handle errors', async () => {
      exercisesService.query = jest.fn().mockRejectedValue(new Error('Firestore error'));
      where.mockReturnValue('where-constraint');

      await expect(exercisesService.getBySex('Чоловік')).rejects.toThrow('Firestore error');
    });
  });

  describe('create', () => {
    it('should create exercise with all fields', async () => {
      const exerciseData = {
        name: 'Жим лежа',
        categoryId: 'cat1',
        clientId: 'client1',
        order: 5,
      };

      // Mock parent create method
      BaseService.prototype.create = jest.fn().mockResolvedValue('new-id-123');

      const result = await exercisesService.create(exerciseData);

      expect(BaseService.prototype.create).toHaveBeenCalledWith({
        name: 'Жим лежа',
        categoryId: 'cat1',
        clientId: 'client1',
        order: 5,
      });
      expect(result).toEqual({
        id: 'new-id-123',
        ...exerciseData,
      });
    });

    it('should create exercise without clientId', async () => {
      const exerciseData = {
        name: 'Присідання',
        categoryId: 'cat2',
      };

      BaseService.prototype.create = jest.fn().mockResolvedValue('new-id-456');

      const result = await exercisesService.create(exerciseData);

      expect(BaseService.prototype.create).toHaveBeenCalledWith({
        name: 'Присідання',
        categoryId: 'cat2',
      });
      expect(result.id).toBe('new-id-456');
      expect(result.clientId).toBeUndefined();
    });

    it('should create exercise without order', async () => {
      const exerciseData = {
        name: 'Тяга',
        categoryId: 'cat3',
        clientId: 'client2',
      };

      BaseService.prototype.create = jest.fn().mockResolvedValue('new-id-789');

      const result = await exercisesService.create(exerciseData);

      expect(BaseService.prototype.create).toHaveBeenCalledWith({
        name: 'Тяга',
        categoryId: 'cat3',
        clientId: 'client2',
      });
      expect(result.order).toBeUndefined();
    });

    it('should create exercise with order 0', async () => {
      const exerciseData = {
        name: 'Розминка',
        categoryId: 'cat1',
        order: 0,
      };

      BaseService.prototype.create = jest.fn().mockResolvedValue('new-id-000');

      const result = await exercisesService.create(exerciseData);

      expect(BaseService.prototype.create).toHaveBeenCalledWith({
        name: 'Розминка',
        categoryId: 'cat1',
        order: 0,
      });
      expect(result.order).toBe(0);
    });

    it('should handle errors', async () => {
      const exerciseData = {
        name: 'Жим',
        categoryId: 'cat1',
      };

      BaseService.prototype.create = jest.fn().mockRejectedValue(new Error('Firestore error'));

      await expect(exercisesService.create(exerciseData)).rejects.toThrow('Firestore error');
    });
  });

  describe('updateOrder', () => {
    it('should update order for multiple exercises', async () => {
      const exercises = [
        { id: '1', name: 'Перше', order: 0 },
        { id: '2', name: 'Друге', order: 1 },
        { id: '3', name: 'Третє', order: 2 },
      ];

      BaseService.prototype.update = jest.fn().mockResolvedValue();

      await exercisesService.updateOrder(exercises);

      expect(BaseService.prototype.update).toHaveBeenCalledTimes(3);
      expect(BaseService.prototype.update).toHaveBeenNthCalledWith(1, '1', { order: 0 });
      expect(BaseService.prototype.update).toHaveBeenNthCalledWith(2, '2', { order: 1 });
      expect(BaseService.prototype.update).toHaveBeenNthCalledWith(3, '3', { order: 2 });
    });

    it('should update order for single exercise', async () => {
      const exercises = [
        { id: '1', name: 'Єдине', order: 0 },
      ];

      BaseService.prototype.update = jest.fn().mockResolvedValue();

      await exercisesService.updateOrder(exercises);

      expect(BaseService.prototype.update).toHaveBeenCalledTimes(1);
      expect(BaseService.prototype.update).toHaveBeenCalledWith('1', { order: 0 });
    });

    it('should handle empty array', async () => {
      BaseService.prototype.update = jest.fn().mockResolvedValue();

      await exercisesService.updateOrder([]);

      expect(BaseService.prototype.update).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const exercises = [
        { id: '1', name: 'Перше', order: 0 },
      ];

      BaseService.prototype.update = jest.fn().mockRejectedValue(new Error('Firestore error'));

      await expect(exercisesService.updateOrder(exercises)).rejects.toThrow('Firestore error');
    });
  });

  describe('getAll', () => {
    it('should get all exercises sorted by order', async () => {
      const mockExercises = [
        { id: '3', name: 'Третє', order: 2 },
        { id: '1', name: 'Перше', order: 0 },
        { id: '2', name: 'Друге', order: 1 },
      ];

      BaseService.prototype.getAll = jest.fn().mockResolvedValue(mockExercises);

      const result = await exercisesService.getAll();

      expect(BaseService.prototype.getAll).toHaveBeenCalled();
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Перше');
      expect(result[1].name).toBe('Друге');
      expect(result[2].name).toBe('Третє');
    });

    it('should handle exercises without order field', async () => {
      const mockExercises = [
        { id: '1', name: 'З порядком', order: 0 },
        { id: '2', name: 'Без порядку' },
        { id: '3', name: 'Теж без порядку' },
      ];

      BaseService.prototype.getAll = jest.fn().mockResolvedValue(mockExercises);

      const result = await exercisesService.getAll();

      // Упражнение с order=0 должно быть первым
      expect(result[0].name).toBe('З порядком');
      // Упражнения без order должны быть в конце
      expect(result[1].name).toBe('Без порядку');
      expect(result[2].name).toBe('Теж без порядку');
    });

    it('should handle mixed order values', async () => {
      const mockExercises = [
        { id: '1', name: 'Без порядку' },
        { id: '2', name: 'Порядок 5', order: 5 },
        { id: '3', name: 'Порядок 1', order: 1 },
        { id: '4', name: 'Порядок 10', order: 10 },
      ];

      BaseService.prototype.getAll = jest.fn().mockResolvedValue(mockExercises);

      const result = await exercisesService.getAll();

      expect(result[0].name).toBe('Порядок 1');
      expect(result[1].name).toBe('Порядок 5');
      expect(result[2].name).toBe('Порядок 10');
      expect(result[3].name).toBe('Без порядку');
    });

    it('should handle empty array', async () => {
      BaseService.prototype.getAll = jest.fn().mockResolvedValue([]);

      const result = await exercisesService.getAll();

      expect(result).toEqual([]);
    });

    it('should handle errors', async () => {
      BaseService.prototype.getAll = jest.fn().mockRejectedValue(new Error('Firestore error'));

      await expect(exercisesService.getAll()).rejects.toThrow('Firestore error');
    });
  });
});
