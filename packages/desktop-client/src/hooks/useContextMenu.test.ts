import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { addItems } from '#contextmenu/contextMenuSlice';

import { useContextMenu, useContextMenuState } from './useContextMenu';

// Mock dependencies
vi.mock('#redux', () => ({
  useDispatch: vi.fn(),
  useSelector: vi.fn(),
}));

vi.mock('#hooks/useRefEventListener', () => ({
  useRefEventListener: vi.fn(),
}));

import { useRefEventListener } from '#hooks/useRefEventListener';
import * as ReduxMock from '#redux';

describe('useContextMenu', () => {
  let mockDispatch: any;
  let mockTriggerRef: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDispatch = vi.fn();
    (ReduxMock.useDispatch as any).mockReturnValue(mockDispatch);

    mockTriggerRef = {
      current: {
        getBoundingClientRect: vi.fn(() => ({ x: 100, y: 200, height: 50 })),
        dispatchEvent: vi.fn(),
      },
    };
  });

  it('should register contextmenu event listener on triggerRef', () => {
    const items = [{ name: 'test', text: 'Test', onClick: () => {} }];

    renderHook(() => useContextMenu({ triggerRef: mockTriggerRef, items }));

    expect(useRefEventListener).toHaveBeenCalledWith(
      mockTriggerRef,
      'contextmenu',
      expect.any(Function),
    );
  });

  it('should dispatch addItems when contextmenu event is fired and enabled is true', () => {
    const items = [{ name: 'test', text: 'Test', onClick: () => {} }];

    renderHook(() => useContextMenu({ triggerRef: mockTriggerRef, items }));

    const listener = (useRefEventListener as any).mock.calls[0][2];

    // Simulate event
    listener({ preventDefault: vi.fn(), clientX: 100, clientY: 200 } as unknown as MouseEvent);

    expect(mockDispatch).toHaveBeenCalledWith(addItems(items));
  });

    it('should not dispatch addItems when enabled is false', () => {
      const items = [{ name: 'test', text: 'Test', onClick: () => {} }];
  
      renderHook(() =>
        useContextMenu({ triggerRef: mockTriggerRef, enabled: false, items }),
      );
  
      const listener = (useRefEventListener as any).mock.calls[0][2];
  
      // Simulate event
      listener({ preventDefault: vi.fn(), clientX: 100, clientY: 200 } as unknown as MouseEvent);
  
      expect(mockDispatch).not.toHaveBeenCalled();
    });

  it('should provide handleContextMenu callback that dispatches contextmenu event', () => {
    const items = [{ name: 'test', text: 'Test', onClick: () => {} }];

    const { result } = renderHook(() =>
      useContextMenu({ triggerRef: mockTriggerRef, items }),
    );

    act(() => {
      result.current.handleContextMenu();
    });

    expect(mockTriggerRef.current.getBoundingClientRect).toHaveBeenCalled();
    expect(mockTriggerRef.current.dispatchEvent).toHaveBeenCalled();

    const dispatchedEvent =
      mockTriggerRef.current.dispatchEvent.mock.calls[0][0];
    expect(dispatchedEvent.type).toBe('contextmenu');
    expect(dispatchedEvent.clientX).toBe(100);
    expect(dispatchedEvent.clientY).toBe(250); // y + height (200 + 50)
  });

  it('handleContextMenu should do nothing if enabled is false', () => {
    const items = [{ name: 'test', text: 'Test', onClick: () => {} }];

    const { result } = renderHook(() =>
      useContextMenu({ triggerRef: mockTriggerRef, enabled: false, items }),
    );

    act(() => {
      result.current.handleContextMenu();
    });

    expect(mockTriggerRef.current.dispatchEvent).not.toHaveBeenCalled();
  });
});
