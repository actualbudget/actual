import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCategoryBalances } from './useCategoryBalances';

type Callback = (result: { name: string; value: unknown }) => void;

const bound = new Map<string, Callback>();
// Values the fake spreadsheet reports immediately when a cell is bound,
// like the real spreadsheet does for cells it has cached.
let cachedValues: Record<string, number> = {};

vi.mock('./useSpreadsheet', () => {
  const spreadsheet = {
    bind: (sheet: string, name: string, callback: Callback) => {
      const cell = `${sheet}!${name}`;
      bound.set(cell, callback);
      if (cell in cachedValues) {
        callback({ name: cell, value: cachedValues[cell] });
      }
      return () => {
        bound.delete(cell);
      };
    },
  };
  return { useSpreadsheet: () => spreadsheet };
});

const MONTHS = ['2026-09'];

describe('useCategoryBalances', () => {
  beforeEach(() => {
    bound.clear();
    cachedValues = {};
  });

  it('returns the balances of the bound categories', () => {
    cachedValues = { 'budget202609!leftover-a': 500 };
    const { result } = renderHook(() =>
      useCategoryBalances(['a', 'b'], MONTHS, true),
    );

    expect(result.current.get('a')).toEqual([500]);
    expect(result.current.has('b')).toBe(false);

    act(() => {
      bound.get('budget202609!leftover-b')?.({
        name: 'budget202609!leftover-b',
        value: -100,
      });
    });
    expect(result.current.get('b')).toEqual([-100]);
  });

  it('returns nothing and binds nothing while disabled', () => {
    cachedValues = { 'budget202609!leftover-a': 500 };
    const { result } = renderHook(() =>
      useCategoryBalances(['a'], MONTHS, false),
    );

    expect(result.current.size).toBe(0);
    expect(bound.size).toBe(0);
  });

  it('does not expose old balances when re-enabled', () => {
    cachedValues = { 'budget202609!leftover-a': 500 };
    const { result, rerender } = renderHook(
      ({ enabled }) => useCategoryBalances(['a'], MONTHS, enabled),
      { initialProps: { enabled: true } },
    );
    expect(result.current.get('a')).toEqual([500]);

    rerender({ enabled: false });
    expect(result.current.size).toBe(0);

    // The balance changes while nothing is subscribed, and the fresh value
    // has not arrived yet when the filter is turned back on.
    cachedValues = {};
    rerender({ enabled: true });
    expect(result.current.has('a')).toBe(false);

    act(() => {
      bound.get('budget202609!leftover-a')?.({
        name: 'budget202609!leftover-a',
        value: -200,
      });
    });
    expect(result.current.get('a')).toEqual([-200]);
  });

  it('does not expose old balances when the categories change', () => {
    cachedValues = { 'budget202609!leftover-a': 500 };
    const { result, rerender } = renderHook(
      ({ ids }) => useCategoryBalances(ids, MONTHS, true),
      { initialProps: { ids: ['a'] } },
    );
    expect(result.current.get('a')).toEqual([500]);

    cachedValues = {};
    rerender({ ids: ['a', 'b'] });
    expect(result.current.size).toBe(0);
  });
});
