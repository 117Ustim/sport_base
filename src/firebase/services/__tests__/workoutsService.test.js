// Тесты для workoutsService
import { workoutsService } from '../workoutsService';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  getDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
}));

// Mock Firebase config
jest.mock('../../config', () => ({
  db: {},
}));

describe('workoutsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getByClientId', () => {
    it('should get workouts for client sorted by date', async () => {
      const mockWorkouts = [
        {
          id: 'w1',
          data: () => ({
            name: 'Старіша',
            clientId: 'client1',
            createdAt: '2024-01-01T00:00:00.000Z',
          }),
        },
        {
          id: 'w2',
          data: () => ({
            name: 'Новіша',
            clientId: 'client1',
            createdAt: '2024-01-02T00:00:00.000Z',
          }),
        },
      ];

      collection.mockReturnValue('workouts-ref');
      where.mockReturnValue('where-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: mockWorkouts });

      const result = await workoutsService.getByClientId('client1');

      expect(collection).toHaveBeenCalledWith({}, 'workouts');
      expect(where).toHaveBeenCalledWith('clientId', '==', 'client1');
      expect(result).toHaveLength(2);
      // Sorted from newest to oldest
      expect(result[0].name).toBe('Новіша');
      expect(result[1].name).toBe('Старіша');
    });

    it('should return empty array if no workouts', async () => {
      collection.mockReturnValue('workouts-ref');
      where.mockReturnValue('where-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockResolvedValue({ docs: [] });

      const result = await workoutsService.getByClientId('client1');

      expect(result).toEqual([]);
    });

    it('should handle errors', async () => {
      collection.mockReturnValue('workouts-ref');
      where.mockReturnValue('where-constraint');
      query.mockReturnValue('query-result');
      getDocs.mockRejectedValue(new Error('Firestore error'));

      await expect(workoutsService.getByClientId('client1')).rejects.toThrow('Firestore error');
    });
  });

  describe('getById', () => {
    it('should get workout by id', async () => {
      const mockWorkout = {
        id: 'w1',
        exists: () => true,
        data: () => ({
          name: 'Тренування 1',
          clientId: 'client1',
          weeks: [],
        }),
      };

      doc.mockReturnValue('workout-ref');
      getDoc.mockResolvedValue(mockWorkout);

      const result = await workoutsService.getById('w1');

      expect(doc).toHaveBeenCalledWith({}, 'workouts', 'w1');
      expect(result.id).toBe('w1');
      expect(result.name).toBe('Тренування 1');
    });

    it('should return null if workout not found', async () => {
      const mockWorkout = {
        exists: () => false,
      };

      doc.mockReturnValue('workout-ref');
      getDoc.mockResolvedValue(mockWorkout);

      const result = await workoutsService.getById('w999');

      expect(result).toBeNull();
    });

    it('should handle errors', async () => {
      doc.mockReturnValue('workout-ref');
      getDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(workoutsService.getById('w1')).rejects.toThrow('Firestore error');
    });
  });

  describe('create', () => {
    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(1234567890);
    });

    afterEach(() => {
      Date.now.mockRestore();
    });

    it('should create workout with provided id', async () => {
      const workoutData = {
        id: 'custom-id',
        name: 'Нове тренування',
        clientId: 'client1',
        weeks: [
          {
            days: {
              day1: {
                exercises: [
                  {
                    name: 'Жим',
                    exerciseData: { sets: '3', reps: '10', weight: '' },
                  },
                ],
              },
            },
          },
        ],
      };

      doc.mockReturnValue('workout-ref');
      setDoc.mockResolvedValue();

      const result = await workoutsService.create(workoutData);

      expect(doc).toHaveBeenCalledWith({}, 'workouts', 'custom-id');
      expect(setDoc).toHaveBeenCalledWith('workout-ref', {
        name: 'Нове тренування',
        clientId: 'client1',
        weeks: expect.any(Array),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      expect(result.id).toBe('custom-id');
    });

    it('should create workout with auto-generated id', async () => {
      const workoutData = {
        name: 'Нове тренування',
        clientId: 'client1',
        weeks: [],
      };

      doc.mockReturnValue('workout-ref');
      setDoc.mockResolvedValue();

      const result = await workoutsService.create(workoutData);

      expect(doc).toHaveBeenCalledWith({}, 'workouts', 'workout_1234567890');
      expect(result.id).toBe('workout_1234567890');
    });

    it('should clean empty exercise data', async () => {
      const workoutData = {
        name: 'Тренування',
        clientId: 'client1',
        weeks: [
          {
            days: {
              day1: {
                exercises: [
                  {
                    name: 'Жим',
                    exerciseData: { sets: '3', reps: '', weight: null },
                  },
                ],
              },
            },
          },
        ],
      };

      doc.mockReturnValue('workout-ref');
      setDoc.mockResolvedValue();

      await workoutsService.create(workoutData);

      const savedData = setDoc.mock.calls[0][1];
      const exercise = savedData.weeks[0].days.day1.exercises[0];
      expect(exercise.exerciseData).toEqual({ sets: '3' });
    });

    it('should handle group exercises', async () => {
      const workoutData = {
        name: 'Тренування',
        clientId: 'client1',
        weeks: [
          {
            days: {
              day1: {
                exercises: [
                  {
                    type: 'group',
                    exercises: [
                      {
                        name: 'Жим',
                        exerciseData: { sets: '3', reps: '' },
                      },
                    ],
                  },
                ],
              },
            },
          },
        ],
      };

      doc.mockReturnValue('workout-ref');
      setDoc.mockResolvedValue();

      await workoutsService.create(workoutData);

      const savedData = setDoc.mock.calls[0][1];
      const groupExercise = savedData.weeks[0].days.day1.exercises[0];
      expect(groupExercise.type).toBe('group');
      expect(groupExercise.exercises[0].exerciseData).toEqual({ sets: '3' });
    });

    it('should handle errors', async () => {
      const workoutData = {
        name: 'Тренування',
        clientId: 'client1',
        weeks: [],
      };

      doc.mockReturnValue('workout-ref');
      setDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(workoutsService.create(workoutData)).rejects.toThrow('Firestore error');
    });
  });

  describe('update', () => {
    it('should update workout', async () => {
      const workoutData = {
        id: 'w1',
        name: 'Оновлене тренування',
        clientId: 'client1',
        weeks: [
          {
            days: {
              day1: {
                exercises: [
                  {
                    name: 'Жим',
                    exerciseData: { sets: '4', reps: '8', weight: '' },
                  },
                ],
              },
            },
          },
        ],
      };

      doc.mockReturnValue('workout-ref');
      setDoc.mockResolvedValue();

      const result = await workoutsService.update('w1', workoutData);

      expect(doc).toHaveBeenCalledWith({}, 'workouts', 'w1');
      expect(setDoc).toHaveBeenCalledWith(
        'workout-ref',
        {
          name: 'Оновлене тренування',
          clientId: 'client1',
          weeks: expect.any(Array),
          updatedAt: expect.any(String),
        },
        { merge: true }
      );
      expect(result.id).toBe('w1');
    });

    it('should clean empty exercise data on update', async () => {
      const workoutData = {
        name: 'Тренування',
        clientId: 'client1',
        weeks: [
          {
            days: {
              day1: {
                exercises: [
                  {
                    name: 'Жим',
                    exerciseData: { sets: '3', reps: '', weight: null },
                  },
                ],
              },
            },
          },
        ],
      };

      doc.mockReturnValue('workout-ref');
      setDoc.mockResolvedValue();

      await workoutsService.update('w1', workoutData);

      const savedData = setDoc.mock.calls[0][1];
      const exercise = savedData.weeks[0].days.day1.exercises[0];
      expect(exercise.exerciseData).toEqual({ sets: '3' });
    });

    it('should handle errors', async () => {
      const workoutData = {
        name: 'Тренування',
        clientId: 'client1',
        weeks: [],
      };

      doc.mockReturnValue('workout-ref');
      setDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(workoutsService.update('w1', workoutData)).rejects.toThrow('Firestore error');
    });
  });

  describe('delete', () => {
    it('should delete workout', async () => {
      doc.mockReturnValue('workout-ref');
      deleteDoc.mockResolvedValue();

      const result = await workoutsService.delete('w1');

      expect(doc).toHaveBeenCalledWith({}, 'workouts', 'w1');
      expect(deleteDoc).toHaveBeenCalledWith('workout-ref');
      expect(result).toBe(true);
    });

    it('should convert numeric id to string', async () => {
      doc.mockReturnValue('workout-ref');
      deleteDoc.mockResolvedValue();

      await workoutsService.delete(123);

      expect(doc).toHaveBeenCalledWith({}, 'workouts', '123');
    });

    it('should handle errors', async () => {
      doc.mockReturnValue('workout-ref');
      deleteDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(workoutsService.delete('w1')).rejects.toThrow('Firestore error');
    });
  });

  describe('createMultiple', () => {
    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(1234567890);
    });

    afterEach(() => {
      Date.now.mockRestore();
    });

    it('should create multiple workouts', async () => {
      const workouts = [
        {
          name: 'Тренування 1',
          clientId: 'client1',
          weeks: [],
        },
        {
          name: 'Тренування 2',
          clientId: 'client1',
          weeks: [],
        },
      ];

      doc.mockReturnValue('workout-ref');
      setDoc.mockResolvedValue();

      const results = await workoutsService.createMultiple(workouts);

      expect(setDoc).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Тренування 1');
      expect(results[1].name).toBe('Тренування 2');
    });

    it('should handle empty array', async () => {
      const results = await workoutsService.createMultiple([]);

      expect(setDoc).not.toHaveBeenCalled();
      expect(results).toEqual([]);
    });

    it('should handle errors', async () => {
      const workouts = [
        {
          name: 'Тренування 1',
          clientId: 'client1',
          weeks: [],
        },
      ];

      doc.mockReturnValue('workout-ref');
      setDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(workoutsService.createMultiple(workouts)).rejects.toThrow('Firestore error');
    });
  });
});
