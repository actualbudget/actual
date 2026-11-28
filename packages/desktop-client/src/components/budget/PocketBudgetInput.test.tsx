import { initServer } from '@actual-app/core/platform/client/connection';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { an2Months } from '#mocks/fxReservations';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { PocketBudgetInput } from './PocketBudgetInput';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const pocket = {
  ...an2Months['2026-01'].pockets[0],
  currency: 'BTC',
  precision: 8,
  budgeted: 0,
};

function setup() {
  const save = vi.fn().mockResolvedValue({ status: 'ok' });
  initServer({ 'budget/pocket-budget-set': save });
  const store = createTestAppStore();
  store.dispatch(
    mergeSyncedPrefs({
      defaultCurrencyCode: 'USD',
      amountEncoding: '{"version":1,"currencyCode":"USD","precision":2}',
    }),
  );
  const queryClient = createTestQueryClient();
  const view = render(
    <TestProviders store={store} queryClient={queryClient}>
      <PocketBudgetInput pocket={pocket} month="2026-01" name="Travel BTC" />
    </TestProviders>,
  );
  return { save, ...view, store, queryClient };
}

it('writes a single satoshi with its native encoding from a new empty pocket', async () => {
  const { save } = setup();
  const input = screen.getByRole('textbox', {
    name: 'Budgeted for Travel BTC',
  });
  await userEvent.click(input);
  await userEvent.clear(input);
  await userEvent.type(input, '0.00000001');
  await userEvent.tab();
  await waitFor(() =>
    expect(save).toHaveBeenCalledExactlyOnceWith({
      month: '2026-01',
      pocketId: pocket.id,
      amount: 1,
      encoding: 'BTC.8',
    }),
  );
});

it('keeps the original month and precision if the row refreshes during editing', async () => {
  const { save, rerender, store, queryClient } = setup();
  const input = screen.getByRole('textbox');
  await userEvent.click(input);
  await userEvent.clear(input);
  await userEvent.type(input, '0.00000001');
  rerender(
    <TestProviders store={store} queryClient={queryClient}>
      <PocketBudgetInput
        pocket={{ ...pocket, precision: 2 }}
        month="2026-02"
        name="Travel BTC"
      />
    </TestProviders>,
  );
  await userEvent.tab();
  await waitFor(() =>
    expect(save).toHaveBeenCalledExactlyOnceWith({
      month: '2026-01',
      pocketId: pocket.id,
      amount: 1,
      encoding: 'BTC.8',
    }),
  );
});

it('shows a rejected write instead of silently accepting it', async () => {
  const { save } = setup();
  save.mockResolvedValue({ status: 'encoding-mismatch' });
  await userEvent.click(screen.getByRole('textbox'));
  await userEvent.clear(screen.getByRole('textbox'));
  await userEvent.type(screen.getByRole('textbox'), '1');
  await userEvent.tab();
  expect(await screen.findByRole('alert')).toHaveTextContent('Enter it again');
});

it('keeps an unknown assignment unavailable', () => {
  const { rerender, store, queryClient } = setup();
  rerender(
    <TestProviders store={store} queryClient={queryClient}>
      <PocketBudgetInput
        pocket={{ ...pocket, budgeted: null }}
        month="2026-01"
        name="Travel BTC"
      />
    </TestProviders>,
  );
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(screen.getByText('Unavailable')).toBeVisible();
});
