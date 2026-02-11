// Тесты для useNotification hook
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNotification } from '../useNotification';

// Mock для setTimeout
jest.useFakeTimers();

describe('useNotification', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should initialize with hidden notification', () => {
    const { result } = renderHook(() => useNotification());
    
    expect(result.current.notification.show).toBe(false);
    expect(result.current.notification.message).toBe('');
    expect(result.current.notification.type).toBe('');
  });

  it('should show notification with default type', () => {
    const { result } = renderHook(() => useNotification());
    
    act(() => {
      result.current.showNotification('Test message');
    });
    
    expect(result.current.notification.show).toBe(true);
    expect(result.current.notification.message).toBe('Test message');
    expect(result.current.notification.type).toBe('success');
  });

  it('should show notification with custom type', () => {
    const { result } = renderHook(() => useNotification());
    
    act(() => {
      result.current.showNotification('Error message', 'error');
    });
    
    expect(result.current.notification.show).toBe(true);
    expect(result.current.notification.message).toBe('Error message');
    expect(result.current.notification.type).toBe('error');
  });

  it('should hide notification after 3 seconds', () => {
    const { result } = renderHook(() => useNotification());
    
    act(() => {
      result.current.showNotification('Test message');
    });
    
    expect(result.current.notification.show).toBe(true);
    
    // Перематываем время на 3 секунды
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    
    expect(result.current.notification.show).toBe(false);
    expect(result.current.notification.message).toBe('');
    expect(result.current.notification.type).toBe('');
  });

  it('should handle multiple notifications', () => {
    const { result } = renderHook(() => useNotification());
    
    // Первое уведомление
    act(() => {
      result.current.showNotification('First message', 'info');
    });
    
    expect(result.current.notification.message).toBe('First message');
    
    // Второе уведомление (перезаписывает первое)
    act(() => {
      result.current.showNotification('Second message', 'warning');
    });
    
    expect(result.current.notification.message).toBe('Second message');
    expect(result.current.notification.type).toBe('warning');
  });
});
