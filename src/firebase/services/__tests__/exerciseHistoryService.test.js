import { exerciseHistoryService } from '../exerciseHistoryService';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { clientBaseService } from '../clientBaseService';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  writeBatch: jest.fn(),
  Timestamp: {
    now: jest.fn(),
  },
}));

jest.mock('../../config', () => ({
  db: {},
}));

jest.mock('../clientBaseService', () => ({
  clientBaseService: {
    getByClientId: jest.fn(),
  },
}));

describe('exerciseHistoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Timestamp.now.mockReturnValue('mock-timestamp');
  });

  describe('addHistoryEntry', () => {
    it('should save history entry with required exerciseId', async () => {
      collection.mockReturnValue('history-ref');
      addDoc.mockResolvedValue({ id: 'history-1' });

      const result = await exerciseHistoryService.addHistoryEntry({
        clientId: 'client-1',
        exerciseId: 'exercise-1',
        exerciseName: 'Bench press',
        reps: 8,
        previousWeight: 90,
        newWeight: 95,
        weightChange: 5,
      });

      expect(collection).toHaveBeenCalledWith({}, 'exerciseHistory');
      expect(addDoc).toHaveBeenCalledWith('history-ref', expect.objectContaining({
        clientId: 'client-1',
        exerciseId: 'exercise-1',
        exerciseName: 'Bench press',
        reps: 8,
        previousWeight: 90,
        newWeight: 95,
        weightChange: 5,
        createdAt: 'mock-timestamp',
      }));
      expect(result).toBe('history-1');
    });

    it('should support legacy exercise_id input and map it to exerciseId', async () => {
      collection.mockReturnValue('history-ref');
      addDoc.mockResolvedValue({ id: 'history-2' });

      await exerciseHistoryService.addHistoryEntry({
        clientId: 'client-1',
        exercise_id: 'exercise-legacy',
        reps: 10,
        previousWeight: 60,
        newWeight: 62.5,
        weightChange: 2.5,
      });

      expect(addDoc).toHaveBeenCalledWith('history-ref', expect.objectContaining({
        exerciseId: 'exercise-legacy',
      }));
    });

    it('should throw when exerciseId is missing', async () => {
      await expect(
        exerciseHistoryService.addHistoryEntry({
          clientId: 'client-1',
          reps: 10,
          previousWeight: 60,
          newWeight: 65,
          weightChange: 5,
        })
      ).rejects.toThrow('exerciseId is required');
    });
  });

  describe('getExerciseHistory', () => {
    it('should query history by exerciseId', async () => {
      const doc1 = {
        id: 'h1',
        data: () => ({ clientId: 'client-1', exerciseId: 'exercise-1', timestamp: '2026-01-01' }),
      };

      collection.mockReturnValue('history-ref');
      where.mockReturnValue('where');
      orderBy.mockReturnValue('orderBy');
      limit.mockReturnValue('limit');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: [doc1] });

      const result = await exerciseHistoryService.getExerciseHistory('client-1', 'exercise-1', 25);

      expect(where).toHaveBeenCalledWith('clientId', '==', 'client-1');
      expect(where).toHaveBeenCalledWith('exerciseId', '==', 'exercise-1');
      expect(orderBy).toHaveBeenCalledWith('timestamp', 'desc');
      expect(limit).toHaveBeenCalledWith(25);
      expect(result).toEqual([{
        id: 'h1',
        clientId: 'client-1',
        exerciseId: 'exercise-1',
        timestamp: '2026-01-01',
      }]);
    });

    it('should throw when exerciseId is missing', async () => {
      await expect(
        exerciseHistoryService.getExerciseHistory('client-1', '')
      ).rejects.toThrow('exerciseId is required');
    });
  });

  describe('getExerciseProgress', () => {
    it('should compute progress using full exerciseId history', async () => {
      const history = [
        { previousWeight: 90, newWeight: 95, weightChange: 5, timestamp: '2026-01-03T00:00:00.000Z' },
        { previousWeight: 85, newWeight: 90, weightChange: 5, timestamp: '2026-01-02T00:00:00.000Z' },
      ];

      const spy = jest.spyOn(exerciseHistoryService, 'getExerciseHistoryAll').mockResolvedValue(history);

      const result = await exerciseHistoryService.getExerciseProgress('client-1', 'exercise-1');

      expect(spy).toHaveBeenCalledWith('client-1', 'exercise-1');
      expect(result).toEqual({
        totalChanges: 2,
        totalWeightIncrease: 10,
        averageWeightIncrease: 5,
        firstWeight: 85,
        lastWeight: 95,
        progressPercentage: ((95 - 85) / 85) * 100,
      });

      spy.mockRestore();
    });
  });

  describe('backfillExerciseIdsForClient', () => {
    it('should fill missing exerciseId values using client base mapping', async () => {
      clientBaseService.getByClientId.mockResolvedValue([
        { exercise_id: 'ex-1', name: 'Bench Press' },
      ]);

      const docWithMissingId = {
        ref: { id: 'h1' },
        data: () => ({ clientId: 'client-1', exerciseName: 'Bench Press' }),
      };
      const docWithExistingId = {
        ref: { id: 'h2' },
        data: () => ({ clientId: 'client-1', exerciseName: 'Bench Press', exerciseId: 'ex-1' }),
      };
      const docWithoutName = {
        ref: { id: 'h3' },
        data: () => ({ clientId: 'client-1' }),
      };

      collection.mockReturnValue('history-ref');
      where.mockReturnValue('where');
      orderBy.mockReturnValue('orderBy');
      query.mockReturnValue('query-result');
      getDocs
        .mockResolvedValueOnce({
          docs: [
            {
              id: 'global-ex',
              data: () => ({ name: 'Bench Press' }),
            },
          ],
        })
        .mockResolvedValueOnce({
          empty: false,
          size: 3,
          docs: [docWithMissingId, docWithExistingId, docWithoutName],
        });

      collection.mockImplementation((dbArg, path) => {
        if (path === 'exerciseHistory') return 'history-ref';
        if (path === 'exercises') return 'global-exercises-ref';
        return 'unknown-ref';
      });

      query.mockImplementation((...args) => args.join('|'));
      const batch = {
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(),
      };
      writeBatch.mockReturnValue(batch);

      const result = await exerciseHistoryService.backfillExerciseIdsForClient('client-1');

      expect(clientBaseService.getByClientId).toHaveBeenCalledWith('client-1');
      expect(batch.update).toHaveBeenCalledWith(docWithMissingId.ref, expect.objectContaining({
        exerciseId: 'ex-1',
      }));
      expect(result).toEqual({
        clientId: 'client-1',
        totalEntries: 3,
        updatedEntries: 1,
        updatedByClientBase: 1,
        updatedByGlobalFallback: 0,
        alreadyFilled: 1,
        unresolvedEntries: 1,
        unresolvedNoName: 1,
        unresolvedAmbiguous: 0,
        unresolvedNoMatch: 0,
      });
    });

    it('should use global exercises fallback when client base is empty', async () => {
      clientBaseService.getByClientId.mockResolvedValue([]);

      const missingDoc = {
        ref: { id: 'h1' },
        data: () => ({ clientId: 'client-2', exerciseName: 'Bench Press' }),
      };

      collection.mockImplementation((dbArg, path) => {
        if (path === 'exerciseHistory') return 'history-ref';
        if (path === 'exercises') return 'global-exercises-ref';
        return 'unknown-ref';
      });

      getDocs
        .mockResolvedValueOnce({
          docs: [
            {
              id: 'global-bench-id',
              data: () => ({ name: 'Bench Press' }),
            },
          ],
        })
        .mockResolvedValueOnce({
          empty: false,
          size: 1,
          docs: [missingDoc],
        });

      const batch = {
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(),
      };
      writeBatch.mockReturnValue(batch);

      const result = await exerciseHistoryService.backfillExerciseIdsForClient('client-2');

      expect(batch.update).toHaveBeenCalledWith(missingDoc.ref, expect.objectContaining({
        exerciseId: 'global-bench-id',
      }));
      expect(result).toEqual({
        clientId: 'client-2',
        totalEntries: 1,
        updatedEntries: 1,
        updatedByClientBase: 0,
        updatedByGlobalFallback: 1,
        alreadyFilled: 0,
        unresolvedEntries: 0,
        unresolvedNoName: 0,
        unresolvedAmbiguous: 0,
        unresolvedNoMatch: 0,
      });
    });
  });

  describe('getExerciseStatsByReps', () => {
    it('should build 1..12 stats with baseline and current values', async () => {
      const spy = jest.spyOn(exerciseHistoryService, 'getExerciseHistoryAll').mockResolvedValue([
        {
          reps: 8,
          previousWeight: 95,
          newWeight: 100,
          timestamp: '2026-01-01T10:00:00.000Z',
        },
        {
          reps: 8,
          previousWeight: 100,
          newWeight: 105,
          timestamp: '2026-01-05T10:00:00.000Z',
        },
        {
          reps: 10,
          previousWeight: 75,
          newWeight: 80,
          timestamp: '2026-01-03T10:00:00.000Z',
        },
      ]);

      const result = await exerciseHistoryService.getExerciseStatsByReps('client-1', 'exercise-1');

      expect(result.rows).toHaveLength(12);

      const reps8 = result.rows.find(row => row.reps === 8);
      expect(reps8).toEqual(expect.objectContaining({
        hasBaseline: true,
        baselineWeight: 95,
        currentWeight: 105,
        changeKg: 10,
        changePercent: 10.53,
      }));

      const reps10 = result.rows.find(row => row.reps === 10);
      expect(reps10).toEqual(expect.objectContaining({
        hasBaseline: true,
        baselineWeight: 75,
        currentWeight: 80,
        changeKg: 5,
      }));

      const reps12 = result.rows.find(row => row.reps === 12);
      expect(reps12).toEqual(expect.objectContaining({
        hasBaseline: false,
        baselineWeight: null,
        currentWeight: null,
      }));

      spy.mockRestore();
    });

    it('should keep full previous->new timeline for one reps target', async () => {
      const spy = jest.spyOn(exerciseHistoryService, 'getExerciseHistoryAll').mockResolvedValue([
        {
          reps: 6,
          previousWeight: 0,
          newWeight: 120,
          timestamp: '2026-03-20T10:00:00.000Z',
        },
        {
          reps: 6,
          previousWeight: 120,
          newWeight: 130,
          timestamp: '2026-03-25T10:00:00.000Z',
        },
        {
          reps: 6,
          previousWeight: 130,
          newWeight: 140,
          timestamp: '2026-03-30T10:00:00.000Z',
        },
      ]);

      const result = await exerciseHistoryService.getExerciseStatsByReps('client-1', 'exercise-1');

      const reps6 = result.rows.find(row => row.reps === 6);
      expect(reps6).toEqual(expect.objectContaining({
        hasBaseline: true,
        baselineWeight: 120,
        currentWeight: 140,
        changeKg: 20,
        changePercent: 16.67,
      }));

      spy.mockRestore();
    });
  });
});
