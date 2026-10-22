import { HotkeysProvider } from 'react-hotkeys-hook';

import { initServer } from '@actual-app/core/platform/client/connection';
import type { AccountEntity } from '@actual-app/core/types/models';
import { render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { accountQueries } from '#accounts';
import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { mergeLocalPrefs, mergeSyncedPrefs } from '#prefs/prefsSlice';

import { AddCurrencyModal } from './AddCurrencyModal';

function account(
  id: string,
  currency: string | null,
  overrides: Partial<AccountEntity> = {},
): AccountEntity {
  return {
    id,
    name: id,
    currency,
    currency_precision: null,
    offbudget: 0,
    closed: 0,
    sort_order: 0,
    last_reconciled: null,
    tombstone: 0,
    account_group_id: null,
    account_id: null,
    bank: null,
    bankName: null,
    bankId: null,
    mask: null,
    official_name: null,
    balance_current: null,
    balance_available: null,
    balance_limit: null,
    account_sync_source: null,
    last_sync: null,
    bank_sync_status: null,
    ...overrides,
  };
}

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

function setup(
  create: (args: {
    category: string;
    currency: string;
  }) => Promise<{ id: string }>,
) {
  initServer({ 'budget/pocket-create': create });
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(accountQueries.list().queryKey, [
    account('checking', null),
    account('yen', 'JPY'),
    account('euro', 'EUR'),
    account('brokerage', 'GBP', { offbudget: 1 }),
    account('old', 'CHF', { closed: 1 }),
  ]);
  const store = createTestAppStore();
  store.dispatch(mergeLocalPrefs({ id: 'budget-a' }));
  store.dispatch(
    mergeSyncedPrefs({
      'flags.currency': 'true',
      'flags.multicurrency': 'true',
      budgetType: 'envelope',
      defaultCurrencyCode: 'USD',
      amountEncoding: '{"version":1,"currencyCode":"USD","precision":2}',
    }),
  );
  render(
    <TestProviders store={store} queryClient={queryClient}>
      <HotkeysProvider>
        <AddCurrencyModal categoryId="travel" categoryName="Travel" />
      </HotkeysProvider>
    </TestProviders>,
  );
}

// MC-10.4: Add Currency creates a pocket through budget/pocket-create.
it('adds a currency pocket to the category', async () => {
  const create = vi.fn().mockResolvedValue({ id: 'travelJpy' });
  setup(create);
  await waitFor(() =>
    expect(
      screen.getByText(
        'Every device that edits this budget needs an up-to-date version of Actual.',
      ),
    ).toBeVisible(),
  );
  const user = userEvent.setup();
  await user.click(document.getElementById('pocket-currency-select')!);
  await user.click(
    within(await screen.findByRole('menu')).getByText(/^JPY - /),
  );
  await user.click(screen.getByRole('button', { name: 'Add currency' }));
  expect(create).toHaveBeenCalledWith({ category: 'travel', currency: 'JPY' });
});

it('reports a failed creation', async () => {
  setup(vi.fn().mockRejectedValue(new Error('pocket-category-income')));
  const user = userEvent.setup();
  await user.click(document.getElementById('pocket-currency-select')!);
  await user.click(
    within(await screen.findByRole('menu')).getByText(/^EUR - /),
  );
  await user.click(screen.getByRole('button', { name: 'Add currency' }));
  expect(
    await screen.findByText('The currency could not be added.'),
  ).toBeVisible();
});

// MC-10.4 inspection 1, F1: the budget currency shows the base slot.
it('offers the budget currency, which shows the base slot', async () => {
  const create = vi.fn().mockResolvedValue({ id: 'travel' });
  setup(create);
  const user = userEvent.setup();
  await user.click(document.getElementById('pocket-currency-select')!);
  await user.click(
    within(await screen.findByRole('menu')).getByText(/^USD - /),
  );
  await user.click(screen.getByRole('button', { name: 'Add currency' }));
  expect(create).toHaveBeenCalledWith({ category: 'travel', currency: 'USD' });
});

it('offers only currencies of open on-budget accounts', async () => {
  setup(vi.fn());
  const user = userEvent.setup();
  await user.click(document.getElementById('pocket-currency-select')!);
  const menu = await screen.findByRole('menu');
  for (const code of ['EUR', 'JPY', 'USD']) {
    expect(within(menu).getByText(new RegExp(`^${code} - `))).toBeVisible();
  }
  for (const code of ['GBP', 'CHF', 'AUD']) {
    expect(within(menu).queryByText(new RegExp(`^${code} - `))).toBeNull();
  }
});
