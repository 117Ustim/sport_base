// Тесты для useSaveManager hook
import { renderHook, act } from '@testing-library/react';
import { useSaveManager } from '../useSaveManager';

describe('useSaveManager', () => {
  let mockOnSave;
  let mockShowNotification;

  beforeEach(() => {
    mockOnSave = jest.fn(() => Promise.resolve());
    mockShowNotification = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with no unsaved changes', () => {
    const { result } = renderHook(() => 
      useSaveManager({ onSave: mockOnSave, showNotification: mockShowNotification })
    );
    
    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.newItems).toEqual([]);
  });

  it('should mark as changed', () => {
    const { result } = renderHook(() => 
      useSaveManager({ onSave: mockOnSave, showNotification: mockShowNotification })
    );
    
    act(() => {
      result.current.markAsChanged();
    });
    
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('should add new item', () => {
    const { result } = renderHook(() => 
      useSaveManager({ onSave: mockOnSave, showNotification: mockShowNotification })
    );
    
    const newItem = { id: '1', name: 'Test Item' };
    
    act(() => {
      result.current.addNewItem(newItem);
    });
    
    expect(result.current.newItems).toEqual([newItem]);
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('should remove new item', () => {
    const { result } = renderHook(() => 
      useSaveManager({ onSave: mockOnSave, showNotification: mockShowNotification })
    );
    
    const item1 = { id: '1', name: 'Item 1' };
    const item2 = { id: '2', name: 'Item 2' };
    
    act(() => {
      result.current.addNewItem(item1);
      result.current.addNewItem(item2);
    });
    
    expect(result.current.newItems).toHaveLength(2);
    
    act(() => {
      result.current.removeNewItem('1');
    });
    
    expect(result.current.newItems).toHaveLength(1);
    expect(result.current.newItems[0].id).toBe('2');
  });

  it('should save changes successfully', async () => {
    const { result } = renderHook(() => 
      useSaveManager({ onSave: mockOnSave, showNotification: mockShowNotification })
    );
    
    const newItem = { id: '1', name: 'Test Item' };
    
    act(() => {
      result.current.addNewItem(newItem);
    });
    
    await act(async () => {
      await result.current.saveChanges();
    });
    
    expect(mockOnSave).toHaveBeenCalledWith([newItem]);
    expect(mockShowNotification).toHaveBeenCalledWith('Зміни успішно збережено', 'success');
    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.newItems).toEqual([]);
  });

  it('should handle save errors', async () => {
    const mockError = new Error('Save failed');
    mockOnSave.mockRejectedValue(mockError);
    
    const { result } = renderHook(() => 
      useSaveManager({ onSave: mockOnSave, showNotification: mockShowNotification })
    );
    
    act(() => {
      result.current.addNewItem({ id: '1', name: 'Test' });
    });
    
    await expect(async () => {
      await act(async () => {
        await result.current.saveChanges();
      });
    }).rejects.toThrow('Save failed');
    
    expect(mockShowNotification).toHaveBeenCalledWith('Помилка збереження змін', 'error');
    expect(result.current.hasUnsavedChanges).toBe(true); // Остаются несохраненные изменения
  });

  it('should not save if no unsaved changes', async () => {
    const { result } = renderHook(() => 
      useSaveManager({ onSave: mockOnSave, showNotification: mockShowNotification })
    );
    
    await act(async () => {
      await result.current.saveChanges();
    });
    
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('should reset changes', () => {
    const { result } = renderHook(() => 
      useSaveManager({ onSave: mockOnSave, showNotification: mockShowNotification })
    );
    
    act(() => {
      result.current.addNewItem({ id: '1', name: 'Test' });
    });
    
    expect(result.current.hasUnsavedChanges).toBe(true);
    
    act(() => {
      result.current.resetChanges();
    });
    
    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.newItems).toEqual([]);
  });

  it('should set original data', () => {
    const { result } = renderHook(() => 
      useSaveManager({ onSave: mockOnSave, showNotification: mockShowNotification })
    );
    
    const originalData = [{ id: '1', name: 'Original' }];
    
    act(() => {
      result.current.setOriginalData(originalData);
    });
    
    expect(result.current.originalItems).toEqual(originalData);
  });

  it('should handle items with exercise_id field', () => {
    const { result } = renderHook(() => 
      useSaveManager({ onSave: mockOnSave, showNotification: mockShowNotification })
    );
    
    const item = { exercise_id: 'ex1', name: 'Exercise' };
    
    act(() => {
      result.current.addNewItem(item);
    });
    
    act(() => {
      result.current.removeNewItem('ex1');
    });
    
    expect(result.current.newItems).toEqual([]);
  });
});
