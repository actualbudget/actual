import { HotkeysProvider } from 'react-hotkeys-hook';

import { initServer } from '@actual-app/core/platform/client/connection';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { mergeLocalPrefs, mergeSyncedPrefs } from '#prefs/prefsSlice';

import { AddCurrencyModal } from './AddCurrencyModal';

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
    <TestProviders store={store} queryClient={createTestQueryClient()}>
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
  await user.click(await screen.findByText(/^JPY - /));
  await user.click(screen.getByRole('button', { name: 'Add currency' }));
  expect(create).toHaveBeenCalledWith({ category: 'travel', currency: 'JPY' });
});

it('reports a failed creation', async () => {
  setup(vi.fn().mockRejectedValue(new Error('pocket-category-income')));
  const user = userEvent.setup();
  await user.click(document.getElementById('pocket-currency-select')!);
  await user.click(await screen.findByText(/^EUR - /));
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
  await user.click(await screen.findByText(/^USD - /));
  await user.click(screen.getByRole('button', { name: 'Add currency' }));
  expect(create).toHaveBeenCalledWith({ category: 'travel', currency: 'USD' });
});
