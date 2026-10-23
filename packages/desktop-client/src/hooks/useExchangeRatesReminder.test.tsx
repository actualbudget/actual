import type { ReactNode } from 'react';

import {
  clearServer,
  initServer,
} from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestAppStore, resetTestProviders, TestProviders } from '#mocks';

import { useExchangeRatesReminder } from './useExchangeRatesReminder';
import { useLocalPref } from './useLocalPref';
import { useMultiCurrency } from './useMultiCurrency';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);
vi.mock('./useLocalPref', () => ({ useLocalPref: vi.fn() }));
vi.mock('./useMultiCurrency', () => ({ useMultiCurrency: vi.fn() }));

const missingUsd = {
  currency: 'USD',
  isOutdated: true,
  outdatedSince: '2026-10-20',
  olderTransactionsFrom: null,
  holes: null,
};

describe('useExchangeRatesReminder', () => {
  let store: ReturnType<typeof createTestAppStore>;
  const setLastReminder = vi.fn();
  const check = vi.fn();
  const update = vi.fn();

  function wrapper({ children }: { children: ReactNode }) {
    return <TestProviders store={store}>{children}</TestProviders>;
  }

  async function renderAndWait() {
    renderHook(() => useExchangeRatesReminder(), { wrapper });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    return store.getState().notifications.notifications;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    resetTestProviders();
    store = createTestAppStore();
    vi.mocked(useMultiCurrency).mockReturnValue({
      isEnabled: true,
      defaultCurrencyCode: 'CAD',
      getAccountCurrency: account => account.currency || 'CAD',
    });
    vi.mocked(useLocalPref).mockReturnValue([
      undefined,
      setLastReminder,
      vi.fn(),
    ]);
    check.mockResolvedValue({
      missing: [missingUsd],
      errors: [],
      unsupported: [],
    });
    update.mockResolvedValue({
      added: 3,
      updated: 0,
      unchanged: 0,
      unsupported: [],
      errors: [],
      time: '2026-10-23T12:00:00.000Z',
    });
    initServer({
      'exchange-rates-check': check,
      'exchange-rates-update': update,
    });
  });

  afterEach(async () => {
    vi.useRealTimers();
    await clearServer();
  });

  it('reminds of missing rates, with a button that updates them', async () => {
    const notifications = await renderAndWait();

    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      id: 'exchange-rates-missing',
      type: 'warning',
      message: expect.stringContaining('USD'),
    });
    expect(setLastReminder).toHaveBeenCalledWith(expect.any(String));

    await act(async () => {
      await notifications[0].button?.action();
    });
    expect(update).toHaveBeenCalled();
    expect(store.getState().notifications.notifications).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining('3 new') }),
    );
  });

  it('mentions currencies the provider has no rates for and a failed update', async () => {
    check.mockResolvedValue({
      missing: [missingUsd],
      errors: ['offline'],
      unsupported: ['XAF'],
    });

    const [notification] = await renderAndWait();

    expect(notification.message).toContain('Frankfurter has no rates for XAF.');
    expect(notification.message).toContain(
      'The last automatic update failed: offline',
    );
  });

  it('reports an update that could not run', async () => {
    update.mockRejectedValue(new Error('Server is closed'));
    const [notification] = await renderAndWait();

    await act(async () => {
      await notification.button?.action();
    });

    expect(store.getState().notifications.notifications).toContainEqual(
      expect.objectContaining({
        type: 'error',
        message: expect.stringContaining('Server is closed'),
      }),
    );
  });

  it('tries again next time when the check fails', async () => {
    check.mockRejectedValue(new Error('Server is closed'));

    expect(await renderAndWait()).toHaveLength(0);
    expect(setLastReminder).not.toHaveBeenCalled();
  });

  it('stays quiet when nothing is missing', async () => {
    check.mockResolvedValue(null);

    expect(await renderAndWait()).toHaveLength(0);
    expect(setLastReminder).toHaveBeenCalled();
  });

  it('reminds at most once a day', async () => {
    const today = monthUtils.currentDay();
    vi.mocked(useLocalPref).mockReturnValue([today, setLastReminder, vi.fn()]);

    expect(await renderAndWait()).toHaveLength(0);
    expect(check).not.toHaveBeenCalled();
  });

  it('does nothing while multiple currencies are off', async () => {
    vi.mocked(useMultiCurrency).mockReturnValue({
      isEnabled: false,
      defaultCurrencyCode: 'CAD',
      getAccountCurrency: account => account.currency || 'CAD',
    });

    expect(await renderAndWait()).toHaveLength(0);
    expect(check).not.toHaveBeenCalled();
  });
});
