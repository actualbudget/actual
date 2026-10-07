import { HotkeysProvider } from 'react-hotkeys-hook';
import { MemoryRouter } from 'react-router';

import { initServer } from '@actual-app/core/platform/client/connection';
import type {
  AccountEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { accountQueries } from '#accounts';
import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';
import { aqlQuery } from '#queries/aqlQuery';

import { ForeignMoveModal } from './ForeignMoveModal';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);
vi.mock('#queries/aqlQuery', () => ({ aqlQuery: vi.fn() }));

const accounts = [
  { id: 'usd', name: 'Checking', offbudget: 0, currency: null },
  {
    id: 'jpy',
    name: 'Yen',
    offbudget: 0,
    currency: 'JPY',
    currency_precision: 0,
  },
  {
    id: 'kwd',
    name: 'Dinar',
    offbudget: 0,
    currency: 'KWD',
    currency_precision: 3,
  },
] as AccountEntity[];

const yenRow = {
  id: 't',
  account: 'jpy',
  amount: -1000,
  transaction_amount: -1500,
  date: '2026-03-10',
  category: 'food',
  reconciled: false,
} as TransactionEntity;

const rates: Record<string, string> = { JPY: '150', KWD: '0.3' };

function setup({
  row = yenRow,
  account = 'usd',
  move = vi.fn().mockResolvedValue({
    status: 'ok',
    baseBefore: -1000,
    baseAfter: -1000,
    scheduleUnlinked: false,
  }),
  effects = vi.fn().mockResolvedValue([]),
  scheduleAccount = null as string | null,
}: {
  row?: TransactionEntity;
  account?: string;
  move?: ReturnType<typeof vi.fn>;
  effects?: ReturnType<typeof vi.fn>;
  scheduleAccount?: string | null;
} = {}) {
  vi.mocked(aqlQuery).mockImplementation(async query =>
    JSON.stringify(query).includes('schedules')
      ? { data: [{ _account: scheduleAccount }], dependencies: [] }
      : { data: [row], dependencies: [] },
  );
  initServer({
    'exchange-rates/resolve': async ({ quoteCurrency }) =>
      rates[quoteCurrency]
        ? {
            status: 'resolved',
            rate: rates[quoteCurrency],
            kind: 'standing',
            source: 'manual',
            timestamp: null,
            fallback: false,
          }
        : { status: 'unavailable' },
    'transactions/move-foreign-entry': move as never,
    'budget/edit-effects': effects as never,
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
  render(
    <TestProviders store={store} queryClient={queryClient}>
      <MemoryRouter>
        <HotkeysProvider>
          <ForeignMoveModal id={row.id} account={account} onSaved={onSaved} />
        </HotkeysProvider>
      </MemoryRouter>
    </TestProviders>,
  );
  return { move, effects, onSaved, store, queryClient };
}

const snapshot = {
  account: 'jpy',
  amount: -1000,
  transaction_amount: -1500,
  date: '2026-03-10',
  category: 'food',
  reconciled: false,
};

describe('ForeignMoveModal', () => {
  it('moves a yen payment to the budget currency at its base', async () => {
    const { move, onSaved } = setup();
    const amount = await screen.findByLabelText('Amount in Checking');
    await waitFor(() => expect(amount).toHaveAttribute('placeholder', '10.00'));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Move' })).toBeEnabled(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Move' }));
    await waitFor(() =>
      expect(move).toHaveBeenCalledWith({
        id: 't',
        account: 'usd',
        expected: snapshot,
        transaction_amount: -1000,
        destinationEncoding: { currency: null, precision: null },
      }),
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it('estimates a foreign destination from the saved rate and sends the base shown', async () => {
    const { move } = setup({ account: 'kwd' });
    // The estimate appears once the saved rate arrives.
    const amount = await screen.findByLabelText('Amount in Dinar');
    await waitFor(() => expect(amount).toHaveAttribute('placeholder', '3.000'));
    expect(
      await screen.findByText(
        /Estimated from the saved rate 1 USD = 0.3\d* KWD/,
      ),
    ).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Amount in Dinar'), '3.100');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Move' })).toBeEnabled(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Move' }));
    await waitFor(() =>
      expect(move).toHaveBeenCalledWith(
        expect.objectContaining({
          account: 'kwd',
          transaction_amount: -3100,
          baseAmount: -1033,
          destinationEncoding: { currency: 'KWD', precision: 3 },
        }),
      ),
    );
  });

  it.each([
    ['foreign to base', { currency: null, currency_precision: null }],
    ['foreign to foreign', { currency: 'JPY', currency_precision: 0 }],
  ])(
    'locks when a sync changes the destination encoding (%s)',
    async (_case, encoding) => {
      const { move, queryClient } = setup({ account: 'kwd' });
      await userEvent.type(
        await screen.findByLabelText('Amount in Dinar'),
        '3.100',
      );
      act(() => {
        queryClient.setQueryData(
          accountQueries.list().queryKey,
          accounts.map(a => (a.id === 'kwd' ? { ...a, ...encoding } : a)),
        );
      });
      expect(
        await screen.findByText(/This transaction changed since you opened it/),
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Move' })).toBeNull();
      expect(move).not.toHaveBeenCalled();
    },
  );

  it('sends a typed rate with the base it shows', async () => {
    const { move } = setup({ account: 'kwd' });
    await userEvent.type(await screen.findByLabelText(/^Rate in/), '0.31');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Move' })).toBeEnabled(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Move' }));
    await waitFor(() =>
      expect(move).toHaveBeenCalledWith(
        expect.objectContaining({
          transaction_amount: -3000,
          rate: '0.31',
          replaceRate: false,
          expectedBaseAmount: -968,
        }),
      ),
    );
  });

  it('shows the budget notice and holds Move until it loads', async () => {
    let resolve: ((value: unknown) => void) | undefined;
    const effects = vi.fn(
      (_args: { rows: unknown[] }) =>
        new Promise(r => {
          resolve = r;
        }),
    );
    setup({ effects });
    await screen.findByLabelText('Amount in Checking');
    await waitFor(() => expect(effects).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Move' })).toBeDisabled();
    resolve?.([
      {
        month: '2026-03',
        effects: [
          { category: 'food', name: 'Food', kind: 'spending', amount: 0 },
        ],
      },
    ]);
    expect(
      await screen.findByText(/This changes the budget for March 2026/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move' })).toBeEnabled();
  });

  it('warns that the schedule link is removed and keeps a stale move open', async () => {
    setup({
      row: { ...yenRow, schedule: 's' },
      scheduleAccount: 'jpy',
      move: vi.fn().mockResolvedValue({ status: 'stale' }),
    });
    expect(
      await screen.findByText(
        'This transaction will no longer be linked to its schedule.',
      ),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Move' })).toBeEnabled(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Move' }));
    expect(
      await screen.findByText(/changed since you opened it/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move' })).toBeDisabled();
  });

  it('keeps a payment a payment when its base rounded to zero', async () => {
    const { move } = setup({
      row: { ...yenRow, amount: 0, transaction_amount: -1 },
      account: 'kwd',
    });
    await userEvent.type(
      await screen.findByLabelText('Amount in Dinar'),
      '0.005',
    );
    await userEvent.type(screen.getByLabelText('Base amount'), '0.01');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Move' })).toBeEnabled(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Move' }));
    await waitFor(() =>
      expect(move).toHaveBeenCalledWith(
        expect.objectContaining({ transaction_amount: -5, baseAmount: -1 }),
      ),
    );
  });

  it('writes nothing when cancelled', async () => {
    const { move } = setup();
    await screen.findByLabelText('Amount in Checking');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(move).not.toHaveBeenCalled();
  });
});
