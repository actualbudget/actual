import React from 'react';

import { initServer } from '@actual-app/core/platform/client/connection';
import type { CategoryCurrencyEntity } from '@actual-app/core/types/models';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { pushModal } from '#modals/modalsSlice';

import { CategoryCurrencyModal } from './CategoryCurrencyModal';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: (name: string) => [
    {
      'flags.currency': 'true',
      'flags.multiCurrency': 'true',
      defaultCurrencyCode: 'CAD',
    }[name],
    vi.fn(),
  ],
}));

vi.mock('#hooks/useAccounts', () => ({
  useAccounts: () => ({
    data: [
      { id: 'chequing', closed: 0, offbudget: 0, currency: 'CAD' },
      { id: 'travel', closed: 0, offbudget: 0, currency: 'EUR' },
      { id: 'us', closed: 0, offbudget: 0, currency: 'USD' },
      { id: 'old', closed: 1, offbudget: 0, currency: 'GBP' },
    ],
  }),
}));

// Food has a EUR line from October on
const lines: CategoryCurrencyEntity[] = [
  { id: 'food-EUR', category: 'food', currency: 'EUR', start_month: '2026-10' },
];

function renderModal() {
  const add = vi.fn(async () => 'food-USD');
  initServer({
    'category-currencies-get': async () => lines,
    'category-currency-add': add,
  });
  const queryClient = createTestQueryClient();
  const store = configureTestAppStore({ queryClient });
  const options = { category: { id: 'food', name: 'Food' }, month: '2026-11' };
  store.dispatch(
    pushModal({ modal: { name: 'category-currency-add', options } }),
  );
  render(
    <TestProviders queryClient={queryClient} store={store}>
      <CategoryCurrencyModal {...options} />
    </TestProviders>,
  );
  return { add };
}

describe('CategoryCurrencyModal', () => {
  it('adds a line in the chosen currency from the month on screen', async () => {
    const { add } = renderModal();

    // EUR comes first among the account currencies, but Food has it
    const currency = screen.getByRole('button', { name: 'Currency' });
    await waitFor(() => expect(currency.textContent).toContain('USD - '));
    await userEvent.click(
      screen.getByRole('button', { name: 'Add a USD line' }),
    );
    await waitFor(() =>
      expect(add).toHaveBeenCalledWith({
        category: 'food',
        currency: 'USD',
        startMonth: '2026-11',
      }),
    );
  });

  it('offers any currency, those of open accounts first', async () => {
    renderModal();

    const currency = screen.getByRole('button', { name: 'Currency' });
    await waitFor(() => expect(currency.textContent).toContain('USD - '));
    await userEvent.click(currency);
    const items = screen.getByRole('menu').textContent ?? '';
    expect(items).not.toContain('CAD - ');
    expect(items).not.toContain('EUR - ');
    // Closed accounts don't count, so GBP comes after the account currencies
    expect(items.indexOf('GBP - ')).toBeGreaterThan(items.indexOf('USD - '));
    expect(items).toContain('JPY - ');
  });
});
