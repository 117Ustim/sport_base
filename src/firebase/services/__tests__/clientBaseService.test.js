// Тесты для clientBaseService
import { clientBaseService } from '../clientBaseService';
import { exercisesService } from '../exercisesService';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  getDoc,
  deleteDoc,
} from 'firebase/firestore';

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  deleteDoc: jest.fn(),
}));

// Mock Firebase config
jest.mock('../../config', () => ({
  db: {},
}));

// Mock exercisesService
jest.mock('../exercisesService', () => ({
  exercisesService: {
    getAll: jest.fn(),
  },
}));

describe('clientBaseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMetadata', () => {
    it('should get metadata if exists', async () => {
      const mockMetadata = {
        columnCount: 20,
      };

      const mockSnapshot = {
        exists: () => true,
        data: () => mockMetadata,
      };

      doc.mockReturnValue('metadata-ref');
      getDoc.mockResolvedValue(mockSnapshot);

      const result = await clientBaseService.getMetadata('client123');

      expect(doc).toHaveBeenCalledWith({}, 'clientBases', 'client123', 'metadata', 'settings');
      expect(result).toEqual(mockMetadata);
    });

    it('should return default metadata if not exists', async () => {
      const mockSnapshot = {
        exists: () => false,
      };

      doc.mockReturnValue('metadata-ref');
      getDoc.mockResolvedValue(mockSnapshot);

      const result = await clientBaseService.getMetadata('client123');

      expect(result).toEqual({ columnCount: 15 });
    });

    it('should return default metadata on error', async () => {
      doc.mockReturnValue('metadata-ref');
      getDoc.mockRejectedValue(new Error('Firestore error'));

      const result = await clientBaseService.getMetadata('client123');

      expect(result).toEqual({ columnCount: 15 });
    });
  });

  describe('saveMetadata', () => {
    it('should save metadata', async () => {
      const metadata = { columnCount: 20 };

      doc.mockReturnValue('metadata-ref');
      setDoc.mockResolvedValue();

      const result = await clientBaseService.saveMetadata('client123', metadata);

      expect(doc).toHaveBeenCalledWith({}, 'clientBases', 'client123', 'metadata', 'settings');
      expect(setDoc).toHaveBeenCalledWith('metadata-ref', metadata, { merge: true });
      expect(result).toBe(true);
    });

    it('should handle errors', async () => {
      doc.mockReturnValue('metadata-ref');
      setDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(clientBaseService.saveMetadata('client123', {})).rejects.toThrow('Firestore error');
    });
  });

  describe('getByClientId', () => {
    it('should get client base exercises sorted by order', async () => {
      const mockDocs = [
        {
          id: 'ex3',
          data: () => ({
            name: 'Третє',
            categoryId: 'cat1',
            data: { col1: 'value3' },
            order: 2,
          }),
        },
        {
          id: 'ex1',
          data: () => ({
            name: 'Перше',
            categoryId: 'cat1',
            data: { col1: 'value1' },
            order: 0,
          }),
        },
        {
          id: 'ex2',
          data: () => ({
            name: 'Друге',
            categoryId: 'cat2',
            data: { col1: 'value2' },
            order: 1,
          }),
        },
      ];

      collection.mockReturnValue('exercises-ref');
      getDocs.mockResolvedValue({ docs: mockDocs });

      const result = await clientBaseService.getByClientId('client123');

      expect(collection).toHaveBeenCalledWith({}, 'clientBases', 'client123', 'exercises');
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Перше');
      expect(result[1].name).toBe('Друге');
      expect(result[2].name).toBe('Третє');
    });

    it('should handle exercises without order field', async () => {
      const mockDocs = [
        {
          id: 'ex1',
          data: () => ({
            name: 'Без порядку',
            categoryId: 'cat1',
            data: {},
          }),
        },
      ];

      collection.mockReturnValue('exercises-ref');
      getDocs.mockResolvedValue({ docs: mockDocs });

      const result = await clientBaseService.getByClientId('client123');

      expect(result[0].order).toBe(999999);
    });

    it('should handle empty base', async () => {
      collection.mockReturnValue('exercises-ref');
      getDocs.mockResolvedValue({ docs: [] });

      const result = await clientBaseService.getByClientId('client123');

      expect(result).toEqual([]);
    });

    it('should handle errors', async () => {
      collection.mockReturnValue('exercises-ref');
      getDocs.mockRejectedValue(new Error('Firestore error'));

      await expect(clientBaseService.getByClientId('client123')).rejects.toThrow('Firestore error');
    });
  });

  describe('createBase', () => {
    it('should create base with all exercises', async () => {
      const mockExercises = [
        { id: 'ex1', name: 'Жим', categoryId: 'cat1', order: 0 },
        { id: 'ex2', name: 'Присід', categoryId: 'cat2', order: 1 },
      ];

      exercisesService.getAll.mockResolvedValue(mockExercises);
      doc.mockReturnValue('doc-ref');
      setDoc.mockResolvedValue();

      const result = await clientBaseService.createBase('client123');

      expect(exercisesService.getAll).toHaveBeenCalled();
      expect(setDoc).toHaveBeenCalledTimes(3); // 2 exercises + 1 metadata
      expect(setDoc).toHaveBeenCalledWith('doc-ref', {
        name: 'Жим',
        categoryId: 'cat1',
        data: {},
        order: 0,
      });
      expect(result).toBe(true);
    });

    it('should handle exercises without order', async () => {
      const mockExercises = [
        { id: 'ex1', name: 'Жим', categoryId: 'cat1' },
      ];

      exercisesService.getAll.mockResolvedValue(mockExercises);
      doc.mockReturnValue('doc-ref');
      setDoc.mockResolvedValue();

      await clientBaseService.createBase('client123');

      expect(setDoc).toHaveBeenCalledWith('doc-ref', {
        name: 'Жим',
        categoryId: 'cat1',
        data: {},
        order: 999999,
      });
    });

    it('should handle errors', async () => {
      exercisesService.getAll.mockRejectedValue(new Error('Firestore error'));

      await expect(clientBaseService.createBase('client123')).rejects.toThrow('Firestore error');
    });
  });

  describe('updateBase', () => {
    it('should update exercises and metadata', async () => {
      const exercises = [
        {
          exercise_id: 'ex1',
          name: 'Жим',
          category_id: 'cat1',
          data: { col1: '100', col2: '', col3: null },
        },
      ];

      doc.mockReturnValue('doc-ref');
      setDoc.mockResolvedValue();

      const result = await clientBaseService.updateBase('client123', exercises, 20);

      expect(setDoc).toHaveBeenCalledWith(
        'doc-ref',
        {
          name: 'Жим',
          categoryId: 'cat1',
          data: { col1: '100' }, // Empty values removed
        },
        { merge: true }
      );
      expect(result).toBe(true);
    });

    it('should update without columns', async () => {
      const exercises = [
        {
          exercise_id: 'ex1',
          name: 'Жим',
          category_id: 'cat1',
          data: {},
        },
      ];

      doc.mockReturnValue('doc-ref');
      setDoc.mockResolvedValue();

      const result = await clientBaseService.updateBase('client123', exercises);

      expect(setDoc).toHaveBeenCalledTimes(1); // Only exercise, no metadata
      expect(result).toBe(true);
    });

    it('should handle errors', async () => {
      const exercises = [
        {
          exercise_id: 'ex1',
          name: 'Жим',
          category_id: 'cat1',
          data: {},
        },
      ];

      doc.mockReturnValue('doc-ref');
      setDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(clientBaseService.updateBase('client123', exercises)).rejects.toThrow('Firestore error');
    });
  });

  describe('deleteExercise', () => {
    it('should delete exercise', async () => {
      doc.mockReturnValue('exercise-ref');
      deleteDoc.mockResolvedValue();

      const result = await clientBaseService.deleteExercise('client123', 'ex1');

      expect(doc).toHaveBeenCalledWith({}, 'clientBases', 'client123', 'exercises', 'ex1');
      expect(deleteDoc).toHaveBeenCalledWith('exercise-ref');
      expect(result).toBe(true);
    });

    it('should handle errors', async () => {
      doc.mockReturnValue('exercise-ref');
      deleteDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(clientBaseService.deleteExercise('client123', 'ex1')).rejects.toThrow('Firestore error');
    });
  });

  describe('addExerciseToClient', () => {
    it('should add exercise to client', async () => {
      const exercise = {
        id: 'ex1',
        name: 'Жим',
        categoryId: 'cat1',
      };

      doc.mockReturnValue('exercise-ref');
      setDoc.mockResolvedValue();

      const result = await clientBaseService.addExerciseToClient('client123', exercise);

      expect(doc).toHaveBeenCalledWith({}, 'clientBases', 'client123', 'exercises', 'ex1');
      expect(setDoc).toHaveBeenCalledWith('exercise-ref', {
        name: 'Жим',
        categoryId: 'cat1',
        data: {},
      });
      expect(result).toBe(true);
    });

    it('should handle errors', async () => {
      const exercise = {
        id: 'ex1',
        name: 'Жим',
        categoryId: 'cat1',
      };

      doc.mockReturnValue('exercise-ref');
      setDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(clientBaseService.addExerciseToClient('client123', exercise)).rejects.toThrow('Firestore error');
    });
  });

  describe('updateExercisesOrder', () => {
    it('should update order for multiple exercises', async () => {
      const exercises = [
        {
          exercise_id: 'ex1',
          name: 'Перше',
          category_id: 'cat1',
          data: { col1: '100', col2: '' },
        },
        {
          exercise_id: 'ex2',
          name: 'Друге',
          category_id: 'cat2',
          data: {},
        },
      ];

      doc.mockReturnValue('exercise-ref');
      setDoc.mockResolvedValue();

      const result = await clientBaseService.updateExercisesOrder('client123', exercises);

      expect(setDoc).toHaveBeenCalledTimes(2);
      expect(setDoc).toHaveBeenNthCalledWith(
        1,
        'exercise-ref',
        {
          name: 'Перше',
          categoryId: 'cat1',
          data: { col1: '100' },
          order: 0,
        },
        { merge: true }
      );
      expect(setDoc).toHaveBeenNthCalledWith(
        2,
        'exercise-ref',
        {
          name: 'Друге',
          categoryId: 'cat2',
          data: {},
          order: 1,
        },
        { merge: true }
      );
      expect(result).toBe(true);
    });

    it('should handle empty array', async () => {
      doc.mockReturnValue('exercise-ref');
      setDoc.mockResolvedValue();

      const result = await clientBaseService.updateExercisesOrder('client123', []);

      expect(setDoc).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle errors', async () => {
      const exercises = [
        {
          exercise_id: 'ex1',
          name: 'Жим',
          category_id: 'cat1',
          data: {},
        },
      ];

      doc.mockReturnValue('exercise-ref');
      setDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(clientBaseService.updateExercisesOrder('client123', exercises)).rejects.toThrow('Firestore error');
    });
  });
});
