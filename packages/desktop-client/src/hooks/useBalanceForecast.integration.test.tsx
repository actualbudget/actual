import type { ReactNode } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import type {
  ForecastMissedOccurrences,
  ForecastMissedSchedules,
  ForecastResult,
} from '@actual-app/core/types/models/forecast';
import type { ServerEvents } from '@actual-app/core/types/server-events';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBalanceForecast } from './useBalanceForecast';

const listeners = vi.hoisted(
  () => new Set<(event: ServerEvents['sync-event']) => void>(),
);
vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: vi.fn(),
  listen: vi.fn(
    (name: string, listener: (event: ServerEvents['sync-event']) => void) => {
      if (name === 'sync-event') {
        listeners.add(listener);
      }
      return () => {
        listeners.delete(listener);
      };
    },
  ),
}));

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  listeners.clear();
  vi.mocked(send).mockResolvedValue({
    dataPoints: [],
    lowestBalance: {
      date: '2024-03-01',
      balance: 0,
      accountId: '',
      accountName: '',
    },
    forecastStartDate: '2024-03-01',
    forecastEndDate: '2024-03-31',
  } satisfies ForecastResult);
});

const range = { startDate: '2024-03-01', endDate: '2024-03-31' };

describe('Balance Forecast query', () => {
  it('fetches separately for both policy settings', async () => {
    const { rerender } = renderHook(
      ({
        missedSchedules,
        missedOccurrences,
      }: {
        missedSchedules: ForecastMissedSchedules;
        missedOccurrences: ForecastMissedOccurrences;
      }) =>
        useBalanceForecast({ ...range, missedSchedules, missedOccurrences }),
      {
        wrapper: createWrapper(),
        initialProps: { missedSchedules: 'payments', missedOccurrences: 'one' },
      },
    );
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    rerender({ missedSchedules: 'all', missedOccurrences: 'one' });
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    rerender({ missedSchedules: 'all', missedOccurrences: 'all' });
    await waitFor(() => expect(send).toHaveBeenCalledTimes(3));
    expect(send).toHaveBeenLastCalledWith(
      'forecast/generate',
      expect.objectContaining({
        missedSchedules: 'all',
        missedOccurrences: 'all',
      }),
    );
  });

  it('refreshes after a linked payment changes and unsubscribes on unmount', async () => {
    const { result, unmount } = renderHook(
      () => useBalanceForecast({ ...range, missedSchedules: 'payments' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    act(() => {
      for (const listener of listeners) {
        listener({ type: 'applied', tables: ['transactions'] });
      }
    });
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    unmount();
    expect(listeners.size).toBe(0);
  });
});
