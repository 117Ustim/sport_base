// Тесты для useGyms hook
import { renderHook, waitFor } from '@testing-library/react';
import { useGyms } from '../useGyms';

// Mock сервиса
jest.mock('../../firebase/services', () => ({
  gymsService: {
    getAll: jest.fn(() => Promise.resolve([])),
  },
}));

describe('useGyms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load gyms successfully', async () => {
    const mockGyms = [
      { id: '1', name: 'Gym 1' },
      { id: '2', name: 'Gym 2' },
    ];
    
    const { gymsService } = require('../../firebase/services');
    gymsService.getAll.mockResolvedValue(mockGyms);
    
    const { result } = renderHook(() => useGyms());
    
    // Ждем пока загрузка завершится
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.gyms).toEqual(mockGyms);
    expect(result.current.error).toBe(null);
  });

  it('should handle errors', async () => {
    const mockError = new Error('Failed to load gyms');
    
    const { gymsService } = require('../../firebase/services');
    gymsService.getAll.mockRejectedValue(mockError);
    
    const { result } = renderHook(() => useGyms());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.gyms).toEqual([]);
    expect(result.current.error).toBe(mockError);
  });

  it('should refetch gyms when refetch is called', async () => {
    const mockGyms = [{ id: '1', name: 'Gym 1' }];
    
    const { gymsService } = require('../../firebase/services');
    gymsService.getAll.mockResolvedValue(mockGyms);
    
    const { result } = renderHook(() => useGyms());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    // Очищаем моки
    jest.clearAllMocks();
    
    // Вызываем refetch
    result.current.refetch();
    
    // Проверяем что сервис вызван снова
    expect(gymsService.getAll).toHaveBeenCalledTimes(1);
  });
});
