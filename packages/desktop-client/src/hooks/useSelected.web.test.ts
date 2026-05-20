import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useSelected } from './useSelected';

vi.mock('@actual-app/core/platform/client/connection', () => ({
  listen: vi.fn(() => vi.fn()),
}));

vi.mock('@actual-app/core/platform/client/undo', () => ({
  getTaggedState: vi.fn(),
  getUndoState: vi.fn(),
  setUndoState: vi.fn(),
}));

const items = [
  { id: 'visible-1', visible: true },
  { id: 'hidden-1', visible: false },
  { id: 'visible-2', visible: true },
];

describe('useSelected', () => {
  it('does not include filtered-out rows in range selection', () => {
    const { result } = renderHook(() =>
      useSelected('transactions', items, [], item => item.visible),
    );

    act(() => {
      result.current.dispatch({ type: 'select', id: 'visible-1' });
    });

    act(() => {
      result.current.dispatch({
        type: 'select',
        id: 'visible-2',
        isRangeSelect: true,
      });
    });

    expect([...result.current.items]).toEqual(['visible-1', 'visible-2']);
  });
});
