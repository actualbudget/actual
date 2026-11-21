import React from 'react';
import type { ReactNode } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import { findRate } from '@actual-app/core/shared/fx/rates';
import type { ExchangeRateEntity } from '@actual-app/core/types/models';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestQueryClient, TestProviders } from '#mocks';

import { useExchangeRates } from './useExchangeRates';

vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: vi.fn(),
}));

const rates: ExchangeRateEntity[] = [
  {
    id: 'usd-cad',
    from_currency: 'USD',
    to_currency: 'CAD',
    rate: 1.25,
    date: '2026-01-01',
    source: 'manual',
    created_at: 1,
  },
];

function renderRates(options?: { enabled?: boolean }) {
  const queryClient = createTestQueryClient();
  return renderHook(() => useExchangeRates(options), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <TestProviders queryClient={queryClient}>{children}</TestProviders>
    ),
  });
}

describe('useExchangeRates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is loading until the rates arrive, instead of counting 1:1', async () => {
    let resolveRates!: (rates: ExchangeRateEntity[]) => void;
    vi.mocked(send).mockReturnValue(
      new Promise<ExchangeRateEntity[]>(resolve => {
        resolveRates = resolve;
      }) as ReturnType<typeof send>,
    );

    const { result } = renderRates();
    expect(result.current.isLoading).toBe(true);
    expect(findRate(result.current.rateIndex, 'USD', 'CAD')).toBeNull();

    resolveRates(rates);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.exchangeRates).toEqual(rates);
    expect(findRate(result.current.rateIndex, 'USD', 'CAD')?.rate).toBe(1.25);
    expect(send).toHaveBeenCalledWith('exchange-rates-get');
  });

  it('never queries the rates while disabled', () => {
    const { result } = renderRates({ enabled: false });
    expect(result.current).toEqual({
      exchangeRates: [],
      rateIndex: result.current.rateIndex,
      isLoading: false,
    });
    expect(send).not.toHaveBeenCalled();
  });
});
