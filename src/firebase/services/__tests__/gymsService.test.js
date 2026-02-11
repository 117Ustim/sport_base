// Тесты для gymsService
import { gymsService } from '../gymsService';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  collection: jest.fn(),
  getDocs: jest.fn(),
  deleteDoc: jest.fn(),
}));

// Mock Firebase config
jest.mock('../../config', () => ({
  db: {},
}));

describe('gymsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should get all gyms', async () => {
      const mockGyms = [
        {
          id: '1',
          data: () => ({
            name: 'Зал 1',
          }),
        },
        {
          id: '2',
          data: () => ({
            name: 'Зал 2',
          }),
        },
        {
          id: '3',
          data: () => ({
            name: 'Зал 3',
          }),
        },
      ];

      collection.mockReturnValue('gyms-ref');
      getDocs.mockResolvedValue({ docs: mockGyms });

      const result = await gymsService.getAll();

      expect(collection).toHaveBeenCalledWith({}, 'gyms');
      expect(getDocs).toHaveBeenCalledWith('gyms-ref');
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        id: '1',
        name: 'Зал 1',
        Label: 'Зал 1',
      });
      expect(result[1]).toEqual({
        id: '2',
        name: 'Зал 2',
        Label: 'Зал 2',
      });
    });

    it('should handle empty gyms list', async () => {
      collection.mockReturnValue('gyms-ref');
      getDocs.mockResolvedValue({ docs: [] });

      const result = await gymsService.getAll();

      expect(result).toEqual([]);
    });

    it('should handle gyms without name', async () => {
      const mockGyms = [
        {
          id: '1',
          data: () => ({}),
        },
      ];

      collection.mockReturnValue('gyms-ref');
      getDocs.mockResolvedValue({ docs: mockGyms });

      const result = await gymsService.getAll();

      expect(result[0]).toEqual({
        id: '1',
        name: '',
        Label: '',
      });
    });

    it('should handle errors', async () => {
      collection.mockReturnValue('gyms-ref');
      getDocs.mockRejectedValue(new Error('Firestore error'));

      await expect(gymsService.getAll()).rejects.toThrow('Firestore error');
    });
  });

  describe('create', () => {
    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(1234567890);
    });

    afterEach(() => {
      Date.now.mockRestore();
    });

    it('should create new gym', async () => {
      doc.mockReturnValue('doc-ref');
      setDoc.mockResolvedValue();

      const result = await gymsService.create('Новый зал');

      expect(doc).toHaveBeenCalledWith({}, 'gyms', '1234567890');
      expect(setDoc).toHaveBeenCalledWith('doc-ref', {
        id: '1234567890',
        name: 'Новый зал',
        createdAt: expect.any(String),
      });
      expect(result).toEqual({
        id: '1234567890',
        name: 'Новый зал',
        Label: 'Новый зал',
      });
    });

    it('should create gym with empty name', async () => {
      doc.mockReturnValue('doc-ref');
      setDoc.mockResolvedValue();

      const result = await gymsService.create('');

      expect(setDoc).toHaveBeenCalledWith('doc-ref', {
        id: '1234567890',
        name: '',
        createdAt: expect.any(String),
      });
      expect(result.name).toBe('');
    });

    it('should handle errors', async () => {
      doc.mockReturnValue('doc-ref');
      setDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(gymsService.create('Зал')).rejects.toThrow('Firestore error');
    });
  });

  describe('update', () => {
    it('should update gym name', async () => {
      doc.mockReturnValue('doc-ref');
      setDoc.mockResolvedValue();

      const result = await gymsService.update('123', 'Оновлена назва');

      expect(doc).toHaveBeenCalledWith({}, 'gyms', '123');
      expect(setDoc).toHaveBeenCalledWith(
        'doc-ref',
        {
          name: 'Оновлена назва',
          updatedAt: expect.any(String),
        },
        { merge: true }
      );
      expect(result).toEqual({
        id: '123',
        name: 'Оновлена назва',
      });
    });

    it('should update gym with empty name', async () => {
      doc.mockReturnValue('doc-ref');
      setDoc.mockResolvedValue();

      const result = await gymsService.update('123', '');

      expect(setDoc).toHaveBeenCalledWith(
        'doc-ref',
        {
          name: '',
          updatedAt: expect.any(String),
        },
        { merge: true }
      );
      expect(result.name).toBe('');
    });

    it('should handle errors', async () => {
      doc.mockReturnValue('doc-ref');
      setDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(gymsService.update('123', 'Зал')).rejects.toThrow('Firestore error');
    });
  });

  describe('delete', () => {
    it('should delete gym', async () => {
      doc.mockReturnValue('doc-ref');
      deleteDoc.mockResolvedValue();

      const result = await gymsService.delete('123');

      expect(doc).toHaveBeenCalledWith({}, 'gyms', '123');
      expect(deleteDoc).toHaveBeenCalledWith('doc-ref');
      expect(result).toBe(true);
    });

    it('should handle errors', async () => {
      doc.mockReturnValue('doc-ref');
      deleteDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(gymsService.delete('123')).rejects.toThrow('Firestore error');
    });

    it('should handle non-existing gym', async () => {
      doc.mockReturnValue('doc-ref');
      deleteDoc.mockRejectedValue(new Error('Document not found'));

      await expect(gymsService.delete('999')).rejects.toThrow('Document not found');
    });
  });
});
