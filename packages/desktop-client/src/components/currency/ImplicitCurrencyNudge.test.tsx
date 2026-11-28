import { render, screen } from '@testing-library/react';

import { TestProviders } from '#mocks';

import { ImplicitCurrencyNudge } from './ImplicitCurrencyNudge';

let mockPrefs: Record<string, string | undefined> = {};

vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: (name: string) => [mockPrefs[name], vi.fn()],
}));

vi.mock('#hooks/useAccounts', () => ({
  useAccounts: () => ({
    data: [
      { id: 'chequing', name: 'Chequing', closed: 0, currency: 'CAD' },
      { id: 'cash', name: 'Cash', closed: 0, currency: null },
      { id: 'us', name: 'US card', closed: 0, currency: 'USD' },
      { id: 'old', name: 'Old savings', closed: 1, currency: 'CAD' },
    ],
  }),
}));

function renderNudge(defaultCurrencyCode: string, dismissed?: string) {
  mockPrefs = {
    'flags.currency': 'true',
    'flags.multiCurrency': 'true',
    defaultCurrencyCode,
    'multi-currency-nudge-dismissed': dismissed,
  };
  render(
    <TestProviders>
      <ImplicitCurrencyNudge />
    </TestProviders>,
  );
}

describe('ImplicitCurrencyNudge', () => {
  it('lists the open accounts in the default currency for review', () => {
    renderNudge('CAD');

    expect(screen.getByText(/These accounts are in CAD/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Chequing' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cash' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'US card' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Old savings' })).toBeNull();
  });

  it('lists them with another default currency too', () => {
    renderNudge('USD');

    expect(screen.getByRole('button', { name: 'US card' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cash' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Chequing' })).toBeNull();
  });

  it('stays away once dismissed', () => {
    renderNudge('CAD', 'true');

    expect(screen.queryByRole('button', { name: 'Chequing' })).toBeNull();
  });
});
