import React from 'react';
import type { ReactNode } from 'react';

import { buildRateIndex } from '@actual-app/core/shared/fx/rates';
import { q } from '@actual-app/core/shared/query';
import type { AccountEntity } from '@actual-app/core/types/models';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from '#mocks';
import { liveQuery } from '#queries/liveQuery';

import { useConvertedQueryTotal } from './useConvertedQueryTotal';
import { useExchangeRates } from './useExchangeRates';
import { useMultiCurrency } from './useMultiCurrency';

vi.mock('./useExchangeRates', () => ({ useExchangeRates: vi.fn() }));
vi.mock('./useMultiCurrency', () => ({ useMultiCurrency: vi.fn() }));
vi.mock('#queries/liveQuery', () => ({ liveQuery: vi.fn() }));

let accounts: Array<Partial<AccountEntity>> = [];
vi.mock('#accounts', () => ({
  accountQueries: {
    list: () => ({
      queryKey: ['accounts', 'lists'],
      queryFn: async () => accounts,
      placeholderData: [],
    }),
  },
}));

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

type AccountSums = Array<{ account: string; amount: number }>;
let sendRows: (rows: AccountSums) => void;

function renderTotal() {
  const queryClient = createTestQueryClient();
  return renderHook(() => useConvertedQueryTotal(q('transactions')), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
}

describe('useConvertedQueryTotal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accounts = [
      { id: 'cad', currency: null },
      { id: 'usd', currency: 'USD' },
    ];
    vi.mocked(useMultiCurrency).mockReturnValue({
      isEnabled: true,
      defaultCurrencyCode: 'CAD',
      getAccountCurrency: account => account.currency || 'CAD',
    });
    vi.mocked(useExchangeRates).mockReturnValue(rates);
    vi.mocked(liveQuery).mockImplementation((_query, { onData }) => {
      sendRows = rows => onData?.(rows as never, null as never);
      return { unsubscribe: vi.fn() } as never;
    });
  });

  it('loads nothing while multiple currencies are off', () => {
    vi.mocked(useMultiCurrency).mockReturnValue({
      isEnabled: false,
      defaultCurrencyCode: 'CAD',
      getAccountCurrency: account => account.currency || 'CAD',
    });
    const { result } = renderTotal();
    expect(result.current).toBeNull();
    expect(liveQuery).not.toHaveBeenCalled();
  });

  it('is loading until the accounts and their sums are known', async () => {
    const { result } = renderTotal();
    expect(result.current).toEqual({ total: null, withoutRate: [] });

    await waitFor(() => expect(liveQuery).toHaveBeenCalled());
    expect(result.current).toEqual({ total: null, withoutRate: [] });

    act(() =>
      sendRows([
        { account: 'cad', amount: 1000 },
        { account: 'usd', amount: 1000 },
      ]),
    );
    expect(result.current).toMatchObject({ total: 2250, withoutRate: [] });
  });

  it('is loading until the rates are known', async () => {
    vi.mocked(useExchangeRates).mockReturnValue({
      ...rates,
      rateIndex: buildRateIndex([]),
      isLoading: true,
    });
    const { result } = renderTotal();
    await waitFor(() => expect(liveQuery).toHaveBeenCalled());
    act(() => sendRows([{ account: 'usd', amount: 1000 }]));
    expect(result.current).toEqual({ total: null, withoutRate: [] });
  });

  it('needs no conversion when every account uses the default currency', async () => {
    accounts = [{ id: 'cad', currency: null }];
    const { result } = renderTotal();
    await waitFor(() => expect(result.current).toBeNull());
    expect(liveQuery).not.toHaveBeenCalled();
  });
});
