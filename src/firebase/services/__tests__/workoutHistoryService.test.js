// Тесты для workoutHistoryService
import { workoutHistoryService } from '../workoutHistoryService';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
}));

// Mock Firebase config
jest.mock('../../config', () => ({
  db: {},
}));

describe('workoutHistoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('_cleanExerciseData', () => {
    it('should remove empty values', () => {
      const data = {
        sets: '3',
        reps: '',
        weight: null,
        notes: undefined,
        tempo: '2-0-2',
      };

      const result = workoutHistoryService._cleanExerciseData(data);

      expect(result).toEqual({
        sets: '3',
        tempo: '2-0-2',
      });
    });

    it('should handle non-object input', () => {
      expect(workoutHistoryService._cleanExerciseData(null)).toBeNull();
      expect(workoutHistoryService._cleanExerciseData(undefined)).toBeUndefined();
      expect(workoutHistoryService._cleanExerciseData('string')).toBe('string');
    });

    it('should return empty object if all values are empty', () => {
      const data = {
        sets: '',
        reps: null,
        weight: undefined,
      };

      const result = workoutHistoryService._cleanExerciseData(data);

      expect(result).toEqual({});
    });
  });

  describe('_cleanExercises', () => {
    it('should clean exercise data in array', () => {
      const exercises = [
        {
          name: 'Жим',
          exerciseData: { sets: '3', reps: '', weight: '100' },
        },
        {
          name: 'Присід',
          exerciseData: { sets: '', reps: '10' },
        },
      ];

      const result = workoutHistoryService._cleanExercises(exercises);

      expect(result[0].exerciseData).toEqual({ sets: '3', weight: '100' });
      expect(result[1].exerciseData).toEqual({ reps: '10' });
    });

    it('should handle exercises without exerciseData', () => {
      const exercises = [
        {
          name: 'Жим',
        },
      ];

      const result = workoutHistoryService._cleanExercises(exercises);

      expect(result[0]).toEqual({ name: 'Жим' });
    });

    it('should handle non-array input', () => {
      expect(workoutHistoryService._cleanExercises(null)).toBeNull();
      expect(workoutHistoryService._cleanExercises(undefined)).toBeUndefined();
    });
  });

  describe('saveWorkoutSession', () => {
    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(1234567890000);
      jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
    });

    afterEach(() => {
      Date.now.mockRestore();
      Math.random.mockRestore();
    });

    it('should save workout session with cleaned data', async () => {
      const sessionData = {
        workoutId: 'w1',
        clientId: 'client1',
        weekNumber: 1,
        dayKey: 'monday',
        date: '01.01.2024',
        exercises: [
          {
            name: 'Жим',
            exerciseData: { sets: '3', reps: '', weight: '100' },
          },
        ],
      };

      doc.mockReturnValue('session-ref');
      setDoc.mockResolvedValue();

      const result = await workoutHistoryService.saveWorkoutSession(sessionData);

      expect(doc).toHaveBeenCalledWith({}, 'workoutHistory', expect.stringContaining('session_'));
      expect(setDoc).toHaveBeenCalledWith('session-ref', {
        workoutId: 'w1',
        clientId: 'client1',
        weekNumber: 1,
        dayKey: 'monday',
        date: '01.01.2024',
        exercises: [
          {
            name: 'Жим',
            exerciseData: { sets: '3', weight: '100' },
          },
        ],
        createdAt: expect.any(String),
      });
      expect(result.id).toContain('session_');
    });

    it('should handle exercises without exerciseData', async () => {
      const sessionData = {
        workoutId: 'w1',
        clientId: 'client1',
        weekNumber: 1,
        dayKey: 'monday',
        date: '01.01.2024',
        exercises: [
          {
            name: 'Жим',
          },
        ],
      };

      doc.mockReturnValue('session-ref');
      setDoc.mockResolvedValue();

      await workoutHistoryService.saveWorkoutSession(sessionData);

      const savedData = setDoc.mock.calls[0][1];
      expect(savedData.exercises[0]).toEqual({ name: 'Жим' });
    });

    it('should handle errors', async () => {
      const sessionData = {
        workoutId: 'w1',
        clientId: 'client1',
        weekNumber: 1,
        dayKey: 'monday',
        date: '01.01.2024',
        exercises: [],
      };

      doc.mockReturnValue('session-ref');
      setDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(workoutHistoryService.saveWorkoutSession(sessionData)).rejects.toThrow('Firestore error');
    });
  });

  describe('getByWorkoutId', () => {
    it('should get workout history sorted by date', async () => {
      const mockSessions = [
        {
          id: 's1',
          data: () => ({
            workoutId: 'w1',
            date: '01.01.2024',
            createdAt: '01.01.2024, 10:00:00',
          }),
        },
        {
          id: 's2',
          data: () => ({
            workoutId: 'w1',
            date: '02.01.2024',
            createdAt: '02.01.2024, 10:00:00',
          }),
        },
      ];

      collection.mockReturnValue('history-ref');
      where.mockReturnValue('where-constraint');
      orderBy.mockReturnValue('orderBy-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: mockSessions });

      const result = await workoutHistoryService.getByWorkoutId('w1');

      expect(collection).toHaveBeenCalledWith({}, 'workoutHistory');
      expect(where).toHaveBeenCalledWith('workoutId', '==', 'w1');
      expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
      expect(result).toHaveLength(2);
    });

    it('should return empty array if no history', async () => {
      collection.mockReturnValue('history-ref');
      where.mockReturnValue('where-constraint');
      orderBy.mockReturnValue('orderBy-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: [] });

      const result = await workoutHistoryService.getByWorkoutId('w1');

      expect(result).toEqual([]);
    });

    it('should handle errors', async () => {
      collection.mockReturnValue('history-ref');
      where.mockReturnValue('where-constraint');
      orderBy.mockReturnValue('orderBy-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockRejectedValue(new Error('Firestore error'));

      await expect(workoutHistoryService.getByWorkoutId('w1')).rejects.toThrow('Firestore error');
    });
  });

  describe('getLatestDateForDay', () => {
    it('should get latest date for specific day', async () => {
      const mockSessions = [
        {
          data: () => ({
            date: '05.01.2024',
            createdAt: '05.01.2024, 10:00:00',
          }),
        },
        {
          data: () => ({
            date: '01.01.2024',
            createdAt: '01.01.2024, 10:00:00',
          }),
        },
      ];

      collection.mockReturnValue('history-ref');
      where.mockReturnValue('where-constraint');
      orderBy.mockReturnValue('orderBy-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: mockSessions, empty: false });

      const result = await workoutHistoryService.getLatestDateForDay('w1', 1, 'monday');

      expect(where).toHaveBeenCalledWith('workoutId', '==', 'w1');
      expect(where).toHaveBeenCalledWith('weekNumber', '==', 1);
      expect(where).toHaveBeenCalledWith('dayKey', '==', 'monday');
      expect(result).toBe('05.01.2024');
    });

    it('should return null if no sessions found', async () => {
      collection.mockReturnValue('history-ref');
      where.mockReturnValue('where-constraint');
      orderBy.mockReturnValue('orderBy-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: [], empty: true });

      const result = await workoutHistoryService.getLatestDateForDay('w1', 1, 'monday');

      expect(result).toBeNull();
    });

    it('should handle errors', async () => {
      collection.mockReturnValue('history-ref');
      where.mockReturnValue('where-constraint');
      orderBy.mockReturnValue('orderBy-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockRejectedValue(new Error('Firestore error'));

      await expect(workoutHistoryService.getLatestDateForDay('w1', 1, 'monday')).rejects.toThrow('Firestore error');
    });
  });

  describe('getAllDatesForDay', () => {
    it('should get all dates for specific day', async () => {
      const mockSessions = [
        {
          data: () => ({
            date: '05.01.2024',
          }),
        },
        {
          data: () => ({
            date: '03.01.2024',
          }),
        },
        {
          data: () => ({
            date: '01.01.2024',
          }),
        },
      ];

      collection.mockReturnValue('history-ref');
      where.mockReturnValue('where-constraint');
      orderBy.mockReturnValue('orderBy-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: mockSessions });

      const result = await workoutHistoryService.getAllDatesForDay('w1', 1, 'monday');

      expect(result).toEqual(['05.01.2024', '03.01.2024', '01.01.2024']);
    });

    it('should return empty array if no dates', async () => {
      collection.mockReturnValue('history-ref');
      where.mockReturnValue('where-constraint');
      orderBy.mockReturnValue('orderBy-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: [] });

      const result = await workoutHistoryService.getAllDatesForDay('w1', 1, 'monday');

      expect(result).toEqual([]);
    });

    it('should handle errors', async () => {
      collection.mockReturnValue('history-ref');
      where.mockReturnValue('where-constraint');
      orderBy.mockReturnValue('orderBy-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockRejectedValue(new Error('Firestore error'));

      await expect(workoutHistoryService.getAllDatesForDay('w1', 1, 'monday')).rejects.toThrow('Firestore error');
    });
  });

  describe('getByClientId', () => {
    it('should get client workout history', async () => {
      const mockSessions = [
        {
          id: 's1',
          data: () => ({
            clientId: 'client1',
            workoutId: 'w1',
            date: '01.01.2024',
          }),
        },
        {
          id: 's2',
          data: () => ({
            clientId: 'client1',
            workoutId: 'w2',
            date: '02.01.2024',
          }),
        },
      ];

      collection.mockReturnValue('history-ref');
      where.mockReturnValue('where-constraint');
      orderBy.mockReturnValue('orderBy-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: mockSessions });

      const result = await workoutHistoryService.getByClientId('client1');

      expect(where).toHaveBeenCalledWith('clientId', '==', 'client1');
      expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
      expect(result).toHaveLength(2);
    });

    it('should return empty array if no history', async () => {
      collection.mockReturnValue('history-ref');
      where.mockReturnValue('where-constraint');
      orderBy.mockReturnValue('orderBy-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: [] });

      const result = await workoutHistoryService.getByClientId('client1');

      expect(result).toEqual([]);
    });

    it('should handle errors', async () => {
      collection.mockReturnValue('history-ref');
      where.mockReturnValue('where-constraint');
      orderBy.mockReturnValue('orderBy-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockRejectedValue(new Error('Firestore error'));

      await expect(workoutHistoryService.getByClientId('client1')).rejects.toThrow('Firestore error');
    });
  });
});
