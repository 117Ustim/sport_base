// Тесты для assignedWorkoutsService
import { assignedWorkoutsService } from '../assignedWorkoutsService';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  deleteDoc,
} from 'firebase/firestore';

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  deleteDoc: jest.fn(),
}));

// Mock Firebase config
jest.mock('../../config', () => ({
  db: {},
}));

describe('assignedWorkoutsService', () => {
  let consoleLogSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.log for cleaner test output
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    if (consoleLogSpy) {
      consoleLogSpy.mockRestore();
    }
  });

  describe('assignWeekToClient', () => {
    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(1234567890000);
    });

    afterEach(() => {
      Date.now.mockRestore();
    });

    it('should assign week to client and delete old assignments', async () => {
      const weekData = {
        weekNumber: 1,
        dates: { monday: '01.01.2024', tuesday: '02.01.2024' },
        days: {},
      };

      // Mock deleteAllAssignmentsForUser
      collection.mockReturnValue('collection-ref');
      where.mockReturnValue('where-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: [] });

      doc.mockReturnValue('assignment-ref');
      setDoc.mockResolvedValue();

      const result = await assignedWorkoutsService.assignWeekToClient(
        'client1',
        'user1',
        weekData,
        'Тренування 1',
        'workout1'
      );

      expect(setDoc).toHaveBeenCalledWith('assignment-ref', {
        clientId: 'client1',
        userId: 'user1',
        workoutId: 'workout1',
        workoutName: 'Тренування 1',
        weekNumber: 1,
        weekData: weekData,
        assignedAt: expect.any(String),
        status: 'new',
      });
      expect(result.id).toContain('client1_workout1_week1');
    });

    it('should handle errors', async () => {
      const weekData = { weekNumber: 1, dates: {}, days: {} };

      collection.mockReturnValue('collection-ref');
      where.mockReturnValue('where-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: [] });

      doc.mockReturnValue('assignment-ref');
      setDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(
        assignedWorkoutsService.assignWeekToClient('client1', 'user1', weekData, 'Test', 'w1')
      ).rejects.toThrow('Firestore error');
    });
  });

  describe('getAssignedWorkoutsByUserId', () => {
    it('should get assignments with weekData', async () => {
      const mockAssignments = [
        {
          id: 'a1',
          data: () => ({
            userId: 'user1',
            workoutId: 'w1',
            weekNumber: 1,
            weekData: { dates: { monday: '01.01.2024' } },
            assignedAt: '01.01.2024',
          }),
        },
      ];

      collection.mockReturnValue('collection-ref');
      where.mockReturnValue('where-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: mockAssignments });

      const result = await assignedWorkoutsService.getAssignedWorkoutsByUserId('user1');

      expect(where).toHaveBeenCalledWith('userId', '==', 'user1');
      expect(result).toHaveLength(1);
      expect(result[0].weekData).toBeDefined();
    });

    it('should fetch weekData from workouts if not in assignment', async () => {
      const mockAssignments = [
        {
          id: 'a1',
          data: () => ({
            userId: 'user1',
            workoutId: 'w1',
            weekNumber: 1,
            assignedAt: '01.01.2024',
          }),
        },
      ];

      const mockWorkout = {
        exists: () => true,
        data: () => ({
          weeks: [
            {
              weekNumber: 1,
              dates: { monday: '01.01.2024' },
            },
          ],
        }),
      };

      collection.mockReturnValue('collection-ref');
      where.mockReturnValue('where-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: mockAssignments });
      doc.mockReturnValue('workout-ref');
      getDoc.mockResolvedValue(mockWorkout);

      const result = await assignedWorkoutsService.getAssignedWorkoutsByUserId('user1');

      expect(result[0].weekData).toBeDefined();
      expect(result[0].weekData.dates).toEqual({ monday: '01.01.2024' });
    });

    it('should return empty array if no assignments', async () => {
      collection.mockReturnValue('collection-ref');
      where.mockReturnValue('where-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: [] });

      const result = await assignedWorkoutsService.getAssignedWorkoutsByUserId('user1');

      expect(result).toEqual([]);
    });

    it('should handle errors', async () => {
      collection.mockReturnValue('collection-ref');
      where.mockReturnValue('where-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockRejectedValue(new Error('Firestore error'));

      await expect(assignedWorkoutsService.getAssignedWorkoutsByUserId('user1')).rejects.toThrow('Firestore error');
    });
  });

  describe('getAssignedWorkoutsByClientId', () => {
    it('should get assignments by clientId', async () => {
      const mockAssignments = [
        {
          id: 'a1',
          data: () => ({
            clientId: 'client1',
            workoutId: 'w1',
            weekNumber: 1,
            weekData: { dates: {} },
            assignedAt: '01.01.2024',
          }),
        },
      ];

      collection.mockReturnValue('collection-ref');
      where.mockReturnValue('where-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: mockAssignments });

      const result = await assignedWorkoutsService.getAssignedWorkoutsByClientId('client1');

      expect(where).toHaveBeenCalledWith('clientId', '==', 'client1');
      expect(result).toHaveLength(1);
    });

    it('should handle errors', async () => {
      collection.mockReturnValue('collection-ref');
      where.mockReturnValue('where-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockRejectedValue(new Error('Firestore error'));

      await expect(assignedWorkoutsService.getAssignedWorkoutsByClientId('client1')).rejects.toThrow('Firestore error');
    });
  });

  describe('isWeekAssigned', () => {
    it('should return true if week is assigned', async () => {
      collection.mockReturnValue('collection-ref');
      where.mockReturnValue('where-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ empty: false });

      const result = await assignedWorkoutsService.isWeekAssigned('client1', 'w1', 1);

      expect(where).toHaveBeenCalledWith('clientId', '==', 'client1');
      expect(where).toHaveBeenCalledWith('workoutId', '==', 'w1');
      expect(where).toHaveBeenCalledWith('weekNumber', '==', 1);
      expect(result).toBe(true);
    });

    it('should return false if week is not assigned', async () => {
      collection.mockReturnValue('collection-ref');
      where.mockReturnValue('where-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ empty: true });

      const result = await assignedWorkoutsService.isWeekAssigned('client1', 'w1', 1);

      expect(result).toBe(false);
    });

    it('should handle errors', async () => {
      collection.mockReturnValue('collection-ref');
      where.mockReturnValue('where-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockRejectedValue(new Error('Firestore error'));

      await expect(assignedWorkoutsService.isWeekAssigned('client1', 'w1', 1)).rejects.toThrow('Firestore error');
    });
  });

  describe('updateStatus', () => {
    it('should update assignment status', async () => {
      doc.mockReturnValue('assignment-ref');
      setDoc.mockResolvedValue();

      const result = await assignedWorkoutsService.updateStatus('a1', 'completed');

      expect(doc).toHaveBeenCalledWith({}, 'assignedWorkouts', 'a1');
      expect(setDoc).toHaveBeenCalledWith('assignment-ref', { status: 'completed' }, { merge: true });
      expect(result).toBe(true);
    });

    it('should handle errors', async () => {
      doc.mockReturnValue('assignment-ref');
      setDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(assignedWorkoutsService.updateStatus('a1', 'completed')).rejects.toThrow('Firestore error');
    });
  });

  describe('deleteAssignment', () => {
    it('should delete assignment', async () => {
      doc.mockReturnValue('assignment-ref');
      deleteDoc.mockResolvedValue();

      const result = await assignedWorkoutsService.deleteAssignment('a1');

      expect(doc).toHaveBeenCalledWith({}, 'assignedWorkouts', 'a1');
      expect(deleteDoc).toHaveBeenCalledWith('assignment-ref');
      expect(result).toBe(true);
    });

    it('should handle errors', async () => {
      doc.mockReturnValue('assignment-ref');
      deleteDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(assignedWorkoutsService.deleteAssignment('a1')).rejects.toThrow('Firestore error');
    });
  });

  describe('deleteAllAssignmentsForUser', () => {
    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(1234567890000);
      jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
    });

    afterEach(() => {
      Date.now.mockRestore();
      Math.random.mockRestore();
    });

    it('should delete all assignments and save to history', async () => {
      const mockAssignments = [
        {
          id: 'a1',
          ref: 'ref1',
          data: () => ({
            clientId: 'client1',
            userId: 'user1',
            workoutId: 'w1',
          }),
        },
        {
          id: 'a2',
          ref: 'ref2',
          data: () => ({
            clientId: 'client1',
            userId: 'user1',
            workoutId: 'w2',
          }),
        },
      ];

      collection.mockReturnValue('collection-ref');
      where.mockReturnValue('where-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: mockAssignments });
      doc.mockReturnValue('doc-ref');
      setDoc.mockResolvedValue();
      deleteDoc.mockResolvedValue();

      const result = await assignedWorkoutsService.deleteAllAssignmentsForUser('user1');

      expect(setDoc).toHaveBeenCalledTimes(2); // 2 history records
      expect(deleteDoc).toHaveBeenCalledTimes(2); // 2 deletions
      expect(result).toBe(true);
    });

    it('should handle empty assignments', async () => {
      collection.mockReturnValue('collection-ref');
      where.mockReturnValue('where-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: [] });

      const result = await assignedWorkoutsService.deleteAllAssignmentsForUser('user1');

      expect(setDoc).not.toHaveBeenCalled();
      expect(deleteDoc).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle errors', async () => {
      collection.mockReturnValue('collection-ref');
      where.mockReturnValue('where-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockRejectedValue(new Error('Firestore error'));

      await expect(assignedWorkoutsService.deleteAllAssignmentsForUser('user1')).rejects.toThrow('Firestore error');
    });
  });

  describe('getAssignmentHistory', () => {
    it('should get assignment history sorted by date', async () => {
      const mockHistory = [
        {
          id: 'h1',
          data: () => ({
            userId: 'user1',
            completedAt: '01.01.2024, 10:00:00',
          }),
        },
        {
          id: 'h2',
          data: () => ({
            userId: 'user1',
            completedAt: '02.01.2024, 10:00:00',
          }),
        },
      ];

      collection.mockReturnValue('history-ref');
      where.mockReturnValue('where-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: mockHistory });

      const result = await assignedWorkoutsService.getAssignmentHistory('user1');

      expect(collection).toHaveBeenCalledWith({}, 'assignmentHistory');
      expect(where).toHaveBeenCalledWith('userId', '==', 'user1');
      expect(result).toHaveLength(2);
      // Sorted newest first
      expect(result[0].completedAt).toBe('02.01.2024, 10:00:00');
    });

    it('should return empty array if no history', async () => {
      collection.mockReturnValue('history-ref');
      where.mockReturnValue('where-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: [] });

      const result = await assignedWorkoutsService.getAssignmentHistory('user1');

      expect(result).toEqual([]);
    });

    it('should handle errors', async () => {
      collection.mockReturnValue('history-ref');
      where.mockReturnValue('where-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockRejectedValue(new Error('Firestore error'));

      await expect(assignedWorkoutsService.getAssignmentHistory('user1')).rejects.toThrow('Firestore error');
    });
  });
});
