import type { ReactNode } from 'react';

import {
  clearServer,
  initServer,
} from '@actual-app/core/platform/client/connection';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestAppStore, resetTestProviders, TestProviders } from '#mocks';

import { useUpdateExchangeRates } from './useUpdateExchangeRates';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const status = {
  added: 4,
  updated: 0,
  unchanged: 0,
  unsupported: [],
  errors: [],
  time: '2026-10-24T12:00:00.000Z',
};

describe('useUpdateExchangeRates', () => {
  let store: ReturnType<typeof createTestAppStore>;
  const update = vi.fn();

  function wrapper({ children }: { children: ReactNode }) {
    return <TestProviders store={store}>{children}</TestProviders>;
  }

  function messages() {
    return store
      .getState()
      .notifications.notifications.map(notification => notification.message);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    resetTestProviders();
    store = createTestAppStore();
    initServer({ 'exchange-rates-update': update });
  });

  afterEach(async () => {
    await clearServer();
  });

  it('shows that rates are being fetched, then how many were added', async () => {
    let finish: (value: typeof status) => void = () => undefined;
    update.mockReturnValue(
      new Promise(resolve => {
        finish = resolve;
      }),
    );
    const { result } = renderHook(() => useUpdateExchangeRates(), { wrapper });

    let done: Promise<void> = Promise.resolve();
    act(() => {
      done = result.current({ showProgress: true });
    });
    expect(messages()).toEqual(['Getting exchange rates from Frankfurter…']);

    await act(async () => {
      finish(status);
      await done;
    });
    expect(messages()).toEqual(['Exchange rates updated: 4 new rates.']);
  });

  it('reports an update that failed', async () => {
    update.mockResolvedValue({ ...status, added: 0, errors: ['offline'] });
    const { result } = renderHook(() => useUpdateExchangeRates(), { wrapper });

    await act(() => result.current());

    expect(messages()).toEqual(['Could not update exchange rates: offline']);
  });
});
