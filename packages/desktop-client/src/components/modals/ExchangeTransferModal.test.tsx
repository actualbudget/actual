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
    'budget/edit-effects': async () => [],
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

describe('editing an exchange', () => {
  const expected = {
    a: {
      account: 'usd',
      amount: -10300,
      transaction_amount: null,
      date: '2026-03-10',
    },
  };
  const family = {
    status: 'ok' as const,
    expected,
    reconciled: false,
    selectedSide: 'destination' as const,
    sourceAccount: 'usd',
    destinationAccount: 'jpy',
    date: '2026-03-10',
    sourceAmount: 10000,
    destinationAmount: 15000,
    sourceFee: 0,
    destinationFee: 0,
    baseAmount: 10000,
    notes: 'trip',
    category: 'savings',
    feeCategory: null,
    postings: [
      {
        id: 'a',
        account: 'usd',
        category: 'savings',
        date: '2026-03-10',
        amount: -10000,
        isParent: false,
        transferAccount: 'jpy',
      },
    ],
  };

  function setupEdit(
    stored: typeof family | Record<string, unknown>,
    update = vi.fn().mockResolvedValue({ status: 'ok' }),
    accountList = accounts,
  ) {
    initServer({
      'budget/edit-effects': async () => [],
      'exchange-rates/resolve': async () => ({
        status: 'unavailable' as const,
      }),
      'transactions/get-exchange-family': async () => stored as never,
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
    const onSaved = vi.fn();
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(accountQueries.list().queryKey, accountList);
    render(
      <TestProviders store={store} queryClient={queryClient}>
        <MemoryRouter>
          <HotkeysProvider>
            <ExchangeTransferModal edit={{ id: 'b', onSaved }} />
          </HotkeysProvider>
        </MemoryRouter>
      </TestProviders>,
    );
    return { update, onSaved };
  }

  it('saves the shown amounts with only changed metadata', async () => {
    const { update, onSaved } = setupEdit(family);
    const amount = await screen.findByLabelText('Amount');
    expect(amount).toHaveValue('15,000');
    expect(screen.getByLabelText('Amount sent')).toHaveValue('100.00');
    await userEvent.clear(amount);
    await userEvent.type(amount, '14000');
    await userEvent.click(screen.getByTestId('exchange-add-button'));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({
        id: 'b',
        expected,
        sourceAmount: 10000,
        destinationAmount: 14000,
        sourceFee: 0,
        destinationFee: 0,
      }),
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it('shows the principal category read-only from the off-budget side', async () => {
    setupEdit(family);
    expect(
      await screen.findByText(/Edit it from Checking/),
    ).toBeInTheDocument();
    expect(screen.queryByText('Category', { selector: 'button *' })).toBeNull();
  });

  it('sends changed notes and date', async () => {
    const { update } = setupEdit(family);
    const notes = await screen.findByLabelText('Notes');
    await userEvent.clear(notes);
    await userEvent.type(notes, 'holiday');
    await userEvent.click(screen.getByTestId('exchange-add-button'));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ notes: 'holiday' }),
      ),
    );
    expect(update.mock.calls[0][0]).not.toHaveProperty('date');
  });

  it('sends the fee category for a fee child the save creates', async () => {
    const { update } = setupEdit({
      ...family,
      selectedSide: 'source',
      sourceAmount: 10300,
      sourceFee: 300,
      feeCategory: 'bank',
    });
    expect(await screen.findByLabelText('Fee')).toHaveValue('3.00');
    // Moving the fee to the yen side creates a new fee child there.
    await userEvent.click(screen.getByRole('button', { name: 'USD' }));
    await userEvent.click(await screen.findByRole('button', { name: 'JPY' }));
    await userEvent.clear(screen.getByLabelText('Fee'));
    await userEvent.type(screen.getByLabelText('Fee'), '450');
    await userEvent.click(screen.getByTestId('exchange-add-button'));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceFee: 0,
          destinationFee: 450,
          feeCategory: 'bank',
        }),
      ),
    );
  });

  it('keeps a stale edit open with a message', async () => {
    setupEdit(family, vi.fn().mockResolvedValue({ status: 'stale' }));
    await userEvent.click(await screen.findByTestId('exchange-add-button'));
    expect(
      await screen.findByText(/changed since you opened it/),
    ).toBeInTheDocument();
    expect(screen.getByTestId('exchange-add-button')).toBeDisabled();
  });

  it('previews the save for the budget notice and holds Save until it loads', async () => {
    const update = vi.fn(async (args: { preview?: boolean }) =>
      args.preview
        ? {
            status: 'preview',
            postings: [{ ...family.postings[0], amount: -9333 }],
          }
        : { status: 'ok' },
    );
    let resolve: ((value: unknown) => void) | undefined;
    const effects = vi.fn(
      (_args: { rows: unknown[] }) =>
        new Promise(r => {
          resolve = r;
        }),
    );
    initServer({
      'exchange-rates/resolve': async () => ({
        status: 'unavailable' as const,
      }),
      'transactions/get-exchange-family': async () => family as never,
      'transactions/update-exchange-transfer': update as never,
      'budget/edit-effects': effects as never,
    });
    const store = createTestAppStore();
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(accountQueries.list().queryKey, accounts);
    render(
      <TestProviders store={store} queryClient={queryClient}>
        <MemoryRouter>
          <HotkeysProvider>
            <ExchangeTransferModal edit={{ id: 'b' }} />
          </HotkeysProvider>
        </MemoryRouter>
      </TestProviders>,
    );
    await waitFor(() => expect(effects).toHaveBeenCalled());
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ preview: true }),
    );
    expect(effects.mock.lastCall![0]).toEqual({
      rows: [
        {
          before: expect.objectContaining({ amount: -10000 }),
          after: expect.objectContaining({ amount: -9333 }),
        },
      ],
    });
    expect(screen.getByTestId('exchange-add-button')).toBeDisabled();
    resolve?.([
      {
        month: '2026-03',
        effects: [
          {
            category: 'savings',
            name: 'Savings',
            kind: 'spending',
            amount: 667,
          },
        ],
      },
    ]);
    expect(
      await screen.findByText(/This changes the budget for March 2026/),
    ).toBeInTheDocument();
    expect(screen.getByTestId('exchange-add-button')).toBeEnabled();
  });

  it.each([
    [
      'failed',
      { status: 'rate-unavailable', currencies: ['JPY'], date: '' },
      'Budget effects could not be checked.',
    ],
    ['stale', { status: 'stale' }, /changed since you opened it/],
  ] as const)('reports a %s preview', async (_kind, previewResult, text) => {
    const update = vi.fn(async (args: { preview?: boolean }) =>
      args.preview ? previewResult : { status: 'ok' },
    );
    setupEdit(family, update);
    expect(await screen.findByText(text)).toBeInTheDocument();
    if (previewResult.status === 'stale') {
      expect(screen.getByTestId('exchange-add-button')).toBeDisabled();
    }
  });

  it('explains a family that can no longer be edited', async () => {
    setupEdit({ status: 'unavailable' });
    expect(
      await screen.findByText('This transfer can no longer be edited here.'),
    ).toBeInTheDocument();
  });
});
