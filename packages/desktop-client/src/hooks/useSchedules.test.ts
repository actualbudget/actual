import { q } from '@actual-app/core/shared/query';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { liveQuery } from '#queries/liveQuery';

import { useSchedules } from './useSchedules';

vi.mock('#queries/liveQuery', () => ({
  liveQuery: vi.fn(),
}));

vi.mock('./useSyncedPref', () => ({
  useSyncedPref: () => ['7', vi.fn()],
}));

type LiveQueryCall = {
  onData: (data: unknown[]) => void;
  unsubscribe: Mock;
};

describe('useSchedules', () => {
  let calls: LiveQueryCall[];

  beforeEach(() => {
    vi.clearAllMocks();
    calls = [];

    (liveQuery as unknown as Mock).mockImplementation(
      (_query, { onData }: { onData: (data: unknown[]) => void }) => {
        const handle = { onData, unsubscribe: vi.fn() };
        calls.push(handle);
        return handle;
      },
    );
  });

  it('does not open any live query when no query is given', () => {
    renderHook(() => useSchedules({}));

    expect(liveQuery).not.toHaveBeenCalled();
  });

  it('unsubscribes the previous status query when schedules refresh', () => {
    renderHook(() =>
      useSchedules({ query: q('schedules').select('*') as never }),
    );

    // The schedules query is opened first; its onData opens the status query.
    expect(calls).toHaveLength(1);
    const schedulesQuery = calls[0];

    schedulesQuery.onData([]);
    expect(calls).toHaveLength(2);
    const firstStatusQuery = calls[1];
    expect(firstStatusQuery.unsubscribe).not.toHaveBeenCalled();

    // A refresh must tear down the previous status query rather than orphaning
    // it — an orphan stays subscribed to sync events and keeps re-running.
    schedulesQuery.onData([]);
    expect(firstStatusQuery.unsubscribe).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(3);
  });

  it('unsubscribes both queries on unmount', () => {
    const { unmount } = renderHook(() =>
      useSchedules({ query: q('schedules').select('*') as never }),
    );

    calls[0].onData([]);
    expect(calls).toHaveLength(2);

    unmount();

    expect(calls[0].unsubscribe).toHaveBeenCalled();
    expect(calls[1].unsubscribe).toHaveBeenCalled();
  });
});
