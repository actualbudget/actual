import type * as React from 'react';

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDrop } from './useDragDrop';

// Count every state update `useDrop` schedules so we can assert that simply
// mounting a drop target (as every virtualized transaction row does while
// scrolling) does not queue React work.
const setStateCalls = vi.hoisted(() => ({ count: 0 }));

vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof React>();
  return {
    ...actual,
    useState: ((initial: unknown) => {
      const [value, setValue] = actual.useState(initial);
      return [
        value,
        (next: unknown) => {
          setStateCalls.count++;
          setValue(next);
        },
      ];
    }) as typeof actual.useState,
  };
});

describe('useDrop', () => {
  beforeEach(() => {
    setStateCalls.count = 0;
  });

  it('does not update state when mounted', () => {
    const { result } = renderHook(() =>
      useDrop({ types: 'transaction', id: 'a' }),
    );

    expect(result.current.dropPos).toBeNull();
    expect(result.current.isDropTarget).toBe(false);
    expect(setStateCalls.count).toBe(0);
  });

  it('does not update state when many drop targets mount at once', () => {
    const ids = Array.from({ length: 100 }, (_, i) => `t${i}`);

    for (const id of ids) {
      renderHook(() => useDrop({ types: ['transaction', 'other'], id }));
    }

    expect(setStateCalls.count).toBe(0);
  });

  it('does not update state when re-rendered with a new id', () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useDrop({ types: 'transaction', id }),
      { initialProps: { id: 'a' } },
    );

    rerender({ id: 'b' });

    expect(result.current.dropPos).toBeNull();
    expect(setStateCalls.count).toBe(0);
  });

  it('does not update state when unmounted', () => {
    const { unmount } = renderHook(() =>
      useDrop({ types: 'transaction', id: 'a' }),
    );

    unmount();

    expect(setStateCalls.count).toBe(0);
  });
});
