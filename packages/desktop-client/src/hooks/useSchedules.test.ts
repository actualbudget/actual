import { q } from '@actual-app/core/shared/query';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { liveQuery } from '#queries/liveQuery';
import type { LiveQuery } from '#queries/liveQuery';

import { getSchedulesQuery, useSchedules } from './useSchedules';

vi.mock('#queries/liveQuery', () => ({
  liveQuery: vi.fn(),
}));

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
