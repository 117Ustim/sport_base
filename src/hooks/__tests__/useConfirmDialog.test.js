// Тесты для useConfirmDialog hook
import { renderHook, act } from '@testing-library/react';
import { useConfirmDialog } from '../useConfirmDialog';

describe('useConfirmDialog', () => {
  it('should initialize with closed dialog', () => {
    const { result } = renderHook(() => useConfirmDialog());
    
    expect(result.current.confirmDialog.isOpen).toBe(false);
    expect(result.current.confirmDialog.message).toBe('');
    expect(result.current.confirmDialog.onConfirm).toBe(null);
  });

  it('should open dialog with message', () => {
    const { result } = renderHook(() => useConfirmDialog());
    const mockCallback = jest.fn();
    
    act(() => {
      result.current.showConfirm('Are you sure?', mockCallback);
    });
    
    expect(result.current.confirmDialog.isOpen).toBe(true);
    expect(result.current.confirmDialog.message).toBe('Are you sure?');
    expect(result.current.confirmDialog.onConfirm).toBe(mockCallback);
  });

  it('should call callback and close dialog on confirm', () => {
    const { result } = renderHook(() => useConfirmDialog());
    const mockCallback = jest.fn();
    
    act(() => {
      result.current.showConfirm('Delete item?', mockCallback);
    });
    
    act(() => {
      result.current.handleConfirm();
    });
    
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(result.current.confirmDialog.isOpen).toBe(false);
  });

  it('should close dialog without calling callback on cancel', () => {
    const { result } = renderHook(() => useConfirmDialog());
    const mockCallback = jest.fn();
    
    act(() => {
      result.current.showConfirm('Delete item?', mockCallback);
    });
    
    act(() => {
      result.current.handleCancel();
    });
    
    expect(mockCallback).not.toHaveBeenCalled();
    expect(result.current.confirmDialog.isOpen).toBe(false);
  });

  it('should handle confirm without callback', () => {
    const { result } = renderHook(() => useConfirmDialog());
    
    act(() => {
      result.current.showConfirm('Message', null);
    });
    
    act(() => {
      result.current.handleConfirm();
    });
    
    expect(result.current.confirmDialog.isOpen).toBe(false);
  });
});
