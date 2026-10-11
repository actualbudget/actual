import { send } from '@actual-app/core/platform/client/connection';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { liveQuery } from '#queries/liveQuery';
import type { LiveQuery } from '#queries/liveQuery';

import { useAccountBalanceForecast } from './useAccountBalanceForecast';

vi.mock('#queries/liveQuery', () => ({
  liveQuery: vi.fn(),
}));

vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: vi.fn(),
}));

const accounts = [{ id: 'checking', closed: false, offbudget: false }];
vi.mock('./useAccounts', () => ({
  useAccounts: () => ({ data: accounts }),
}));

const schedules: never[] = [];
vi.mock('./useCachedSchedules', () => ({
  useCachedSchedules: () => ({ schedules }),
}));

vi.mock('./useSyncedPref', () => ({
  useSyncedPref: () => ['1-month', vi.fn()],
}));

type LiveQueryCall = {
  onData: (data: unknown[], previousData: unknown[]) => void;
  unsubscribe: ReturnType<typeof vi.fn>;
};

describe('useAccountBalanceForecast', () => {
  let calls: LiveQueryCall[];

  beforeEach(() => {
    vi.clearAllMocks();
    calls = [];

    vi.mocked(liveQuery).mockImplementation((_query, { onData }) => {
      const handle = {
        onData: onData ?? vi.fn(),
        unsubscribe: vi.fn(),
      };
      calls.push(handle);
      return handle as unknown as LiveQuery<unknown>;
    });
    vi.mocked(send).mockResolvedValue({
      dataPoints: [
        {
          date: '2016-01-01',
          balance: 100,
          accountId: 'checking',
          accountName: 'checking',
          transactions: [],
        },
      ],
      lowestBalance: 100,
    });
  });

  // The account's first and last transaction dates, in the order the hook
  // opens their queries.
  function reportDateRange(first: string, last: string) {
    act(() => {
      calls[calls.length - 2].onData([{ date: first }], []);
      calls[calls.length - 1].onData([{ date: last }], []);
    });
  }

  it('waits for both ends of the date range before generating', async () => {
    renderHook(() =>
      useAccountBalanceForecast({ accountId: 'checking', isEnabled: true }),
    );

    act(() => calls[0].onData([{ date: '2016-01-01' }], []));
    expect(send).not.toHaveBeenCalled();

    act(() => calls[1].onData([{ date: '2016-02-01' }], []));
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(send).toHaveBeenCalledWith(
      'forecast/generate',
      expect.objectContaining({
        accountIds: ['checking'],
        startDate: '2016-01-01',
      }),
    );
  });

  it("doesn't use the previous account's range or points", async () => {
    const { result, rerender } = renderHook(
      ({ accountId }) =>
        useAccountBalanceForecast({ accountId, isEnabled: true }),
      { initialProps: { accountId: 'checking' } },
    );

    reportDateRange('2016-01-01', '2016-02-01');
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.points).toHaveLength(1);

    rerender({ accountId: 'savings' });
    expect(result.current.points).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);

    reportDateRange('2015-06-01', '2016-02-01');
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    expect(send).toHaveBeenLastCalledWith(
      'forecast/generate',
      expect.objectContaining({
        accountIds: ['savings'],
        startDate: '2015-06-01',
      }),
    );
  });

  it('forecasts every open account in the all accounts view', async () => {
    const { result } = renderHook(() =>
      useAccountBalanceForecast({ accountId: undefined, isEnabled: true }),
    );
    expect(result.current.points).toEqual([]);
    expect(result.current.isLoading).toBe(true);

    reportDateRange('2016-01-01', '2016-02-01');
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(send).toHaveBeenCalledWith(
      'forecast/generate',
      expect.objectContaining({
        accountIds: ['checking'],
        includeAccountlessSchedules: true,
      }),
    );
    expect(result.current.points).toHaveLength(1);
  });

  it('stops loading when the forecast fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(vi.fn());
    vi.mocked(send).mockRejectedValue(new Error('failed'));

    const { result } = renderHook(() =>
      useAccountBalanceForecast({ accountId: 'checking', isEnabled: true }),
    );

    reportDateRange('2016-01-01', '2016-02-01');
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.points).toEqual([]);
  });
});
