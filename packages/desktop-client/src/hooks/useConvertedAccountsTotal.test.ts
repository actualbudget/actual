import { buildRateIndex } from '@actual-app/core/shared/fx/rates';
import type { AccountEntity } from '@actual-app/core/types/models';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAccountBalances } from './useAccountBalances';
import { useConvertedAccountsTotal } from './useConvertedAccountsTotal';
import { useExchangeRates } from './useExchangeRates';
import { useMultiCurrency } from './useMultiCurrency';

vi.mock('./useAccountBalances', () => ({ useAccountBalances: vi.fn() }));
vi.mock('./useExchangeRates', () => ({ useExchangeRates: vi.fn() }));
vi.mock('./useMultiCurrency', () => ({ useMultiCurrency: vi.fn() }));

const accounts: Array<Pick<AccountEntity, 'id' | 'currency'>> = [
  { id: 'cad', currency: null },
  { id: 'usd', currency: 'USD' },
];

const rates = {
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
};

describe('useConvertedAccountsTotal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMultiCurrency).mockReturnValue({
      isEnabled: true,
      defaultCurrencyCode: 'CAD',
      getAccountCurrency: account => account.currency || 'CAD',
    });
    vi.mocked(useExchangeRates).mockReturnValue(rates);
    vi.mocked(useAccountBalances).mockReturnValue({ cad: 1000, usd: 1000 });
  });

  it('converts every balance into the default currency', () => {
    const { result } = renderHook(() => useConvertedAccountsTotal(accounts));
    expect(result.current).toEqual({
      total: 2250,
      withoutRate: [],
      hasFallback: false,
    });
  });

  it('waits for every balance instead of adding up part of them', () => {
    vi.mocked(useAccountBalances).mockReturnValue({ cad: 1000, usd: null });
    const { result } = renderHook(() => useConvertedAccountsTotal(accounts));
    expect(result.current).toBeNull();
  });

  it('waits for the rates instead of counting other currencies 1:1', () => {
    vi.mocked(useExchangeRates).mockReturnValue({
      ...rates,
      rateIndex: buildRateIndex([]),
      isLoading: true,
    });
    const { result } = renderHook(() => useConvertedAccountsTotal(accounts));
    expect(result.current).toBeNull();
  });
});
