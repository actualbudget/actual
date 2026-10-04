// @ts-strict-ignore
import * as asyncStorage from '#platform/server/asyncStorage';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { app as exchangeRatesApp } from '#server/exchange-rates/app';
import * as prefs from '#server/prefs';
import { setSyncingMode } from '#server/sync';
import { handlers } from '#server/tests/mockSyncServer';
import { insertRule, loadRules } from '#server/transactions/transaction-rules';
import * as monthUtils from '#shared/months';

import { app } from './app';

vi.mock('#server/main', () => ({ getDefaultDocumentDir: vi.fn() }));
vi.mock('#shared/months', async () => ({
  ...(await vi.importActual('#shared/months')),
  currentDay: vi.fn(),
}));

const link = app.handlers['simplefin-accounts-link'];

function providerAccount(currency: string | null) {
  return {
    account_id: 'remote',
    name: 'Remote',
    institution: 'Bank',
    orgDomain: 'bank.example',
    orgId: 'org',
    balance: 0,
    currency,
  };
}

function row(
  id: string,
  date: string,
  amount: string,
  currency: string | null = null,
) {
  return {
    booked: true,
    date,
    payeeName: `Payee ${id}`,
    transactionAmount: { amount, currency },
    transactionId: id,
  };
}

type ProviderRow = ReturnType<typeof row> & {
  balanceAfterTransaction?: {
    balanceAmount: { amount: string; currency: string };
  };
};

/** Rows newest first, as providers send them. */
function mockDownload(
  transactions: ProviderRow[],
  startingBalance: string | undefined,
  startingBalanceCurrency: string | null,
) {
  handlers['/simplefin/transactions'] = () => ({
    transactions: { all: transactions, booked: transactions, pending: [] },
    balances: [],
    startingBalance,
    startingBalanceCurrency,
  });
}

async function saveRate(quoteCurrency: string, rate: string, date: string) {
  await exchangeRatesApp.handlers['exchange-rates/save']({
    quoteCurrency,
    rate,
    kind: 'standing',
    date,
  });
}

const count = (table: string) =>
  db.firstSync<{ n: number }>(`SELECT count(*) AS n FROM ${table}`).n;

const transactions = (acct: string) =>
  db.runQuery<{
    amount: number;
    transaction_amount: number;
    starting_balance_flag: number;
    date: number;
  }>(
    'SELECT amount, transaction_amount, starting_balance_flag, date FROM transactions WHERE acct = ? AND tombstone = 0 ORDER BY date, starting_balance_flag DESC',
    [acct],
    true,
  );

const remoteAccount = () =>
  db.firstSync<db.DbAccount>(
    "SELECT * FROM accounts WHERE account_id = 'remote' AND tombstone = 0",
  );

beforeEach(async () => {
  vi.mocked(monthUtils.currentDay).mockReturnValue('2026-03-10');
  vi.mocked(asyncStorage.getItem).mockResolvedValue('test-token');
  vi.mocked(asyncStorage.multiGet).mockResolvedValue({});
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
  setSyncingMode('offline');
});

afterEach(() => {
  setSyncingMode('disabled');
  delete handlers['/simplefin/transactions'];
});

describe('linking foreign bank accounts', () => {
  it('writes nothing and lists the dates when a rate is missing', async () => {
    mockDownload([row('a', '2026-03-05', '-1500', 'JPY')], '10000', 'JPY');
    const before = ['banks', 'accounts', 'payees', 'transactions'].map(count);

    await expect(
      link({ externalAccount: providerAccount('JPY') }),
    ).resolves.toEqual({
      type: 'rate-unavailable',
      currency: 'JPY',
      dates: ['2026-03-05'],
    });
    expect(['banks', 'accounts', 'payees', 'transactions'].map(count)).toEqual(
      before,
    );
  });

  it('creates a foreign account with native pairs in one batch', async () => {
    await saveRate('JPY', '150', '2026-01-01');
    mockDownload(
      [
        row('b', '2026-03-06', '3000', 'JPY'),
        row('a', '2026-03-05', '-1500', 'JPY'),
      ],
      '10000',
      'JPY',
    );

    await expect(
      link({ externalAccount: providerAccount('JPY') }),
    ).resolves.toMatchObject({ type: 'ok' });

    const account = remoteAccount();
    expect(account).toMatchObject({ currency: 'JPY', currency_precision: 0 });
    expect(
      db.firstSync(
        "SELECT value FROM preferences WHERE id = 'multicurrencyBaseCurrency'",
      ),
    ).toEqual({ value: 'USD' });
    // Current balance 10000 less the imported rows is the opening balance.
    expect(transactions(account.id)).toEqual([
      expect.objectContaining({
        starting_balance_flag: 1,
        transaction_amount: 8500,
        amount: 5667,
      }),
      expect.objectContaining({ transaction_amount: -1500, amount: -1000 }),
      expect.objectContaining({ transaction_amount: 3000, amount: 2000 }),
    ]);
  });

  it('encodes three-decimal provider amounts natively', async () => {
    await saveRate('KWD', '0.3', '2026-01-01');
    mockDownload([row('a', '2026-03-05', '-1.234', 'KWD')], '1.5', 'KWD');

    await expect(
      link({ externalAccount: providerAccount('KWD') }),
    ).resolves.toMatchObject({ type: 'ok' });

    const account = remoteAccount();
    expect(account.currency_precision).toBe(3);
    expect(transactions(account.id).map(t => t.transaction_amount)).toEqual([
      2734, -1234,
    ]);
  });

  it('leaves rows in another currency out of the opening balance', async () => {
    await saveRate('JPY', '150', '2026-01-01');
    mockDownload(
      [
        row('usd', '2026-03-06', '-20.00', 'USD'),
        row('a', '2026-03-05', '-1500', 'JPY'),
      ],
      '10000',
      'JPY',
    );

    await expect(
      link({ externalAccount: providerAccount('JPY') }),
    ).resolves.toMatchObject({ type: 'ok' });

    expect(
      transactions(remoteAccount().id).map(t => t.transaction_amount),
    ).toEqual([11500, -1500]);
  });

  it('asks for a starting balance when none is in the account currency', async () => {
    await saveRate('JPY', '150', '2026-01-01');
    mockDownload([row('a', '2026-03-05', '-1500', 'JPY')], '10.00', 'USD');
    const before = ['banks', 'accounts', 'transactions'].map(count);

    await expect(
      link({ externalAccount: providerAccount('JPY') }),
    ).resolves.toEqual({ type: 'balance-unavailable' });
    expect(['banks', 'accounts', 'transactions'].map(count)).toEqual(before);

    // An explicit starting balance from the dialog is native.
    await expect(
      link({
        externalAccount: providerAccount('JPY'),
        startingBalance: 9000,
        startingDate: '2026-03-01',
      }),
    ).resolves.toMatchObject({ type: 'ok' });
    expect(transactions(remoteAccount().id)[0]).toMatchObject({
      starting_balance_flag: 1,
      transaction_amount: 9000,
      amount: 6000,
    });
  });

  it('uses the oldest balance-after value in the account currency', async () => {
    await saveRate('JPY', '150', '2026-01-01');
    mockDownload(
      [
        {
          ...row('a', '2026-03-05', '-1500', 'JPY'),
          balanceAfterTransaction: {
            balanceAmount: { amount: '6000', currency: 'JPY' },
          },
        },
      ],
      undefined,
      null,
    );

    await expect(
      link({ externalAccount: providerAccount('JPY') }),
    ).resolves.toMatchObject({ type: 'ok' });
    expect(transactions(remoteAccount().id)[0].transaction_amount).toBe(7500);
  });

  it('rejects mismatched and unsupported currencies before any write', async () => {
    await db.insertAccount({ id: 'jpy', name: 'Yen', currency: 'JPY' });
    await db.insertAccount({ id: 'base', name: 'Checking' });
    const banks = count('banks');

    await expect(
      link({ externalAccount: providerAccount('USD'), upgradingId: 'jpy' }),
    ).rejects.toThrow('bank-account-currency-mismatch');
    await expect(
      link({ externalAccount: providerAccount(null), upgradingId: 'jpy' }),
    ).rejects.toThrow('bank-account-currency-mismatch');
    await expect(
      link({ externalAccount: providerAccount('JPY'), upgradingId: 'base' }),
    ).rejects.toThrow('bank-account-currency-mismatch');
    await expect(
      link({ externalAccount: providerAccount('XAU') }),
    ).rejects.toThrow('bank-account-currency-unsupported');
    expect(count('banks')).toBe(banks);
  });

  it('keeps legacy linking when multicurrency is unavailable', async () => {
    await db.update('preferences', {
      id: 'flags.multicurrency',
      value: 'false',
    });
    mockDownload([row('a', '2026-03-05', '-15.00', 'JPY')], '100.00', 'JPY');

    await expect(
      link({ externalAccount: providerAccount('JPY') }),
    ).resolves.toMatchObject({ type: 'ok' });
    const account = remoteAccount();
    expect(account.currency).toBeNull();
    expect(transactions(account.id).map(t => t.amount)).toEqual([11500, -1500]);
  });
});

describe('linking foreign bank accounts (inspection round 1)', () => {
  it('writes nothing for a failing link that runs alongside another', async () => {
    await saveRate('JPY', '150', '2026-03-01');
    handlers['/simplefin/transactions'] = ({ accountId }) =>
      accountId === 'early'
        ? {
            transactions: {
              all: [row('e', '2026-02-20', '-500', 'JPY')],
              booked: [],
              pending: [],
            },
            balances: [],
            startingBalance: '1000',
            startingBalanceCurrency: 'JPY',
          }
        : {
            transactions: {
              all: [row('l', '2026-03-05', '-500', 'JPY')],
              booked: [],
              pending: [],
            },
            balances: [],
            startingBalance: '1000',
            startingBalanceCurrency: 'JPY',
          };

    const [early, late] = await Promise.all([
      link({
        externalAccount: { ...providerAccount('JPY'), account_id: 'early' },
      }),
      link({
        externalAccount: { ...providerAccount('JPY'), account_id: 'late' },
      }),
    ]);
    expect(early).toMatchObject({ type: 'rate-unavailable' });
    expect(late).toMatchObject({ type: 'ok' });
    expect(
      db.runQuery(
        'SELECT account_id FROM accounts WHERE tombstone = 0',
        [],
        true,
      ),
    ).toEqual([{ account_id: 'late' }]);
  });

  it('runs off-budget rules for a new off-budget account', async () => {
    await saveRate('JPY', '150', '2026-01-01');
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'offBudget', field: 'account', value: null }],
      actions: [{ op: 'set', field: 'notes', value: 'off budget rule' }],
    });
    mockDownload([row('a', '2026-03-05', '-1500', 'JPY')], '10000', 'JPY');

    await link({ externalAccount: providerAccount('JPY'), offBudget: true });
    expect(
      db.runQuery(
        'SELECT notes FROM transactions WHERE starting_balance_flag = 0',
        [],
        true,
      ),
    ).toEqual([{ notes: 'off budget rule' }]);
  });

  it('leaves pending rows out of the opening balance when not imported', async () => {
    await saveRate('JPY', '150', '2026-01-01');
    mockDownload(
      [
        { ...row('p', '2026-03-06', '-500', 'JPY'), booked: false },
        row('a', '2026-03-05', '-1500', 'JPY'),
      ],
      '10000',
      'JPY',
    );
    const id = 'pending-off';
    await db.update('preferences', {
      id: `sync-import-pending-${id}`,
      value: 'false',
    });
    // Upgrading an empty foreign account keeps its preferences.
    await db.insertAccount({ id, name: 'Yen', currency: 'JPY' });

    await link({ externalAccount: providerAccount('JPY'), upgradingId: id });
    expect(transactions(id).map(t => t.transaction_amount)).toEqual([
      11500, -1500,
    ]);
  });

  it('uses a listed balance in the account currency when balances disagree', async () => {
    await saveRate('JPY', '150', '2026-01-01');
    handlers['/simplefin/transactions'] = () => ({
      transactions: {
        all: [row('a', '2026-03-05', '-1500', 'JPY')],
        booked: [],
        pending: [],
      },
      balances: [
        {
          balanceAmount: { amount: '20.00', currency: 'USD' },
          balanceType: 'expected',
        },
        {
          balanceAmount: { amount: '10000', currency: 'JPY' },
          balanceType: 'interimAvailable',
        },
      ],
      startingBalance: '20.00',
      startingBalanceCurrency: null,
    });

    await link({ externalAccount: providerAccount('JPY') });
    expect(
      transactions(remoteAccount().id).map(t => t.transaction_amount),
    ).toEqual([11500, -1500]);
  });

  it('reports rows skipped on the first link', async () => {
    await saveRate('JPY', '150', '2026-01-01');
    mockDownload(
      [
        row('usd', '2026-03-06', '-20.00', 'USD'),
        row('a', '2026-03-05', '-1500', 'JPY'),
      ],
      '10000',
      'JPY',
    );
    await expect(
      link({ externalAccount: providerAccount('JPY') }),
    ).resolves.toEqual({ type: 'ok', currencyMismatches: 1 });
  });
});

describe('linking foreign bank accounts (inspection round 2)', () => {
  it('writes one opening balance for concurrent links to an empty account', async () => {
    await saveRate('JPY', '150', '2026-01-01');
    await db.insertAccount({ id: 'yen', name: 'Yen', currency: 'JPY' });
    mockDownload([row('a', '2026-03-05', '-1500', 'JPY')], '10000', 'JPY');

    await Promise.all([
      link({ externalAccount: providerAccount('JPY'), upgradingId: 'yen' }),
      link({ externalAccount: providerAccount('JPY'), upgradingId: 'yen' }),
    ]);
    expect(transactions('yen').map(t => t.transaction_amount)).toEqual([
      11500, -1500,
    ]);
  });

  it('uses the oldest row by date whatever the provider order', async () => {
    await saveRate('JPY', '150', '2026-01-01');
    // Ascending page order with balance-after values and no balance.
    mockDownload(
      [
        {
          ...row('a', '2026-03-01', '100', 'JPY'),
          balanceAfterTransaction: {
            balanceAmount: { amount: '100', currency: 'JPY' },
          },
        },
        {
          ...row('b', '2026-03-02', '-10', 'JPY'),
          balanceAfterTransaction: {
            balanceAmount: { amount: '90', currency: 'JPY' },
          },
        },
      ],
      undefined,
      null,
    );

    await link({ externalAccount: providerAccount('JPY') });
    const rows = transactions(remoteAccount().id);
    expect(rows[0]).toMatchObject({
      starting_balance_flag: 1,
      transaction_amount: 0,
    });
    expect(rows.reduce((sum, t) => sum + t.transaction_amount, 0)).toBe(90);
  });

  it("keeps a base account's opening balance when a foreign account in the batch fails", async () => {
    await saveRate('JPY', '150', '2026-03-01');
    await db.insertAccount({
      id: 'yen',
      name: 'Yen',
      currency: 'JPY',
      account_id: 'remote',
      account_sync_source: 'simpleFin',
    });
    await db.insertAccount({
      id: 'base',
      name: 'Checking',
      account_id: 'remote-base',
      account_sync_source: 'simpleFin',
    });
    handlers['/simplefin/transactions'] = () => ({
      remote: {
        transactions: {
          all: [row('old', '2026-02-20', '-500', 'JPY')],
          booked: [],
          pending: [],
        },
        balances: [],
        startingBalance: '9500',
        startingBalanceCurrency: 'JPY',
      },
      'remote-base': {
        transactions: {
          all: [row('x', '2026-03-05', '-5.00', 'USD')],
          booked: [],
          pending: [],
        },
        balances: [],
        startingBalance: '95.00',
        startingBalanceCurrency: 'USD',
      },
      errors: {},
    });

    await app.handlers['simplefin-batch-sync']({ ids: ['yen', 'base'] });
    const payee = db.firstSync<{ payee: string }>(
      "SELECT description AS payee FROM transactions WHERE acct = 'base' AND starting_balance_flag = 1",
    );
    expect(
      db.firstSync('SELECT id FROM payees WHERE id = ?', [payee.payee]),
    ).not.toBeNull();
    expect(transactions('yen')).toEqual([]);
  });
});

describe('syncing foreign bank accounts', () => {
  async function linkedYenAccount() {
    await saveRate('JPY', '150', '2026-03-01');
    mockDownload([row('a', '2026-03-05', '-1500', 'JPY')], '10000', 'JPY');
    await link({ externalAccount: providerAccount('JPY') });
    return remoteAccount();
  }

  it('reports a missing rate without writing transactions', async () => {
    const account = await linkedYenAccount();
    const before = count('transactions');
    mockDownload(
      [
        row('b', '2026-02-20', '-500', 'JPY'),
        row('a', '2026-03-05', '-1500', 'JPY'),
      ],
      '9500',
      'JPY',
    );

    const result = await app.handlers['accounts-bank-sync']({
      ids: [account.id],
    });
    expect(result.errors).toEqual([
      expect.objectContaining({
        type: 'rate-unavailable',
        accountId: account.id,
        currency: 'JPY',
        dates: ['2026-02-20'],
      }),
    ]);
    expect(count('transactions')).toBe(before);
    expect(remoteAccount().bank_sync_status).toBe('failed');
  });

  it('matches repeated rows natively and skips other currencies', async () => {
    const account = await linkedYenAccount();
    mockDownload(
      [
        row('usd', '2026-03-07', '-20.00', 'USD'),
        row('c', '2026-03-06', '-700', 'JPY'),
        row('a', '2026-03-05', '-1500', 'JPY'),
      ],
      '7800',
      'JPY',
    );

    const result = await app.handlers['accounts-bank-sync']({
      ids: [account.id],
    });
    expect(result.errors).toEqual([]);
    expect(result.currencyMismatches).toBe(1);
    expect(result.newTransactions).toHaveLength(1);
    expect(remoteAccount().balance_current).toBe(7800);

    // A balance in another currency is never cached.
    mockDownload([], '50.00', 'USD');
    await app.handlers['accounts-bank-sync']({ ids: [account.id] });
    expect(remoteAccount().balance_current).toBeNull();
  });

  it('fails only the affected account in a batch sync', async () => {
    const account = await linkedYenAccount();
    await db.insertAccount({
      id: 'base',
      name: 'Checking',
      account_id: 'remote-base',
      bank: account.bank,
      account_sync_source: 'simpleFin',
    });
    handlers['/simplefin/transactions'] = () => ({
      remote: {
        transactions: {
          all: [row('old', '2026-02-20', '-500', 'JPY')],
          booked: [],
          pending: [],
        },
        balances: [],
        startingBalance: '9500',
        startingBalanceCurrency: 'JPY',
      },
      'remote-base': {
        transactions: {
          all: [row('x', '2026-03-05', '-5.00', 'USD')],
          booked: [],
          pending: [],
        },
        balances: [],
        startingBalance: '95.00',
        startingBalanceCurrency: 'USD',
      },
      errors: {},
    });

    const result = await app.handlers['simplefin-batch-sync']({
      ids: [account.id, 'base'],
    });
    const byAccount = Object.fromEntries(
      result.map(entry => [entry.accountId, entry.res]),
    );
    expect(byAccount[account.id].errors).toEqual([
      expect.objectContaining({
        type: 'rate-unavailable',
        dates: ['2026-02-20'],
      }),
    ]);
    expect(byAccount.base.errors).toEqual([]);
    expect(byAccount.base.newTransactions).toHaveLength(2);
  });
});
