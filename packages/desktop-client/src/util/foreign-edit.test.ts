import type {
  AccountEntity,
  PayeeEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

import * as modalsSlice from '#modals/modalsSlice';
import { aqlQuery } from '#queries/aqlQuery';

import {
  foreignEditErrorMessage,
  isExchangeRow,
  openForeignEditDialog,
} from './foreign-edit';

vi.mock('#queries/aqlQuery', () => ({ aqlQuery: vi.fn() }));

const usd = { id: 'usd', name: 'Checking' } as AccountEntity;
const yen = {
  id: 'yen',
  name: 'Yen',
  currency: 'JPY',
  currency_precision: 0,
} as AccountEntity;
const yen2 = { ...yen, id: 'yen2', name: 'Yen 2' } as AccountEntity;
const accounts = [usd, yen, yen2];
const payees = [
  { id: 'to-usd', name: '', transfer_acct: 'usd' },
  { id: 'to-yen', name: '', transfer_acct: 'yen' },
  { id: 'to-yen2', name: '', transfer_acct: 'yen2' },
] as PayeeEntity[];

const row = (fields: Partial<TransactionEntity>) =>
  ({
    id: 't',
    account: 'yen',
    amount: -1000,
    transaction_amount: -1500,
    date: '2026-03-10',
    ...fields,
  }) as TransactionEntity;

function opened() {
  const spy = vi.mocked(modalsSlice.pushModal);
  return spy.mock.calls.at(-1)?.[0].modal;
}

beforeEach(() => {
  vi.spyOn(modalsSlice, 'pushModal');
});

describe('recognizing exchange rows', () => {
  it('finds legs, fee parents and fee children, but not same-encoding transfers', () => {
    const leg = row({
      id: 'leg',
      payee: 'to-usd',
      transfer_id: 'x',
      is_child: true,
      parent_id: 'p',
    });
    const parent = row({ id: 'p', is_parent: true });
    const fee = row({ id: 'fee', is_child: true, parent_id: 'p' });
    const rows = [parent, leg, fee];
    for (const r of rows) {
      expect(isExchangeRow(r, rows, payees, accounts)).toBe(true);
    }
    const sameEncoding = row({ payee: 'to-yen2', transfer_id: 'x' });
    expect(isExchangeRow(sameEncoding, [sameEncoding], payees, accounts)).toBe(
      false,
    );
  });
});

describe('opening the edit dialog', () => {
  // Runs thunks against an empty modal stack.
  const dispatch: Parameters<typeof openForeignEditDialog>[0] = vi.fn(
    (action: unknown) =>
      typeof action === 'function'
        ? action(dispatch, () => ({ modals: { modalStack: [] } }))
        : action,
  ) as never;
  const onSaved = vi.fn();

  it('edits a native amount with the stored snapshot', async () => {
    const stored = row({ reconciled: true });
    expect(
      await openForeignEditDialog(dispatch, {
        row: stored,
        rows: [stored],
        payees,
        accounts,
        native: -2000,
        onSaved,
      }),
    ).toBe(true);
    expect(opened()).toMatchObject({
      name: 'foreign-amount',
      options: {
        transaction: { transaction_amount: -2000 },
        currencyCode: 'JPY',
        nativePrecision: 0,
        edit: {
          kind: 'entry',
          id: 't',
          reconciled: true,
          expected: {
            account: 'yen',
            amount: -1000,
            transaction_amount: -1500,
            date: '2026-03-10',
          },
        },
      },
    });
  });

  it('starts a valuation edit from a typed base, keeping the native amount', async () => {
    const stored = row({});
    await openForeignEditDialog(dispatch, {
      row: stored,
      rows: [stored],
      payees,
      accounts,
      baseAmount: -1234,
      onSaved,
    });
    expect(opened()).toMatchObject({
      options: {
        transaction: { transaction_amount: -1500 },
        edit: { baseAmount: -1234 },
      },
    });
  });

  it('includes the counterpart of a same-encoding transfer', async () => {
    vi.mocked(aqlQuery).mockResolvedValue({
      data: [
        {
          id: 'c',
          account: 'yen2',
          amount: 1000,
          transaction_amount: 1500,
          date: '2026-03-10',
          reconciled: true,
        },
      ],
      dependencies: [],
    });
    const stored = row({ payee: 'to-yen2', transfer_id: 'c' });
    await openForeignEditDialog(dispatch, {
      row: stored,
      rows: [stored],
      payees,
      accounts,
      native: -3000,
      onSaved,
    });
    expect(opened()).toMatchObject({
      options: {
        edit: {
          kind: 'transfer',
          reconciled: true,
          expected: { counterpart: { account: 'yen2', amount: 1000 } },
        },
      },
    });
  });

  it('opens the split and exchange dialogs for their rows', async () => {
    const child = row({ id: 'c1', is_child: true, parent_id: 'p' });
    await openForeignEditDialog(dispatch, {
      row: child,
      rows: [row({ id: 'p', is_parent: true }), child],
      payees,
      accounts,
      onSaved,
    });
    expect(opened()).toEqual({
      name: 'foreign-split',
      options: { id: 'p', onSaved },
    });

    const leg = row({
      id: 'usd-leg',
      account: 'usd',
      transaction_amount: null,
      payee: 'to-yen',
      transfer_id: 'yen-leg',
    });
    await openForeignEditDialog(dispatch, {
      row: leg,
      rows: [leg],
      payees,
      accounts,
      onSaved,
    });
    expect(opened()).toEqual({
      name: 'exchange-transfer',
      options: { edit: { id: 'usd-leg', onSaved } },
    });
  });

  it('leaves budget-currency rows to ordinary editing', async () => {
    const stored = row({ account: 'usd', transaction_amount: null });
    expect(
      await openForeignEditDialog(dispatch, {
        row: stored,
        rows: [stored],
        payees,
        accounts,
        onSaved,
      }),
    ).toBe(false);
  });
});

describe('foreign edit error messages', () => {
  const t = ((text: string) => text) as never;

  it('reads codes from transport-shaped rejections and Error instances', () => {
    expect(
      foreignEditErrorMessage(t, {
        type: 'ServerError',
        message: 'foreign-import-identity-conflict',
      }),
    ).toBe('This fee was imported from your bank, so it cannot be removed.');
    expect(foreignEditErrorMessage(t, new Error('date-invalid'))).toBe(
      'Enter a valid date.',
    );
    expect(foreignEditErrorMessage(t, { type: 'ServerError' })).toBe(
      'This transaction could not be saved.',
    );
  });
});
