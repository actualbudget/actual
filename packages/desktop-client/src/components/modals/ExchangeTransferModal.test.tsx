import { HotkeysProvider } from 'react-hotkeys-hook';
import { MemoryRouter } from 'react-router';

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
import { pushModal } from '#modals/modalsSlice';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { ExchangeTransferModal } from './ExchangeTransferModal';

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

const occurrence = {
  schedule: 'yen-schedule',
  account: 'jpy',
  other: 'usd',
  date: '2026-03-10',
  amount: -15000,
  notes: 'monthly',
  cleared: false,
  category: 'savings',
};

function setup() {
  const post = vi.fn(async () => ({
    status: 'ok' as const,
    sourceId: 'a',
    destinationId: 'b',
  }));
  initServer({
    'exchange-rates/resolve': async () => ({ status: 'unavailable' as const }),
    'transactions/post-exchange-transfer': post,
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
  store.dispatch(
    pushModal({
      modal: { name: 'exchange-transfer', options: { occurrence } },
    }),
  );
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(accountQueries.list().queryKey, accounts);
  render(
    <TestProviders store={store} queryClient={queryClient}>
      <MemoryRouter>
        <HotkeysProvider>
          <ExchangeTransferModal occurrence={occurrence} />
        </HotkeysProvider>
      </MemoryRouter>
    </TestProviders>,
  );
  return { post, store };
}

it('posts the occurrence with its schedule and ruled category', async () => {
  const { post, store } = setup();
  expect(await screen.findByText(/on 03\/10\/2026:/)).toBeTruthy();
  await userEvent.type(await screen.findByLabelText('Amount received'), '100');
  await userEvent.type(screen.getByLabelText('Fee'), '50');
  await userEvent.click(screen.getByTestId('exchange-add-button'));
  expect(post).toHaveBeenCalledWith(
    expect.objectContaining({
      sourceAccount: 'jpy',
      destinationAccount: 'usd',
      sourceAmount: 15000,
      sourceFee: 50,
      destinationAmount: 10000,
      category: 'savings',
      notes: 'monthly',
      initiatingAccount: 'jpy',
      schedule: 'yen-schedule',
    }),
  );
  await waitFor(() => expect(store.getState().modals.modalStack).toEqual([]));
});

it('requires the other amount when a fee is entered', async () => {
  const { post } = setup();
  await userEvent.type(await screen.findByLabelText('Exchange rate'), '0.0066');
  await userEvent.type(screen.getByLabelText('Fee'), '50');
  await userEvent.click(screen.getByTestId('exchange-add-button'));
  expect(
    screen.getByText('Enter the amount received in Checking.'),
  ).toBeTruthy();
  expect(post).not.toHaveBeenCalled();

  // Without the fee, the rate alone completes the occurrence.
  await userEvent.clear(screen.getByLabelText('Fee'));
  await userEvent.click(screen.getByTestId('exchange-add-button'));
  await waitFor(() => expect(post).toHaveBeenCalled());
});
