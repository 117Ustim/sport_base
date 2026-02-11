// Тесты для useExercises hook
import { renderHook, waitFor } from '@testing-library/react';
import { useExercises } from '../useExercises';

// Mock сервиса - ВАЖНО: мокаем ДО импорта хука
jest.mock('../../firebase/services', () => ({
  exercisesService: {
    getAll: jest.fn(() => Promise.resolve([])),
    getBySex: jest.fn((sex) => Promise.resolve([])),
  },
}));

describe('useExercises', () => {
  beforeEach(() => {
    // Очищаем моки перед каждым тестом
    jest.clearAllMocks();
  });

  it('should load exercises successfully', async () => {
    const mockExercises = [
      { id: '1', name: 'Exercise 1' },
      { id: '2', name: 'Exercise 2' },
    ];
    
    const { exercisesService } = require('../../firebase/services');
    exercisesService.getAll.mockResolvedValue(mockExercises);
    
    const { result } = renderHook(() => useExercises());
    
    // Ждем пока загрузка завершится
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.exercises).toEqual(mockExercises);
    expect(result.current.error).toBe(null);
  });

  // TODO: Добавить больше тестов
  it.todo('should filter exercises by sex');
  it.todo('should handle errors');
  it.todo('should refetch exercises');
});
