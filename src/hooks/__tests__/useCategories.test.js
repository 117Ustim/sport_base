// Тесты для useCategories hook
import { renderHook, waitFor } from '@testing-library/react';
import { useCategories } from '../useCategories';

// Mock сервиса
jest.mock('../../firebase/services', () => ({
  categoriesService: {
    getAll: jest.fn(() => Promise.resolve([])),
  },
}));

describe('useCategories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load categories successfully', async () => {
    const mockCategories = [
      { id: '1', name: 'Category 1' },
      { id: '2', name: 'Category 2' },
    ];
    
    const { categoriesService } = require('../../firebase/services');
    categoriesService.getAll.mockResolvedValue(mockCategories);
    
    const { result } = renderHook(() => useCategories());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.categories).toEqual(mockCategories);
    expect(result.current.error).toBe(null);
  });

  it('should handle errors', async () => {
    const mockError = new Error('Failed to load categories');
    
    const { categoriesService } = require('../../firebase/services');
    categoriesService.getAll.mockRejectedValue(mockError);
    
    const { result } = renderHook(() => useCategories());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.categories).toEqual([]);
    expect(result.current.error).toBe(mockError);
  });

  it('should refetch categories when refetch is called', async () => {
    const mockCategories = [{ id: '1', name: 'Category 1' }];
    
    const { categoriesService } = require('../../firebase/services');
    categoriesService.getAll.mockResolvedValue(mockCategories);
    
    const { result } = renderHook(() => useCategories());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    jest.clearAllMocks();
    
    result.current.refetch();
    
    expect(categoriesService.getAll).toHaveBeenCalledTimes(1);
  });
});
