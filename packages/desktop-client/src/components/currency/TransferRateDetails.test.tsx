import React from 'react';

import { buildRateIndex } from '@actual-app/core/shared/fx/rates';
import type { AccountEntity } from '@actual-app/core/types/models';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TransferRateDetails } from './TransferRateDetails';

let otherAmount = 0;

vi.mock('#hooks/useQuery', () => ({
  useQuery: () => ({ data: [{ amount: otherAmount }], isLoading: false }),
}));
vi.mock('#hooks/useExchangeRates', () => ({
  useExchangeRates: () => ({
    exchangeRates: [],
    rateIndex: buildRateIndex([]),
    isLoading: false,
  }),
}));
vi.mock('#hooks/useCurrencyFormatter', () => ({
  useCurrencyFormatter: () => ({
    getAccountCurrency: (account: Pick<AccountEntity, 'currency'>) =>
      account.currency || 'CAD',
    formatAmount: (amount: number, currency: string) => `${currency} ${amount}`,
  }),
}));
vi.mock('#hooks/useDateFormat', () => ({
  useDateFormat: () => 'yyyy-MM-dd',
}));

// 300,000 COP left a Colombian account for a Canadian one
function renderDetails() {
  return render(
    <TransferRateDetails
      transaction={{
        account: 'colombia',
        amount: -30_000_000,
        date: '2026-03-15',
        transfer_id: 'in',
      }}
      account={{ id: 'colombia', currency: 'COP' }}
      transferAccount={{ id: 'chequing', name: 'Chequing', currency: null }}
    />,
  );
}

describe('TransferRateDetails', () => {
  it('reads the rate of the transfer the readable way without a market rate', () => {
    otherAmount = 10_000;
    renderDetails();

    expect(screen.getByText('CAD 10000 arrived in Chequing')).toBeVisible();
    expect(
      screen.getByText('Rate of this transfer: 1 CAD = 3000 COP'),
    ).toBeVisible();
  });

  it('says nothing arrived or left while the other side is zero', () => {
    otherAmount = 0;
    renderDetails();

    expect(screen.queryByText(/arrived|left/)).toBeNull();
    expect(screen.queryByText(/Rate of this transfer/)).toBeNull();
  });
});
