import React from 'react';
import type { ReactNode } from 'react';

import { initServer } from '@actual-app/core/platform/client/connection';
import type {
  CategoryCurrencyEntity,
  ExchangeRateEntity,
} from '@actual-app/core/types/models';
import { renderHook, waitFor } from '@testing-library/react';

import { createTestQueryClient, TestProviders } from '#mocks';

import {
  useApproximateLineTotal,
  useCategoryCurrencies,
} from './useCategoryCurrencies';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

let mockPrefs: Record<string, string | undefined> = {};

vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: (name: string) => [mockPrefs[name], vi.fn()],
}));

const lines: CategoryCurrencyEntity[] = [
  { id: 'food-USD', category: 'food', currency: 'USD', start_month: '2026-10' },
];

const rates: ExchangeRateEntity[] = [
  {
    id: 'usd-cad',
    from_currency: 'USD',
    to_currency: 'CAD',
    rate: 1.4,
    date: '2026-11-01',
    source: 'manual',
    created_at: 1,
  },
];

function render<T>(
  hook: () => T,
  {
    enabled = true,
    getRates = async () => rates,
  }: { enabled?: boolean; getRates?: () => Promise<ExchangeRateEntity[]> } = {},
) {
  mockPrefs = {
    'flags.currency': 'true',
    'flags.multiCurrency': enabled ? 'true' : 'false',
    defaultCurrencyCode: 'CAD',
  };
  const getLines = vi.fn(async () => lines);
  initServer({
    'category-currencies-get': getLines,
    'exchange-rates-get': getRates,
  });
  const queryClient = createTestQueryClient();
  const result = renderHook(hook, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <TestProviders queryClient={queryClient}>{children}</TestProviders>
    ),
  });
  return { ...result, getLines };
}

describe('useCategoryCurrencies', () => {
  it('lists the category itself first, then each currency line', async () => {
    const { result } = render(() => useCategoryCurrencies());
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.getLines('food')).toEqual([
      { id: 'food', currencyCode: 'CAD' },
      { id: 'food-USD', currencyCode: 'USD', startMonth: '2026-10' },
    ]);
    expect(result.current.getLines('rent')).toEqual([]);
    expect(result.current.getLine('food-USD')?.category).toBe('food');
  });

  it('has no lines while multiple currencies are off', () => {
    const { result, getLines } = render(() => useCategoryCurrencies(), {
      enabled: false,
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.getLines('food')).toEqual([]);
    expect(getLines).not.toHaveBeenCalled();
  });
});

describe('useApproximateLineTotal', () => {
  it('marks a month whose currency lines have no rate on or before its end', async () => {
    const { result } = render(() => ({
      lines: useCategoryCurrencies(),
      october: useApproximateLineTotal('food', '2026-10'),
      november: useApproximateLineTotal('food', '2026-11'),
      september: useApproximateLineTotal('food', '2026-09'),
    }));
    await waitFor(() =>
      expect(result.current.october.title).toBe(
        'Approximate: no USD exchange rate on or before the end of this month',
      ),
    );

    expect(result.current.october.formatter?.(41000, 'financial')).toBe(
      '≈410.00',
    );
    // November has a rate, and the line starts in October
    expect(result.current.november).toEqual({});
    expect(result.current.september).toEqual({});
  });

  it('marks nothing until the rates are known', async () => {
    let resolveRates: (value: ExchangeRateEntity[]) => void = vi.fn();
    const { result } = render(
      () => ({
        lines: useCategoryCurrencies(),
        november: useApproximateLineTotal('food', '2026-11'),
      }),
      {
        getRates: () =>
          new Promise(resolve => {
            resolveRates = resolve;
          }),
      },
    );
    await waitFor(() => expect(result.current.lines.isLoading).toBe(false));
    expect(result.current.november).toEqual({});

    // Without any rate, November is approximate once that's known
    resolveRates([]);
    await waitFor(() =>
      expect(result.current.november.title).toBe(
        'Approximate: no USD exchange rate on or before the end of this month',
      ),
    );
  });
});
