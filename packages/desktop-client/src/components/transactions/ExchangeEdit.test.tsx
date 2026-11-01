import { initServer } from '@actual-app/core/platform/client/connection';
import type { AccountEntity } from '@actual-app/core/types/models';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { accountQueries } from '#accounts';
import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { ExchangeEdit } from './ExchangeEdit';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const accounts = [
  { id: 'usd', name: 'Checking', offbudget: 0, currency: null },
  {
    id: 'jpy',
    name: 'Yen savings',
    offbudget: 1,
    currency: 'JPY',
    currency_precision: 0,
  },
] as AccountEntity[];

const family = {
  status: 'ok' as const,
  expected: {},
  reconciled: false,
  selectedSide: 'source' as const,
  sourceAccount: 'usd',
  destinationAccount: 'jpy',
  date: '2026-03-10',
  sourceAmount: 10000,
  destinationAmount: 15000,
  sourceFee: 0,
  destinationFee: 0,
  baseAmount: 10000,
  notes: '',
  category: 'savings',
  feeCategory: null,
  postings: [],
};

function setup() {
  const update = vi.fn().mockResolvedValue({ status: 'ok' });
  initServer({
    'budget/edit-effects': async () => [],
    'exchange-rates/resolve': async () => ({ status: 'unavailable' as const }),
    'transactions/get-exchange-family': async () => family as never,
    'transactions/update-exchange-transfer': update,
  });
  const store = createTestAppStore();
  store.dispatch(
    mergeSyncedPrefs({
      defaultCurrencyCode: 'USD',
      amountEncoding: JSON.stringify({
        version: 1,
        currencyCode: 'USD',
        precision: 2,
      }),
    }),
  );
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(accountQueries.list().queryKey, accounts);
  const onSaved = vi.fn();
  const onDone = vi.fn();
  render(
    <TestProviders store={store} queryClient={queryClient}>
      <ExchangeEdit id="a" onSaved={onSaved} onDone={onDone} />
    </TestProviders>,
  );
  return { update, onSaved, onDone };
}

it('edits both sides in one row, starting at this side', async () => {
  setup();
  const amount = await screen.findByLabelText('Amount');
  expect(amount).toHaveFocus();
  expect(amount).toHaveValue('100.00');
  expect(screen.getByText('Sent from Checking:')).toBeInTheDocument();
  expect(screen.getByLabelText('Amount received')).toHaveValue('15,000');
});

it('leaves editing on Cancel or Escape without saving', async () => {
  const { update, onDone } = setup();
  await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
  expect(onDone).toHaveBeenCalledTimes(1);
  await userEvent.type(screen.getByLabelText('Notes'), '{Escape}');
  expect(onDone).toHaveBeenCalledTimes(2);
  // Only the budget notice's previews reached the server.
  expect(update.mock.calls.every(([request]) => request.preview)).toBe(true);
});

it('leaves editing after a save', async () => {
  const { update, onSaved, onDone } = setup();
  const received = await screen.findByLabelText('Amount received');
  await userEvent.clear(received);
  await userEvent.type(received, '14000');
  await userEvent.click(screen.getByTestId('exchange-add-button'));
  await waitFor(() => expect(onDone).toHaveBeenCalled());
  expect(update).toHaveBeenCalledWith(
    expect.objectContaining({ destinationAmount: 14000 }),
  );
  expect(onSaved).toHaveBeenCalled();
});
