import React from 'react';
import type { ReactNode } from 'react';

import { buildRateIndex } from '@actual-app/core/shared/fx/rates';
import { MAX_SAFE_NUMBER } from '@actual-app/core/shared/util';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestAppStore, TestProviders } from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { useCurrencyFormatter } from './useCurrencyFormatter';
import { useExchangeRates } from './useExchangeRates';
import { useMultiCurrency } from './useMultiCurrency';

vi.mock('./useExchangeRates', () => ({ useExchangeRates: vi.fn() }));
vi.mock('./useMultiCurrency', () => ({ useMultiCurrency: vi.fn() }));

function renderFormatter(store = createTestAppStore()) {
  return renderHook(() => useCurrencyFormatter(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <TestProviders store={store}>{children}</TestProviders>
    ),
  });
}

describe('useCurrencyFormatter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMultiCurrency).mockReturnValue({
      isEnabled: true,
      defaultCurrencyCode: 'CAD',
      getAccountCurrency: account => account.currency || 'CAD',
    });
    vi.mocked(useExchangeRates).mockReturnValue({
      exchangeRates: [],
      rateIndex: buildRateIndex([
        {
          id: 'usd-cad',
          from_currency: 'USD',
          to_currency: 'CAD',
          rate: 1.25,
          date: '2026-01-01',
          source: 'manual',
          created_at: 1,
        },
      ]),
      isLoading: false,
    });
  });

  it('reads the budget and account display modes', () => {
    const store = createTestAppStore();
    store.dispatch(
      mergeSyncedPrefs({
        'currency-display-mode': 'converted',
        'currency-display-mode-usd': 'original',
      }),
    );
    const { result } = renderFormatter(store);
    expect(result.current.getDisplayMode('usd')).toBe('original');
    expect(result.current.getDisplayMode('cad')).toBe('converted');
  });

  it('counts an amount 1:1 when its conversion is too large to be safe', () => {
    const { result } = renderFormatter();
    expect(result.current.convertToDefault(1000, 'USD')).toMatchObject({
      amount: 1250,
    });
    expect(result.current.convertToDefault(MAX_SAFE_NUMBER, 'USD')).toEqual({
      amount: MAX_SAFE_NUMBER,
      lookup: null,
    });
  });
});
