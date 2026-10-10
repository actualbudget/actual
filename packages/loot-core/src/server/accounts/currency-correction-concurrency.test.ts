import { Timestamp } from '@actual-app/crdt';

import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { app as exchangeRatesApp } from '#server/exchange-rates/app';
import * as prefs from '#server/prefs';
import { applyMessages, setSyncingMode } from '#server/sync';
import {
  amountPair,
  pairEncoding,
  parseAmountPair,
} from '#server/sync/coupled-cells';
import { batchUpdateTransactions } from '#server/transactions';
import { loadRules } from '#server/transactions/transaction-rules';
import { undo } from '#server/undo';

import { app } from './app';
import {
  correctAccountCurrency,
  previewCurrencyCorrection,
  previewStaleEncodingRepair,
  repairStaleEncoding,
  staleEncodingRows,
} from './currency-correction';

vi.mock('#server/main', () => ({ getDefaultDocumentDir: vi.fn() }));

async function saveRate(quoteCurrency: string, rate: string) {
  await exchangeRatesApp.handlers['exchange-rates/save']({
    quoteCurrency,
    rate,
    kind: 'standing',
    date: '2016-01-01',
  });
}

type Remote = {
  dataset: string;
  row: string;
  column: string;
  value: string | number | null;
};
const remote = (
  dataset: string,
  row: string,
  column: string,
  value: string | number | null,
  timestamp = Timestamp.send()!,
) => ({ dataset, row, column, value, timestamp });

/** A transaction another device added: its cells as sync delivers them. */
function remoteRow(id: string, account: string, pair: string) {
  const parsed = parseAmountPair(pair)!;
  return [
    remote('transactions', id, 'acct', account),
    remote('transactions', id, 'date', 20170110),
    remote('transactions', id, 'amount', parsed.amount),
    remote('transactions', id, 'transaction_amount', parsed.transaction_amount),
    remote('transactions', id, 'amount_pair', pair),
  ] satisfies Remote[];
}

/** Seeded directly with its authority, as a synced row would be stored. */
function seed(
  id: string,
  account: string,
  amount: number,
  native: number | null,
  stamp: string,
  fields: { isParent?: boolean; parent?: string; transfer?: string } = {},
) {
  db.runQuery(
    `INSERT INTO transactions (id, acct, date, amount, transaction_amount,
       amount_pair, isParent, isChild, parent_id, transferred_id, tombstone,
       sort_order)
     VALUES (?, ?, 20170110, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
    [
      id,
      account,
      amount,
      native,
      amountPair(amount, native, account, stamp),
      fields.isParent ? 1 : 0,
      fields.parent ? 1 : 0,
      fields.parent ?? null,
      fields.transfer ?? null,
    ],
  );
  db.runQuery('UPDATE accounts SET currency_locked = 1 WHERE id = ?', [
    account,
  ]);
}

const stored = (id: string) =>
  db.firstSync<{
    amount: number;
    transaction_amount: number | null;
    amount_pair: string | null;
  }>(
    'SELECT amount, transaction_amount, amount_pair FROM transactions WHERE id = ?',
    [id],
  )!;
const accountRow = (id: string) =>
  db.firstSync<{
    currency: string | null;
    currency_precision: number | null;
    encoding: string | null;
    balance_current: number | null;
  }>(
    'SELECT currency, currency_precision, encoding, balance_current FROM accounts WHERE id = ?',
    [id],
  )!;

async function correct(
  account: string,
  currency: string | null,
  mode: 'convert' | 'keep',
) {
  const preview = await previewCurrencyCorrection({ account, currency, mode });
  return correctAccountCurrency({
    account,
    currency,
    mode,
    fingerprint: preview.fingerprint,
  });
}

async function repair(account: string, mode: 'convert' | 'keep') {
  const preview = await previewStaleEncodingRepair({ account, mode });
  return {
    preview,
    result: await repairStaleEncoding({
      account,
      mode,
      fingerprint: preview.fingerprint,
    }),
  };
}

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  await prefs.loadPrefs();
  await db.update('preferences', { id: 'defaultCurrencyCode', value: 'USD' });
  await prefs.savePrefs({
    amountEncoding: JSON.stringify({
      version: 1,
      currencyCode: 'USD',
      precision: 2,
    }),
  });
  for (const flag of ['currency', 'multicurrency']) {
    await db.update('preferences', { id: `flags.${flag}`, value: 'true' });
  }
  await loadRules();
  for (const account of [
    { id: 'usd', name: 'Checking' },
    { id: 'jpy', name: 'Yen', currency: 'JPY' },
    { id: 'kwd', name: 'Dinar', currency: 'KWD' },
  ]) {
    await db.insertAccount(account);
    await db.insertPayee({ name: '', transfer_acct: account.id });
  }
});

describe('pair grammar', () => {
  it('stamps the encoding and keeps older forms readable and unstamped', () => {
    expect(amountPair(-1000, -1500, 'jpy', 'JPY.0')).toBe(
      '-1000:-1500@jpy~JPY.0',
    );
    expect(amountPair(-1000, null, 'usd', '')).toBe('-1000:@usd~');
    expect(parseAmountPair('-1000:-1500@jpy~JPY.0')).toEqual({
      amount: -1000,
      transaction_amount: -1500,
      acct: 'jpy',
    });
    expect(parseAmountPair('-1000:@usd~')).toEqual({
      amount: -1000,
      transaction_amount: null,
      acct: 'usd',
    });
    expect(pairEncoding('-1000:-1500@jpy~JPY.0')).toBe('JPY.0');
    expect(pairEncoding('-1000:@usd~')).toBe('');
    expect(pairEncoding('-1000:-1500@jpy')).toBeUndefined();
    expect(pairEncoding('-1000:-1500')).toBeUndefined();
  });
});

describe('account encoding', () => {
  it('is written by every create, budget-currency accounts included', () => {
    expect(accountRow('usd').encoding).toBe('');
    expect(accountRow('jpy')).toMatchObject({
      currency: 'JPY',
      currency_precision: 0,
      encoding: 'JPY.0',
    });
  });

  it('converges concurrent currency changes to one complete encoding', async () => {
    // A JPY change and a KWD change from two devices, cells interleaved.
    await applyMessages([
      remote('accounts', 'usd', 'currency', 'JPY'),
      remote('accounts', 'usd', 'currency_precision', 3),
      remote('accounts', 'usd', 'encoding', 'KWD.3'),
    ]);
    expect(accountRow('usd')).toMatchObject({
      currency: 'KWD',
      currency_precision: 3,
    });
    await applyMessages([remote('accounts', 'usd', 'encoding', '')]);
    expect(accountRow('usd')).toMatchObject({
      currency: null,
      currency_precision: null,
    });
  });

  it('stamps every guarded write with the account encoding', async () => {
    await db.insertTransaction({
      id: 'b',
      account: 'usd',
      date: '2017-01-10',
      amount: -500,
    });
    await db.insertTransaction({
      id: 'f',
      account: 'jpy',
      date: '2017-01-10',
      amount: -1000,
      transaction_amount: -1500,
    });
    expect(stored('b').amount_pair).toBe('-500:@usd~');
    expect(stored('f').amount_pair).toBe('-1000:-1500@jpy~JPY.0');
  });
});

describe('stale rows', () => {
  beforeEach(async () => {
    await saveRate('JPY', '150');
    seed('a', 'usd', -1000, null, '');
  });

  it('detects a row added offline under the previous currency', async () => {
    expect(await correct('usd', 'JPY', 'convert')).toMatchObject({
      status: 'ok',
    });
    await applyMessages(remoteRow('r', 'usd', '-500:@usd~'));
    expect(await staleEncodingRows()).toEqual([
      { account: 'usd', stamp: '', count: 1 },
    ]);
  });

  it('detects a later edit and lets an earlier one lose', async () => {
    // Timestamps decide only once local writes are recorded as messages.
    setSyncingMode('enabled');
    onTestFinished(() => {
      setSyncingMode('disabled');
    });
    const earlier = remote('transactions', 'a', 'amount_pair', '-900:@usd~');
    await correct('usd', 'JPY', 'convert');
    await applyMessages([earlier]);
    expect(await staleEncodingRows()).toEqual([]);
    expect(stored('a').amount_pair).toBe('-1000:-1500@usd~JPY.0');
    await applyMessages([
      remote('transactions', 'a', 'amount_pair', '-900:@usd~'),
    ]);
    expect(await staleEncodingRows()).toEqual([
      { account: 'usd', stamp: '', count: 1 },
    ]);
  });

  it('detects the MC-1 gap: an empty account changed while a row was offline', async () => {
    await db.insertAccount({ id: 'empty', name: 'Empty' });
    await app.handlers['account-update']({ id: 'empty', currency: 'JPY' });
    await applyMessages(remoteRow('r', 'empty', '-500:@empty~'));
    expect(await staleEncodingRows()).toEqual([
      { account: 'empty', stamp: '', count: 1 },
    ]);
  });

  it('rejects amount edits and allows metadata edits and deletes', async () => {
    await correct('usd', 'JPY', 'convert');
    await applyMessages([
      ...remoteRow('r', 'usd', '-500:@usd~'),
      ...remoteRow('s', 'usd', '-700:@usd~'),
    ]);
    await expect(
      db.updateTransaction({ id: 'r', amount: -600, transaction_amount: -900 }),
    ).rejects.toThrow('transaction-encoding-stale');
    await db.updateTransaction({ id: 'r', notes: 'checked' });
    expect(stored('r').amount_pair).toBe('-500:@usd~');
    await db.deleteTransaction({ id: 's' });
  });

  it('keeps the pair when an editor resends unchanged amounts', async () => {
    await correct('usd', 'JPY', 'convert');
    await applyMessages(remoteRow('r', 'usd', '-500:@usd~'));
    const expected = {
      account: 'usd',
      amount: -500,
      transaction_amount: null,
      date: '2017-01-10',
    };
    const scope = (final: { amount: number; transaction_amount: number }) => ({
      foreignEdits: new Map([
        [
          'r',
          {
            action: 'update' as const,
            expected,
            final: { account: 'usd', ...final },
          },
        ],
      ]),
    });
    await db.updateTransaction(
      { id: 'r', amount: -500, transaction_amount: null, notes: 'checked' },
      scope({ amount: -500, transaction_amount: null as never }),
    );
    expect(stored('r').amount_pair).toBe('-500:@usd~');
    // An edit handler's scope alone cannot restamp old integers.
    await expect(
      db.updateTransaction(
        { id: 'r', amount: -500, transaction_amount: -750 },
        scope({ amount: -500, transaction_amount: -750 }),
      ),
    ).rejects.toThrow('transaction-encoding-stale');
  });

  it('carries a metadata edit across stale transfer legs', async () => {
    for (const id of ['e1', 'e2']) {
      await db.insertAccount({ id, name: id });
      await db.insertPayee({ name: '', transfer_acct: id });
      await app.handlers['account-update']({ id, currency: 'JPY' });
    }
    const payee = (account: string) =>
      db.firstSync<{ id: string }>(
        'SELECT id FROM payees WHERE transfer_acct = ?',
        [account],
      )!.id;
    await applyMessages([
      ...remoteRow('l1', 'e1', '-500:@e1~'),
      remote('transactions', 'l1', 'transferred_id', 'l2'),
      remote('transactions', 'l1', 'description', payee('e2')),
      ...remoteRow('l2', 'e2', '500:@e2~'),
      remote('transactions', 'l2', 'transferred_id', 'l1'),
      remote('transactions', 'l2', 'description', payee('e1')),
    ]);
    await batchUpdateTransactions({ updated: [{ id: 'l1', notes: 'moved' }] });
    expect(stored('l2').amount_pair).toBe('500:@e2~');
    expect(
      db.firstSync<{ notes: string }>(
        'SELECT notes FROM transactions WHERE id = ?',
        ['l2'],
      )!.notes,
    ).toBe('moved');
  });

  it('stamps a new row before multicurrency is available', async () => {
    await db.update('preferences', {
      id: 'flags.multicurrency',
      value: 'false',
    });
    await db.insertTransaction({ id: 'n', account: 'usd', date: '2017-01-10' });
    expect(stored('n').amount_pair).toBe('0:@usd~');
  });

  it('restamps rows whose integers a correction leaves unchanged', async () => {
    await saveRate('KWD', '0.3');
    seed('z', 'jpy', 0, 0, 'JPY.0');
    expect(await correct('jpy', 'KWD', 'convert')).toMatchObject({
      status: 'ok',
    });
    expect(stored('z').amount_pair).toBe('0:0@jpy~KWD.3');
    expect(await staleEncodingRows()).toEqual([]);
  });

  it('blocks a correction until stale rows are repaired', async () => {
    await correct('usd', 'JPY', 'convert');
    const preview = await previewCurrencyCorrection({
      account: 'usd',
      currency: 'KWD',
      mode: 'convert',
    });
    await applyMessages(remoteRow('r', 'usd', '-500:@usd~'));
    await expect(
      previewCurrencyCorrection({
        account: 'usd',
        currency: 'KWD',
        mode: 'convert',
      }),
    ).rejects.toThrow('correction-stale-rows-pending');
    expect(
      await correctAccountCurrency({
        account: 'usd',
        currency: 'KWD',
        mode: 'convert',
        fingerprint: preview.fingerprint,
      }),
    ).toEqual({ status: 'stale' });
  });
});

describe('repair', () => {
  beforeEach(async () => {
    await saveRate('JPY', '150');
    seed('a', 'usd', -1000, null, '');
    await correct('usd', 'JPY', 'convert');
  });

  it('converts stale rows keeping their bases by default', async () => {
    await applyMessages(remoteRow('r', 'usd', '-600:@usd~'));
    const { result } = await repair('usd', 'convert');
    expect(result).toMatchObject({ status: 'ok' });
    // $6.00 at 150 is ¥900; the base stays.
    expect(stored('r')).toEqual({
      amount: -600,
      transaction_amount: -900,
      amount_pair: '-600:-900@usd~JPY.0',
    });
    expect(await staleEncodingRows()).toEqual([]);
  });

  it('converts when no mode is given', async () => {
    await applyMessages(remoteRow('r', 'usd', '-600:@usd~'));
    const preview = await previewStaleEncodingRepair({ account: 'usd' });
    expect(
      await repairStaleEncoding({
        account: 'usd',
        fingerprint: preview.fingerprint,
      }),
    ).toMatchObject({ status: 'ok' });
    expect(stored('r')).toMatchObject({
      amount: -600,
      transaction_amount: -900,
    });
  });

  it('keeps the numbers when asked, rescaling the old magnitude', async () => {
    await applyMessages(remoteRow('r', 'usd', '-600:@usd~'));
    const { result } = await repair('usd', 'keep');
    expect(result).toMatchObject({ status: 'ok' });
    // $6.00 becomes ¥6, valued at 150 as 4 cents.
    expect(stored('r')).toMatchObject({ amount: -4, transaction_amount: -6 });
  });

  it('repairs a family that is stale throughout as one family', async () => {
    seed('p', 'usd', -1600, null, '', { isParent: true });
    seed('c1', 'usd', -1000, null, '', { parent: 'p' });
    seed('c2', 'usd', -600, null, '', { parent: 'p' });
    const { result } = await repair('usd', 'convert');
    expect(result).toMatchObject({ status: 'ok' });
    expect(stored('p')).toMatchObject({
      amount: -1600,
      transaction_amount: -2400,
    });
    expect(
      stored('c1').transaction_amount! + stored('c2').transaction_amount!,
    ).toBe(-2400);
    expect(await staleEncodingRows()).toEqual([]);
  });

  it('sums a mixed family into its parent after repairing stale children', async () => {
    seed('p', 'usd', -1600, -2400, 'JPY.0', { isParent: true });
    seed('c1', 'usd', -1000, -1500, 'JPY.0', { parent: 'p' });
    seed('c2', 'usd', -600, null, '', { parent: 'p' });
    const { result } = await repair('usd', 'convert');
    expect(result).toMatchObject({ status: 'ok' });
    expect(stored('c2')).toMatchObject({
      amount: -600,
      transaction_amount: -900,
    });
    expect(stored('p')).toEqual({
      amount: -1600,
      transaction_amount: -2400,
      amount_pair: '-1600:-2400@usd~JPY.0',
    });
  });

  it("values a mixed family's stale child at the parent's date", async () => {
    await exchangeRatesApp.handlers['exchange-rates/save']({
      quoteCurrency: 'JPY',
      rate: '100',
      kind: 'standing',
      date: '2017-01-15',
    });
    seed('p', 'usd', -1600, -2400, 'JPY.0', { isParent: true });
    seed('c1', 'usd', -1000, -1500, 'JPY.0', { parent: 'p' });
    seed('c2', 'usd', -600, null, '', { parent: 'p' });
    db.runQuery('UPDATE transactions SET date = 20170120 WHERE id = ?', ['c2']);
    const { result } = await repair('usd', 'convert');
    expect(result).toMatchObject({ status: 'ok' });
    // At the parent's rate of 150, not the child's later rate of 100.
    expect(stored('c2')).toMatchObject({ transaction_amount: -900 });
  });

  it('lists a stale transfer leg and repairs the other rows', async () => {
    seed('leg', 'usd', -300, null, '', { transfer: 'other' });
    await applyMessages(remoteRow('r', 'usd', '-600:@usd~'));
    const { preview, result } = await repair('usd', 'convert');
    expect(preview.unsupported).toEqual(['leg']);
    expect(result).toMatchObject({ status: 'ok' });
    expect(pairEncoding(stored('r').amount_pair)).toBe('JPY.0');
    expect(pairEncoding(stored('leg').amount_pair)).toBe('');
  });

  it("lists the account's own currency when a repair lacks its rate", async () => {
    // Rates move to a later standing date, so the stale row's date has none.
    db.runQuery(
      "UPDATE exchange_rates SET timestamp = '2018-01-01T00:00:00.000Z'",
    );
    await applyMessages(remoteRow('r', 'usd', '-600:@usd~'));
    const preview = await previewStaleEncodingRepair({
      account: 'usd',
      mode: 'convert',
    });
    expect(preview.missingRateQuotes).toEqual([
      { date: '2017-01-10', currency: 'JPY' },
    ]);
  });

  it('goes stale on a stamp change or a mode switch after the preview', async () => {
    await applyMessages(remoteRow('r', 'usd', '-600:@usd~'));
    const preview = await previewStaleEncodingRepair({
      account: 'usd',
      mode: 'convert',
    });
    expect(
      await repairStaleEncoding({
        account: 'usd',
        mode: 'keep',
        fingerprint: preview.fingerprint,
      }),
    ).toEqual({ status: 'stale' });
    await applyMessages([
      remote('transactions', 'r', 'amount_pair', '-600:@usd~KWD.3'),
    ]);
    expect(
      await repairStaleEncoding({
        account: 'usd',
        mode: 'convert',
        fingerprint: preview.fingerprint,
      }),
    ).toEqual({ status: 'stale' });
  });
});

describe('robustness', () => {
  it('leaves undo history alone when a repair writes nothing', async () => {
    await db.insertTransaction({
      id: 'f',
      account: 'jpy',
      date: '2017-01-10',
      amount: -1000,
      transaction_amount: -1500,
    });
    await app.handlers['account-update']({ id: 'jpy', name: 'Renamed' });
    await repair('jpy', 'convert');
    await undo();
    expect(
      db.firstSync<{ name: string }>(
        "SELECT name FROM accounts WHERE id = 'jpy'",
      ),
    ).toEqual({ name: 'Yen' });
  });

  it('ignores a malformed encoding everywhere', async () => {
    seed('f', 'jpy', -1000, -1500, 'JPY.0');
    await applyMessages([remote('accounts', 'jpy', 'encoding', 'nope')]);
    expect(accountRow('jpy')).toMatchObject({
      currency: 'JPY',
      currency_precision: 0,
    });
    expect(await staleEncodingRows()).toEqual([]);
    await db.insertTransaction({
      id: 'g',
      account: 'jpy',
      date: '2017-01-10',
      amount: -1000,
      transaction_amount: -1500,
    });
    expect(stored('g').amount_pair).toBe('-1000:-1500@jpy~JPY.0');
    // A malformed stamp counts as unstamped.
    expect(pairEncoding('-1000:-1500@jpy~nope')).toBeUndefined();
  });
});

describe('bank balances', () => {
  it('ignores a balance written under a previous encoding, in either order', async () => {
    await saveRate('JPY', '150');
    await db.updateAccount({ id: 'usd', balance_current: 12345 });
    expect(accountRow('usd').balance_current).toBe(12345);
    const stale = remote('accounts', 'usd', 'balance_spec', '99999::~');
    await correct('usd', 'JPY', 'convert');
    await applyMessages([stale]);
    expect(accountRow('usd').balance_current).toBeNull();
    await applyMessages([
      remote('accounts', 'usd', 'balance_current', 99999),
      remote('accounts', 'usd', 'balance_spec', '99999::~'),
    ]);
    expect(accountRow('usd').balance_current).toBeNull();
  });
});

describe('undo', () => {
  it('replays a stamped pair as captured', async () => {
    await db.insertTransaction({
      id: 'f',
      account: 'jpy',
      date: '2017-01-10',
      amount: -1000,
      transaction_amount: -1500,
    });
    await app.handlers['account-update']({ id: 'jpy', name: 'Yen' });
    await undo();
    expect(stored('f').amount_pair).toBe('-1000:-1500@jpy~JPY.0');
  });
});
