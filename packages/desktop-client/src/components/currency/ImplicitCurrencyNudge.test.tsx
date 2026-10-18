import { render, screen } from '@testing-library/react';

import { TestProviders } from '#mocks';

import { ImplicitCurrencyNudge } from './ImplicitCurrencyNudge';

let mockPrefs: Record<string, string | undefined> = {};

vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: (name: string) => [mockPrefs[name], vi.fn()],
}));

vi.mock('#hooks/useAccounts', () => ({
  useAccounts: () => ({
    data: [{ id: 'chequing', name: 'Chequing', closed: 0, currency: null }],
  }),
}));

function renderNudge(defaultCurrencyCode: string) {
  mockPrefs = {
    'flags.currency': 'true',
    'flags.multiCurrency': 'true',
    defaultCurrencyCode,
  };
  render(
    <TestProviders>
      <ImplicitCurrencyNudge />
    </TestProviders>,
  );
}

describe('ImplicitCurrencyNudge', () => {
  it('lists accounts without a currency of their own', () => {
    renderNudge('CAD');

    expect(
      screen.getByRole('button', { name: 'Chequing' }),
    ).toBeInTheDocument();
  });

  it('lists them with a default currency without decimals too', () => {
    renderNudge('JPY');

    expect(
      screen.getByRole('button', { name: 'Chequing' }),
    ).toBeInTheDocument();
  });
});
