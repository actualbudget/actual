import { act, renderHook } from '@testing-library/react';

import {
  HOVER_MENU_CLOSE_DELAY,
  HOVER_MENU_OPEN_DELAY,
  isPointInsideRect,
  useHoverMenu,
} from './useHoverMenu';

function rect(left: number, top: number, right: number, bottom: number) {
  return {
    left,
    top,
    right,
    bottom,
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
    toJSON: () => ({}),
  } as DOMRect;
}

function movePointer(x: number, y: number) {
  document.dispatchEvent(
    new MouseEvent('pointermove', { clientX: x, clientY: y, bubbles: true }),
  );
}

describe('useHoverMenu', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setup() {
    const hook = renderHook(() => useHoverMenu({ isHoverEnabled: true }));
    const trigger = document.createElement('button');
    trigger.getBoundingClientRect = () => rect(100, 100, 140, 130);
    const popover = document.createElement('div');
    popover.getBoundingClientRect = () => rect(60, 132, 260, 300);
    act(() => {
      hook.result.current.triggerRef.current = trigger;
      hook.result.current.popoverRef.current = popover;
    });
    return hook;
  }

  it('opens after resting the pointer on the trigger', () => {
    const { result } = setup();
    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.triggerProps.onHoverStart();
    });
    expect(result.current.isOpen).toBe(false);

    act(() => {
      vi.advanceTimersByTime(HOVER_MENU_OPEN_DELAY + 1);
    });
    expect(result.current.isOpen).toBe(true);
    expect(result.current.isPinned).toBe(false);
  });

  it('does not open when the pointer leaves before the delay', () => {
    const { result } = setup();

    act(() => {
      result.current.triggerProps.onHoverStart();
      result.current.triggerProps.onHoverEnd();
      vi.advanceTimersByTime(HOVER_MENU_OPEN_DELAY * 2);
    });
    expect(result.current.isOpen).toBe(false);
  });

  it('closes a hover-opened menu once the pointer leaves trigger and menu', () => {
    const { result } = setup();

    act(() => {
      result.current.triggerProps.onHoverStart();
      vi.advanceTimersByTime(HOVER_MENU_OPEN_DELAY + 1);
    });
    expect(result.current.isOpen).toBe(true);

    // Moving from the trigger into the menu keeps it open.
    act(() => {
      movePointer(120, 131);
      vi.advanceTimersByTime(HOVER_MENU_CLOSE_DELAY * 2);
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      movePointer(150, 200);
      vi.advanceTimersByTime(HOVER_MENU_CLOSE_DELAY * 2);
    });
    expect(result.current.isOpen).toBe(true);

    // Leaving both closes it after the grace period.
    act(() => {
      movePointer(500, 500);
      vi.advanceTimersByTime(HOVER_MENU_CLOSE_DELAY / 2);
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      vi.advanceTimersByTime(HOVER_MENU_CLOSE_DELAY);
    });
    expect(result.current.isOpen).toBe(false);
  });

  it('returning to the menu before the grace period ends cancels the close', () => {
    const { result } = setup();

    act(() => {
      result.current.triggerProps.onHoverStart();
      vi.advanceTimersByTime(HOVER_MENU_OPEN_DELAY + 1);
      movePointer(500, 500);
      vi.advanceTimersByTime(HOVER_MENU_CLOSE_DELAY / 2);
      movePointer(150, 200);
      vi.advanceTimersByTime(HOVER_MENU_CLOSE_DELAY * 2);
    });
    expect(result.current.isOpen).toBe(true);
  });

  it('clicking pins the menu so it persists when the pointer leaves', () => {
    const { result } = setup();

    act(() => {
      result.current.triggerProps.onHoverStart();
      vi.advanceTimersByTime(HOVER_MENU_OPEN_DELAY + 1);
    });
    expect(result.current.isPinned).toBe(false);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(true);
    expect(result.current.isPinned).toBe(true);

    act(() => {
      movePointer(500, 500);
      vi.advanceTimersByTime(HOVER_MENU_CLOSE_DELAY * 3);
    });
    expect(result.current.isOpen).toBe(true);

    // A second click on the trigger closes the pinned menu.
    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(false);
    expect(result.current.isPinned).toBe(false);
  });

  it('clicking a closed trigger opens and pins the menu immediately', () => {
    const { result } = setup();

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(true);
    expect(result.current.isPinned).toBe(true);
  });

  it('ignores hovering when hover is disabled', () => {
    const { result } = renderHook(() =>
      useHoverMenu({ isHoverEnabled: false }),
    );

    act(() => {
      result.current.triggerProps.onHoverStart();
      vi.advanceTimersByTime(HOVER_MENU_OPEN_DELAY * 2);
    });
    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(true);
  });

  it('supports controlled open state', () => {
    const onOpenChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ isOpen }) =>
        useHoverMenu({ isOpen, onOpenChange, isHoverEnabled: true }),
      { initialProps: { isOpen: false } },
    );

    act(() => {
      result.current.toggle();
    });
    expect(onOpenChange).toHaveBeenCalledWith(true);
    // Still closed until the owner flips the prop.
    expect(result.current.isOpen).toBe(false);

    rerender({ isOpen: true });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.onOpenChange(false);
    });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('closes when clicking anywhere outside the trigger and the menu', () => {
    const { result } = setup();
    const popover = result.current.popoverRef.current!;
    document.body.appendChild(popover);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(true);

    // Clicks inside the menu keep it open...
    act(() => {
      popover.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    });
    expect(result.current.isOpen).toBe(true);

    // ...clicks elsewhere close it.
    act(() => {
      document.body.dispatchEvent(
        new MouseEvent('pointerdown', { bubbles: true }),
      );
    });
    expect(result.current.isOpen).toBe(false);
    popover.remove();
  });

  it('does not treat clicks on the trigger as outside interactions', () => {
    const { result } = setup();
    const trigger = result.current.triggerRef.current!;
    const child = document.createElement('span');
    trigger.appendChild(child);

    expect(
      result.current.popoverProps.shouldCloseOnInteractOutside(child),
    ).toBe(false);
    expect(
      result.current.popoverProps.shouldCloseOnInteractOutside(
        document.createElement('div'),
      ),
    ).toBe(true);
  });
});

describe('isPointInsideRect', () => {
  it('includes a tolerance around the rectangle', () => {
    const r = { left: 10, top: 10, right: 20, bottom: 20 };
    expect(isPointInsideRect(r, 15, 15)).toBe(true);
    expect(isPointInsideRect(r, 25, 15, 8)).toBe(true);
    expect(isPointInsideRect(r, 30, 15, 8)).toBe(false);
    expect(isPointInsideRect(undefined, 15, 15)).toBe(false);
    expect(isPointInsideRect(null, 15, 15)).toBe(false);
  });
});
