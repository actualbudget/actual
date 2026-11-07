import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useBudgetType } from './useBudgetType';
import { useSyncedPref } from './useSyncedPref';

vi.mock('./useSyncedPref', () => ({ useSyncedPref: vi.fn() }));

describe('useBudgetType', () => {
  it.each([
    ['tracking', 'tracking'],
    ['envelope', 'envelope'],
    [undefined, 'envelope'],
    ['', 'envelope'],
    ['rollover', 'envelope'],
  ])('resolves the pref %j to %s', (pref, expected) => {
    vi.mocked(useSyncedPref).mockReturnValue([pref, vi.fn()]);

    const { result } = renderHook(() => useBudgetType());

    expect(result.current).toBe(expected);
  });
});
