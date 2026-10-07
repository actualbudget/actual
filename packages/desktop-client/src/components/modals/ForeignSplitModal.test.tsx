import { HotkeysProvider } from 'react-hotkeys-hook';
import { MemoryRouter } from 'react-router';

import { initServer } from '@actual-app/core/platform/client/connection';
import type {
  AccountEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { accountQueries } from '#accounts';
import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';
import { aqlQuery } from '#queries/aqlQuery';

import { ForeignSplitModal } from './ForeignSplitModal';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);
vi.mock('#queries/aqlQuery', () => ({ aqlQuery: vi.fn() }));

const yen = {
  id: 'jpy',
  name: 'Yen',
  offbudget: 0,
  currency: 'JPY',
  currency_precision: 0,
} as AccountEntity;

const parent = {
  id: 't',
  account: 'jpy',
  amount: -1000,
  transaction_amount: -1500,
  date: '2026-03-10',
  category: 'food',
} as TransactionEntity;

const snapshot = (row: TransactionEntity) => ({
  account: row.account,
  amount: row.amount,
  transaction_amount: row.transaction_amount,
  date: row.date,
  category: row.is_parent ? null : (row.category ?? null),
  reconciled: !!row.reconciled,
});

function setup(
  rows: TransactionEntity[],
  handlers: Record<string, ReturnType<typeof vi.fn>> = {},
  rate: string | null = '150',
  account = yen,
) {
  vi.mocked(aqlQuery).mockResolvedValue({ data: rows, dependencies: [] });
  const save = vi.fn().mockResolvedValue({ status: 'ok', ids: [] });
  const collapse = vi.fn().mockResolvedValue({ status: 'ok' });
  initServer({
    'budget/edit-effects': async () => [],
    'exchange-rates/resolve': async () =>
      rate
        ? {
            status: 'resolved',
            rate,
            kind: 'standing',
            source: 'manual',
            timestamp: null,
            fallback: false,
          }
        : { status: 'unavailable' },
    'transactions/save-foreign-split': save,
    'transactions/collapse-foreign-split': collapse,
    ...handlers,
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
  queryClient.setQueryData(accountQueries.list().queryKey, [account]);
  const onSaved = vi.fn();
  render(
    <TestProviders store={store} queryClient={queryClient}>
      <MemoryRouter>
        <HotkeysProvider>
          <ForeignSplitModal id="t" onSaved={onSaved} />
        </HotkeysProvider>
      </MemoryRouter>
    </TestProviders>,
  );
  return { save, collapse, onSaved, store };
}

describe('ForeignSplitModal', () => {
  it('splits a transaction once the splits add up, keeping its total', async () => {
    const { save, onSaved } = setup([parent]);
    const first = await screen.findByLabelText('Split amount 1');
    expect(first).toHaveValue('-1,500');
    const save_ = screen.getByRole('button', { name: 'Save' });
    await userEvent.clear(first);
    await userEvent.type(first, '-1000');
    expect(save_).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Split amount 2'), '-500');
    expect(save_).toBeEnabled();
    await userEvent.click(save_);
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        id: 't',
        expected: { t: snapshot(parent) },
        transaction_amount: -1500,
        children: [
          // New children send the ids their notice was computed with.
          {
            id: expect.any(String),
            transaction_amount: -1000,
            category: 'food',
            notes: null,
          },
          {
            id: expect.any(String),
            transaction_amount: -500,
            category: null,
            notes: null,
          },
        ],
      }),
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it('sends only changed metadata for existing splits and removes the split', async () => {
    const children = [
      {
        ...parent,
        id: 'c1',
        parent_id: 't',
        is_child: true,
        transaction_amount: -700,
        amount: -467,
        notes: 'a',
      },
      {
        ...parent,
        id: 'c2',
        parent_id: 't',
        is_child: true,
        transaction_amount: -800,
        amount: -533,
        notes: 'b',
      },
    ] as TransactionEntity[];
    const stored = {
      ...parent,
      is_parent: true,
      category: undefined,
    } as TransactionEntity;
    const { save, collapse } = setup([stored, ...children]);
    const notes = await screen.findByLabelText('Split notes 2');
    await userEvent.clear(notes);
    await userEvent.type(notes, 'changed');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          expected: {
            t: snapshot(stored),
            c1: snapshot(children[0]),
            c2: snapshot(children[1]),
          },
          children: [
            { id: 'c1', transaction_amount: -700 },
            { id: 'c2', transaction_amount: -800, notes: 'changed' },
          ],
        }),
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Remove split' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirm removing the split' }),
    );
    await waitFor(() =>
      expect(collapse).toHaveBeenCalledWith({
        id: 't',
        expected: expect.objectContaining({ t: snapshot(stored) }),
      }),
    );
  });

  it('asks for a rate for a zero total without a saved rate', async () => {
    const zero = { ...parent, amount: 0, transaction_amount: 0 };
    const { save } = setup([zero], {}, null);
    const first = await screen.findByLabelText('Split amount 1');
    await userEvent.clear(first);
    await userEvent.type(first, '100');
    await userEvent.type(screen.getByLabelText('Split amount 2'), '-100');
    expect(
      screen.getByText(/each split is valued at the rate below/),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByText('Enter a rate to value the split amounts.'),
    ).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText(/^Rate in/), '150');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({ rate: '150' }),
      ),
    );
  });

  it('sends the base shown for a changed total and rejects invalid input', async () => {
    const { save } = setup([parent]);
    const total = await screen.findByLabelText('Total');
    await userEvent.clear(total);
    await userEvent.type(total, '-3000');
    const first = screen.getByLabelText('Split amount 1');
    await userEvent.clear(first);
    await userEvent.type(first, '-3000');
    expect(await screen.findByText(/Base amount .*20\.00/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/^Rate in/), '0');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await userEvent.clear(screen.getByLabelText(/^Rate in/));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          transaction_amount: -3000,
          baseAmount: -2000,
        }),
      ),
    );
  });

  it('values a total changed to zero at the rate shown, ignoring a hidden base', async () => {
    const { save } = setup([parent]);
    const total = await screen.findByLabelText('Total');
    await userEvent.clear(total);
    await userEvent.type(total, '-3000');
    await userEvent.type(screen.getByLabelText('Base amount'), '30');
    await userEvent.clear(total);
    await userEvent.type(total, '0');
    const first = screen.getByLabelText('Split amount 1');
    await userEvent.clear(first);
    await userEvent.type(first, '300');
    await userEvent.type(screen.getByLabelText('Split amount 2'), '-300');
    expect(screen.queryByLabelText('Base amount')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(save).toHaveBeenCalled());
    const request = save.mock.calls[0][0];
    expect(request).toMatchObject({ transaction_amount: 0, rate: '150' });
    expect(request).not.toHaveProperty('baseAmount');
  });

  it('previews the save and the removal for the budget notice', async () => {
    const effects = vi.fn().mockResolvedValue([
      {
        month: '2026-03',
        effects: [
          { category: 'food', name: 'Food', kind: 'spending', amount: 400 },
        ],
      },
    ]);
    const children = [
      {
        ...parent,
        id: 'c1',
        parent_id: 't',
        is_child: true,
        transaction_amount: -700,
        amount: -467,
      },
      {
        ...parent,
        id: 'c2',
        parent_id: 't',
        is_child: true,
        transaction_amount: -800,
        amount: -533,
      },
    ] as TransactionEntity[];
    const stored = { ...parent, is_parent: true } as TransactionEntity;
    setup([stored, ...children], { 'budget/edit-effects': effects });
    expect(
      await screen.findByText(/This changes the budget for March 2026/),
    ).toBeInTheDocument();
    const saveRows = effects.mock.lastCall![0].rows;
    expect(saveRows[0]).toMatchObject({
      before: { isParent: true, category: null, amount: -1000 },
      after: { isParent: true, category: null, amount: -1000 },
    });
    expect(
      saveRows
        .slice(1)
        .reduce(
          (sum: number, row: { after: { amount: number } }) =>
            sum + row.after.amount,
          0,
        ),
    ).toBe(-1000);

    await userEvent.click(screen.getByRole('button', { name: 'Remove split' }));
    // Removal is exclusive: Save leaves until the split is kept.
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    await waitFor(() =>
      expect(effects.mock.lastCall![0].rows).toEqual([
        expect.objectContaining({
          after: expect.objectContaining({ isParent: false, amount: -1000 }),
        }),
        expect.objectContaining({ after: null }),
        expect.objectContaining({ after: null }),
      ]),
    );
  });

  it('hides categories in an off-budget account', async () => {
    setup([parent], {}, '150', { ...yen, offbudget: 1 });
    await screen.findByLabelText('Split amount 1');
    expect(screen.queryByRole('button', { name: 'Category' })).toBeNull();
  });

  it('keeps a stale split open and unsaveable', async () => {
    setup([parent], {
      'transactions/save-foreign-split': vi
        .fn()
        .mockResolvedValue({ status: 'stale' }),
    });
    await userEvent.type(await screen.findByLabelText('Split amount 2'), '0');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByText(/changed since you opened it/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
