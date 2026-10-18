import React from 'react';
import type { ReactNode } from 'react';

import { buildRateIndex } from '@actual-app/core/shared/fx/rates';
import { MAX_SAFE_NUMBER } from '@actual-app/core/shared/util';
import type { AccountEntity } from '@actual-app/core/types/models';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TestProviders } from '#mocks';

import { useAccountBalanceConverter } from './useAccountBalanceConverter';
import { useAccounts } from './useAccounts';
import { useExchangeRates } from './useExchangeRates';
import { useMultiCurrency } from './useMultiCurrency';

vi.mock('./useAccounts', () => ({ useAccounts: vi.fn() }));
vi.mock('./useExchangeRates', () => ({ useExchangeRates: vi.fn() }));
vi.mock('./useMultiCurrency', () => ({ useMultiCurrency: vi.fn() }));

const accounts = [
  { id: 'cad', currency: null },
  { id: 'usd', currency: 'USD' },
] as AccountEntity[];

describe('useAccountBalanceConverter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMultiCurrency).mockReturnValue({
      isEnabled: true,
      defaultCurrencyCode: 'CAD',
      getAccountCurrency: account => account.currency || 'CAD',
    });
    vi.mocked(useAccounts).mockReturnValue({
      data: accounts,
    } as ReturnType<typeof useAccounts>);
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

  it('counts a balance 1:1 when its conversion is too large to be safe', () => {
    const { result } = renderHook(() => useAccountBalanceConverter(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <TestProviders>{children}</TestProviders>
      ),
    });
    const convert = result.current;
    if (!convert) {
      throw new Error('Expected a converter');
    }

    expect(convert(1000, 'usd', '2026-02-01')).toEqual({
      amount: 1250,
      isApproximate: false,
    });
    expect(convert(MAX_SAFE_NUMBER, 'usd', '2026-02-01')).toEqual({
      amount: MAX_SAFE_NUMBER,
      isApproximate: true,
    });
  });
});
