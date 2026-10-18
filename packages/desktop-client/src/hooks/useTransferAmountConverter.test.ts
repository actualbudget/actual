import { buildRateIndex } from '@actual-app/core/shared/fx/rates';
import type { AccountEntity } from '@actual-app/core/types/models';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useIsCrossCurrencyTransfer,
  useTransferAmountConverter,
} from './useTransferAmountConverter';

const accounts = [
  { id: 'chequing', currency: null },
  { id: 'savings', currency: 'CAD' },
  { id: 'us', currency: 'USD' },
] as AccountEntity[];

const rateIndex = buildRateIndex([
  {
    id: 'usd-cad',
    from_currency: 'USD',
    to_currency: 'CAD',
    rate: 1.25,
    date: '2026-01-01',
    source: 'manual',
    created_at: 1,
  },
]);

let isMultiCurrencyEnabled = true;

vi.mock('./useMultiCurrency', () => ({
  useMultiCurrency: () => ({
    isEnabled: isMultiCurrencyEnabled,
    defaultCurrencyCode: 'CAD',
  }),
}));
vi.mock('./useAccounts', () => ({
  useAccounts: () => ({ data: accounts }),
}));
vi.mock('./useExchangeRates', () => ({
  useExchangeRates: ({ enabled = true }: { enabled?: boolean } = {}) => ({
    exchangeRates: [],
    rateIndex: enabled ? rateIndex : buildRateIndex([]),
    isLoading: false,
  }),
}));

beforeEach(() => {
  isMultiCurrencyEnabled = true;
});

describe('useTransferAmountConverter', () => {
  it('converts into the currency of the other account', () => {
    const { result } = renderHook(() => useTransferAmountConverter());

    expect(result.current?.(-25000, 'chequing', 'us', '2026-03-15')).toBe(
      -20000,
    );
    expect(result.current?.(-25000, 'chequing', 'savings', '2026-03-15')).toBe(
      -25000,
    );
  });

  it('mirrors amounts while multiple currencies are off', () => {
    isMultiCurrencyEnabled = false;
    const { result } = renderHook(() => useTransferAmountConverter());

    expect(result.current).toBeUndefined();
  });
});

describe('useIsCrossCurrencyTransfer', () => {
  it('tells accounts in different currencies apart', () => {
    const { result } = renderHook(() => useIsCrossCurrencyTransfer());

    expect(result.current('chequing', 'us')).toBe(true);
    // An account set to the default currency is in the same one
    expect(result.current('chequing', 'savings')).toBe(false);
  });

  it('sees none while multiple currencies are off', () => {
    isMultiCurrencyEnabled = false;
    const { result } = renderHook(() => useIsCrossCurrencyTransfer());

    expect(result.current('chequing', 'us')).toBe(false);
  });
});
