import type * as React from 'react';

import { q } from '@actual-app/core/shared/query';
import type { Query } from '@actual-app/core/shared/query';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { liveQuery } from '#queries/liveQuery';
import type { LiveQuery } from '#queries/liveQuery';

import { getSchedulesQuery, useSchedules } from './useSchedules';

vi.mock('#queries/liveQuery', () => ({
  liveQuery: vi.fn(),
}));

// Count state updates the hook schedules. Every transaction row calls this
// hook, so a state update on mount is queued for each row the virtualized
// list mounts while scrolling (#9170).
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

vi.mock('./useSyncedPref', () => ({
  useSyncedPref: () => ['7', vi.fn()],
}));

type LiveQueryCall = {
  onData: (data: unknown[], previousData: unknown[]) => void;
  unsubscribe: ReturnType<typeof vi.fn>;
};

describe('useSchedules', () => {
  let calls: LiveQueryCall[];

  beforeEach(() => {
    vi.clearAllMocks();
    calls = [];
    setStateCalls.count = 0;

    // `vi.mocked` keeps the mock bound to the real `liveQuery` signature, so a
    // change to how the hook calls it still fails typecheck.
    vi.mocked(liveQuery).mockImplementation((_query, { onData }) => {
      const handle = {
        onData: onData ?? vi.fn(),
        unsubscribe: vi.fn(),
      };
      calls.push(handle);
      // `LiveQuery` is a class with private state; only the subscription
      // surface used by the hook is faked here.
      return handle as unknown as LiveQuery<unknown>;
    });
  });

  it('does not update state when mounted without a query', () => {
    const { result } = renderHook(() => useSchedules({}));

    expect(result.current.error).toBeUndefined();
    expect(setStateCalls.count).toBe(0);
  });

  it('does not update state when re-rendered without a query', () => {
    const { rerender } = renderHook(() => useSchedules({}));

    rerender();
    rerender();

    expect(setStateCalls.count).toBe(0);
  });

  it('reports an error for a query on the wrong table', () => {
    // Build the query once: a new query object every render would re-run
    // the effect forever.
    const query = q('transactions').select('*');
    const { result } = renderHook(() => useSchedules({ query }));

    expect(result.current.error?.message).toBe(
      'Query must be a schedules query.',
    );
    expect(result.current.isLoading).toBe(false);
    expect(liveQuery).not.toHaveBeenCalled();
  });

  it('clears a previous error when the query changes', () => {
    const { result, rerender } = renderHook<
      ReturnType<typeof useSchedules>,
      { query: Query | undefined }
    >(({ query }) => useSchedules({ query }), {
      initialProps: { query: q('transactions').select('*') },
    });
    expect(result.current.error).toBeDefined();

    rerender({ query: q('schedules').select('*') });
    expect(result.current.error).toBeUndefined();

    rerender({ query: q('transactions').select('*') });
    expect(result.current.error).toBeDefined();

    rerender({ query: undefined });
    expect(result.current.error).toBeUndefined();
  });

  it('does not open any live query when no query is given', () => {
    renderHook(() => useSchedules({}));

    expect(liveQuery).not.toHaveBeenCalled();
  });

  it('unsubscribes the previous status query when schedules refresh', () => {
    renderHook(() => useSchedules({ query: q('schedules').select('*') }));

    // The schedules query is opened first; its onData opens the status query.
    expect(calls).toHaveLength(1);
    const schedulesQuery = calls[0];

    schedulesQuery.onData([], []);
    expect(calls).toHaveLength(2);
    const firstStatusQuery = calls[1];
    expect(firstStatusQuery.unsubscribe).not.toHaveBeenCalled();

    // A refresh must tear down the previous status query rather than orphaning
    // it — an orphan stays subscribed to sync events and keeps re-running.
    schedulesQuery.onData([], []);
    expect(firstStatusQuery.unsubscribe).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(3);
  });

  it('unsubscribes both queries on unmount', () => {
    const { unmount } = renderHook(() =>
      useSchedules({ query: q('schedules').select('*') }),
    );

    calls[0].onData([], []);
    expect(calls).toHaveLength(2);

    unmount();

    expect(calls[0].unsubscribe).toHaveBeenCalled();
    expect(calls[1].unsubscribe).toHaveBeenCalled();
  });
});

describe('getSchedulesQuery', () => {
  it('loads split schedules for concrete account views', () => {
    const query = getSchedulesQuery('savings');

    expect(query.state.filterExpressions).toContainEqual({
      $or: [
        { _account: 'savings' },
        { '_payee.transfer_acct': 'savings' },
        { _has_splits: true },
      ],
    });
  });
});
