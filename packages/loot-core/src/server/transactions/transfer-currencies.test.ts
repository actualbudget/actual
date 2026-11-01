import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { setSqlConversionState } from '#shared/fx/sql';

import { batchUpdateTransactions } from '.';

let transferToUsd: string;
let transferToUsdSavings: string;
let transferToJpy: string;
let transferToCad: string;
let transferToCadSavings: string;

const rates = [
  {
    id: 'usd-cad',
    from_currency: 'USD',
    to_currency: 'CAD',
    rate: 1.4,
    date: '2026-01-01',
    source: 'manual' as const,
    created_at: 1,
  },
  {
    id: 'usd-cad-later',
    from_currency: 'USD',
    to_currency: 'CAD',
    rate: 1.25,
    date: '2026-06-01',
    source: 'manual' as const,
    created_at: 1,
  },
];

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  setSqlConversionState({
    enabled: true,
    defaultCurrencyCode: 'CAD',
    rateMode: 'latest',
    rates,
  });

  await db.insertAccount({ id: 'cad', name: 'Chequing' });
  await db.insertAccount({ id: 'cad-savings', name: 'Savings' });
  await db.insertAccount({ id: 'usd', name: 'US', currency: 'USD' });
  await db.insertAccount({
    id: 'usd-savings',
    name: 'US Savings',
    currency: 'USD',
  });
  await db.insertAccount({ id: 'jpy', name: 'Japan', currency: 'JPY' });
  transferToCad = await db.insertPayee({ name: '', transfer_acct: 'cad' });
  transferToCadSavings = await db.insertPayee({
    name: '',
    transfer_acct: 'cad-savings',
  });
  transferToUsd = await db.insertPayee({ name: '', transfer_acct: 'usd' });
  transferToUsdSavings = await db.insertPayee({
    name: '',
    transfer_acct: 'usd-savings',
  });
  transferToJpy = await db.insertPayee({ name: '', transfer_acct: 'jpy' });
});

afterEach(() => {
  setSqlConversionState({
    enabled: false,
    defaultCurrencyCode: '',
    rateMode: 'latest',
    rates: [],
  });
});

async function addTransaction(
  transaction: { id: string; account: string; amount: number; payee: string },
  transferAmounts?: Record<string, number>,
) {
  await batchUpdateTransactions({
    added: [{ date: '2026-03-15', ...transaction }],
    transferAmounts,
  });
}

async function getAmounts() {
  const rows = await db.all<Pick<db.DbTransaction, 'acct' | 'amount'>>(
    'SELECT acct, amount FROM transactions WHERE tombstone = 0 ORDER BY acct',
  );
  return Object.fromEntries(rows.map(row => [row.acct, row.amount]));
}

async function update(transaction: { id: string; [field: string]: unknown }) {
  await batchUpdateTransactions({ updated: [transaction] });
}

describe('transfers between currencies', () => {
  test('mirror the amount within one currency', async () => {
    await addTransaction({
      id: 'out',
      account: 'cad',
      amount: -150000,
      payee: transferToCadSavings,
    });

    expect(await getAmounts()).toEqual({ cad: -150000, 'cad-savings': 150000 });
  });

  test('convert with the rate of the transaction date', async () => {
    await addTransaction({
      id: 'out',
      account: 'cad',
      amount: -140000,
      payee: transferToUsd,
    });

    expect(await getAmounts()).toEqual({ cad: -140000, usd: 100000 });
  });

  test.each([
    // No CAD-JPY rate: 1:1, ¥1,500, stored like every amount with two
    // implied decimals
    [-150000, 150000],
    // CA$15.25 is ¥15.25, rounded to whole yen
    [-1525, 1500],
  ])(
    'convert %i into whole units of a currency without decimals',
    async (amount, expected) => {
      await addTransaction({
        id: 'out',
        account: 'cad',
        amount,
        payee: transferToJpy,
      });

      expect(await getAmounts()).toEqual({ cad: amount, jpy: expected });
    },
  );

  test('keep the amount the user entered for the other side', async () => {
    await addTransaction(
      { id: 'out', account: 'cad', amount: -150000, payee: transferToUsd },
      { out: 100000 },
    );

    expect(await getAmounts()).toEqual({ cad: -150000, usd: 100000 });
  });

  test('give the entered amount the opposite sign', async () => {
    await addTransaction(
      { id: 'in', account: 'usd', amount: 100000, payee: transferToCad },
      { in: 150000 },
    );

    expect(await getAmounts()).toEqual({ cad: -150000, usd: 100000 });
  });

  test.each([
    ['a fraction', 1000.5],
    ['an unsafe integer', 2 ** 53],
    ['an amount too large to add up', 2 ** 52],
    ['text', '100000'],
    ['nothing', null],
  ])('ignore %s entered for the other side', async (_, enteredAmount) => {
    await addTransaction(
      { id: 'out', account: 'cad', amount: -140000, payee: transferToUsd },
      { out: enteredAmount as number },
    );

    // Converted with the rate of the day instead
    expect(await getAmounts()).toEqual({ cad: -140000, usd: 100000 });
  });

  test('keep the other side when one side is edited', async () => {
    await addTransaction(
      { id: 'out', account: 'cad', amount: -150000, payee: transferToUsd },
      { out: 100000 },
    );
    await update({ id: 'out', amount: -151000, notes: 'Wise' });

    expect(await getAmounts()).toEqual({ cad: -151000, usd: 100000 });

    const { transfer_id: otherId } = await db.getTransaction('out');
    await update({ id: otherId, amount: 99000 });

    expect(await getAmounts()).toEqual({ cad: -151000, usd: 99000 });
  });

  test('follow a change of sign', async () => {
    await addTransaction(
      { id: 'out', account: 'cad', amount: -150000, payee: transferToUsd },
      { out: 100000 },
    );
    await update({ id: 'out', amount: 150000 });

    expect(await getAmounts()).toEqual({ cad: 150000, usd: -100000 });
  });

  test('keep the other side when one side goes to zero and back', async () => {
    await addTransaction(
      { id: 'out', account: 'cad', amount: -150000, payee: transferToUsd },
      { out: 100000 },
    );
    await update({ id: 'out', amount: 0 });

    expect(await getAmounts()).toEqual({ cad: 0, usd: 100000 });

    await update({ id: 'out', amount: -150000 });

    expect(await getAmounts()).toEqual({ cad: -150000, usd: 100000 });
  });

  test('convert once a transfer without an amount gets one', async () => {
    await addTransaction({
      id: 'out',
      account: 'cad',
      amount: 0,
      payee: transferToUsd,
    });

    expect(await getAmounts()).toEqual({ cad: 0, usd: 0 });

    await update({ id: 'out', amount: -140000 });

    expect(await getAmounts()).toEqual({ cad: -140000, usd: 100000 });
  });

  test('take an entered amount when the edit asks for one', async () => {
    await addTransaction(
      { id: 'out', account: 'cad', amount: -150000, payee: transferToUsd },
      { out: 100000 },
    );
    await batchUpdateTransactions({
      updated: [{ id: 'out', amount: -160000 }],
      transferAmounts: { out: 110000 },
    });

    expect(await getAmounts()).toEqual({ cad: -160000, usd: 110000 });
  });

  test('keep the amount when the transfer goes to another account in the same currency', async () => {
    await addTransaction(
      { id: 'out', account: 'cad', amount: -150000, payee: transferToUsd },
      { out: 100000 },
    );
    await update({ id: 'out', payee: transferToUsdSavings });

    expect(await getAmounts()).toEqual({
      cad: -150000,
      'usd-savings': 100000,
    });
  });

  test('convert again when the transfer goes to another currency', async () => {
    await addTransaction(
      { id: 'out', account: 'cad', amount: -150000, payee: transferToUsd },
      { out: 100000 },
    );
    await update({ id: 'out', payee: transferToJpy });

    expect(await getAmounts()).toEqual({ cad: -150000, jpy: 150000 });

    await update({ id: 'out', payee: transferToCadSavings });

    expect(await getAmounts()).toEqual({ cad: -150000, 'cad-savings': 150000 });
  });
});

describe('transfers edited on both sides in one batch', () => {
  async function getNotes(...ids: string[]) {
    return Promise.all(
      ids.map(async id => (await db.getTransaction(id)).notes),
    );
  }

  test('keep what each side was given between currencies', async () => {
    await addTransaction(
      { id: 'out', account: 'cad', amount: -150000, payee: transferToUsd },
      { out: 100000 },
    );
    const { transfer_id: otherId } = await db.getTransaction('out');
    await batchUpdateTransactions({
      updated: [
        { id: 'out', amount: -160000, notes: 'Wise' },
        { id: otherId, amount: 110000, notes: 'Arrived' },
      ],
    });

    expect(await getAmounts()).toEqual({ cad: -160000, usd: 110000 });
    expect(await getNotes('out', otherId)).toEqual(['Wise', 'Arrived']);
  });

  test('keep what each side was given within one currency', async () => {
    await addTransaction({
      id: 'out',
      account: 'cad',
      amount: -150000,
      payee: transferToCadSavings,
    });
    const { transfer_id: otherId } = await db.getTransaction('out');
    await batchUpdateTransactions({
      updated: [
        { id: 'out', notes: 'Rent' },
        { id: otherId, notes: 'Savings' },
      ],
    });

    // Rather than each side taking the notes of the other
    expect(await getNotes('out', otherId)).toEqual(['Rent', 'Savings']);
    expect(await getAmounts()).toEqual({ cad: -150000, 'cad-savings': 150000 });
  });
});

describe('transfers while multiple currencies are off', () => {
  beforeEach(() => {
    setSqlConversionState({
      enabled: false,
      defaultCurrencyCode: 'CAD',
      rateMode: 'latest',
      rates,
    });
  });

  test('mirror the amount between accounts in different currencies', async () => {
    await addTransaction(
      { id: 'out', account: 'cad', amount: -140000, payee: transferToUsd },
      { out: 90000 },
    );

    expect(await getAmounts()).toEqual({ cad: -140000, usd: 140000 });

    await update({ id: 'out', amount: -150000 });

    expect(await getAmounts()).toEqual({ cad: -150000, usd: 150000 });
  });
});
