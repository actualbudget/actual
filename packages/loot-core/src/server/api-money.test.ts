import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import type { ServerHandlers } from '#types/server-handlers';

import { app as accountsApp } from './accounts/app';
import { installAPI } from './api';
import { runMutator } from './mutators';
import * as prefs from './prefs';
import { app as transactionsApp } from './transactions/app';

const handlers = installAPI({} as unknown as ServerHandlers);

async function setBudgetCurrency(currencyCode: string, precision: number) {
  await db.update('preferences', {
    id: 'defaultCurrencyCode',
    value: currencyCode,
  });
  await prefs.savePrefs({
    amountEncoding: JSON.stringify({ version: 1, currencyCode, precision }),
  });
}

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  await prefs.loadPrefs();
  handlers['account-create'] = accountsApp.handlers['account-create'];
  handlers['accounts-get'] = accountsApp.handlers['accounts-get'];
  handlers['account-balance'] = accountsApp.handlers['account-balance'];
  handlers['transactions-batch-update'] =
    transactionsApp.handlers['transactions-batch-update'];
});

async function startingBalance(accountId: string) {
  return db.firstSync<{ amount: number }>(
    'SELECT amount FROM transactions WHERE acct = ? AND starting_balance_flag = 1',
    [accountId],
  )?.amount;
}

describe('API account currency', () => {
  it.each([
    ['', 2],
    ['USD', 2],
    ['JPY', 0],
    ['KWD', 3],
  ])(
    'reports the inherited %s budget currency on accounts',
    async (code, precision) => {
      if (code) await setBudgetCurrency(code, precision);
      await handlers['api/account-create']({ account: { name: 'Checking' } });
      const [account] = await handlers['api/accounts-get']();
      expect(account.currency).toBe(code);
      expect(
        db.firstSync<{ currency: string | null }>(
          'SELECT currency FROM accounts',
        )?.currency,
      ).toBeNull();
    },
  );

  it.each([
    ['JPY', 0],
    ['USD', 2],
    ['KWD', 3],
  ])(
    'persists %s opening balances exactly near the safe limit',
    async (code, precision) => {
      await setBudgetCurrency(code, precision);
      for (const amount of [
        9007199254740987,
        -9007199254740987,
        Number.MAX_SAFE_INTEGER,
      ]) {
        const raw = await handlers['api/account-create']({
          account: { name: `Raw ${amount}` },
          initialBalance: amount,
        });
        const money = await handlers['api/account-create']({
          account: { name: `Money ${amount}` },
          initialBalance: { amount, currencyCode: code },
        });
        expect(await startingBalance(raw)).toBe(amount);
        expect(await startingBalance(money)).toBe(amount);
      }
    },
  );

  it('rejects mismatched and invalid Money opening balances', async () => {
    await setBudgetCurrency('JPY', 0);
    await expect(
      handlers['api/account-create']({
        account: { name: 'Checking' },
        initialBalance: { amount: 100, currencyCode: 'USD' },
      }),
    ).rejects.toThrow('currency-mismatch');
    await expect(
      handlers['api/account-create']({
        account: { name: 'Checking' },
        initialBalance: { amount: 1.5, currencyCode: 'JPY' },
      }),
    ).rejects.toThrow('money-invalid');
    expect(db.firstSync('SELECT id FROM accounts')).toBeNull();
  });

  it('preserves supported account update fields', async () => {
    await db.insertAccount({ id: 'acct1', name: 'Checking' });
    await db.insertAccountGroup({ id: 'group1', name: 'Cash' });
    await handlers['api/account-update']({
      id: 'acct1',
      fields: {
        name: 'Savings',
        offbudget: true,
        closed: true,
        balance_current: 4200,
        account_group_id: 'group1',
      },
    });
    expect(
      db.firstSync('SELECT * FROM accounts WHERE id = ?', ['acct1']),
    ).toMatchObject({
      name: 'Savings',
      offbudget: 1,
      closed: 1,
      balance_current: 4200,
      account_group_id: 'group1',
    });
  });

  it('treats the legacy empty budget currency as inheritance', async () => {
    const id = await handlers['api/account-create']({
      account: { name: 'Cash', currency: '' },
    });
    const [read] = await handlers['api/accounts-get']();
    const { id: _id, ...fields } = read;
    await handlers['api/account-update']({
      id,
      fields: { ...fields, name: 'Wallet' },
    });
    expect(
      db.firstSync('SELECT name, currency FROM accounts WHERE id = ?', [id]),
    ).toEqual({ name: 'Wallet', currency: null });
  });

  it('rejects unsupported account update fields', async () => {
    await db.insertAccount({ id: 'acct1', name: 'Checking' });
    await expect(
      handlers['api/account-update']({
        id: 'acct1',
        fields: { sort_order: 5 } as never,
      }),
    ).rejects.toThrow('account-update-unsupported-field: sort_order');
  });

  it('validates account currency on update', async () => {
    await setBudgetCurrency('JPY', 0);
    await db.insertAccount({ id: 'acct1', name: 'Checking' });
    await handlers['api/account-update']({
      id: 'acct1',
      fields: { currency: 'JPY' },
    });
    await expect(
      handlers['api/account-update']({
        id: 'acct1',
        fields: { currency: 'USD' },
      }),
    ).rejects.toThrow('multicurrency-unavailable');
    expect(
      db.firstSync<{ currency: string | null }>('SELECT currency FROM accounts')
        ?.currency,
    ).toBeNull();
  });
});

describe('API Money amounts', () => {
  beforeEach(async () => {
    await setBudgetCurrency('KWD', 3);
    await db.insertAccount({ id: 'acct1', name: 'Checking' });
    await db.insertTransaction({
      id: 'parent',
      account: 'acct1',
      date: '2026-03-01',
      amount: -1500,
      is_parent: true,
    });
    await db.insertTransaction({
      id: 'child1',
      account: 'acct1',
      date: '2026-03-01',
      amount: -1000,
      is_child: true,
      parent_id: 'parent',
    });
    await db.insertTransaction({
      id: 'child2',
      account: 'acct1',
      date: '2026-03-01',
      amount: -500,
      is_child: true,
      parent_id: 'parent',
    });
  });

  it('keeps raw responses by default', async () => {
    const [raw] = await handlers['api/transactions-get']({
      accountId: 'acct1',
    });
    expect(raw.amount).toBe(-1500);
    expect(
      raw.subtransactions?.map((t: { amount: unknown }) => t.amount),
    ).toEqual([-1000, -500]);
    await expect(
      handlers['api/account-balance']({ id: 'acct1' }),
    ).resolves.toBe(-1500);
  });

  it('wraps transaction and balance amounts when asked', async () => {
    const [money] = await handlers['api/transactions-get']({
      accountId: 'acct1',
      options: { amountFormat: 'money' },
    });
    expect(money.amount).toEqual({ amount: -1500, currencyCode: 'KWD' });
    expect(
      money.subtransactions?.map((t: { amount: unknown }) => t.amount),
    ).toEqual([
      { amount: -1000, currencyCode: 'KWD' },
      { amount: -500, currencyCode: 'KWD' },
    ]);
    await expect(
      handlers['api/account-balance']({
        id: 'acct1',
        options: { amountFormat: 'money' },
      }),
    ).resolves.toEqual({ amount: -1500, currencyCode: 'KWD' });
  });

  it('queues Money reads behind running mutations', async () => {
    let release: (() => void) | undefined;
    const blocker = runMutator(
      () => new Promise<void>(resolve => (release = resolve)),
    );
    let settled = false;
    const read = handlers['api/transactions-get']({
      accountId: 'acct1',
      options: { amountFormat: 'money' },
    }).then(result => {
      settled = true;
      return result;
    });
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(settled).toBe(false);
    release?.();
    await blocker;
    expect((await read)[0].amount).toEqual({
      amount: -1500,
      currencyCode: 'KWD',
    });
  });

  it('rejects unknown amount formats', async () => {
    await expect(
      handlers['api/transactions-get']({
        accountId: 'acct1',
        options: { amountFormat: 'decimal' as never },
      }),
    ).rejects.toThrow('Invalid amountFormat');
  });

  it('accepts Money transaction inputs in the account currency', async () => {
    await handlers['api/transactions-add']({
      accountId: 'acct1',
      transactions: [
        { date: '2026-03-02', amount: { amount: 1234, currencyCode: 'KWD' } },
        { date: '2026-03-03', amount: 5678 },
      ],
    });
    const amounts = db
      .runQuery<{ amount: number }>(
        'SELECT amount FROM transactions WHERE date > 20260301 ORDER BY date',
        [],
        true,
      )
      .map(t => t.amount);
    expect(amounts).toEqual([1234, 5678]);

    await db.insertTransaction({
      id: 'single',
      account: 'acct1',
      date: '2026-03-05',
      amount: -500,
    });
    await handlers['api/transaction-update']({
      id: 'single',
      fields: { amount: { amount: -250, currencyCode: 'KWD' } },
    });
    expect(
      db.firstSync<{ amount: number }>(
        "SELECT amount FROM transactions WHERE id = 'single'",
      )?.amount,
    ).toBe(-250);
    await expect(
      handlers['api/transaction-update']({
        id: 'single',
        fields: { amount: { amount: -250, currencyCode: 'USD' } },
      }),
    ).rejects.toThrow('currency-mismatch');

    await expect(
      handlers['api/transactions-add']({
        accountId: 'acct1',
        transactions: [
          { date: '2026-03-04', amount: { amount: 1, currencyCode: 'USD' } },
        ],
      }),
    ).rejects.toThrow('currency-mismatch');
  });

  it('accepts Money budget amounts in the budget currency', async () => {
    handlers['budget/budget-amount'] = vi.fn().mockResolvedValue(undefined);
    await handlers['api/budget-set-amount']({
      month: '2026-03',
      categoryId: 'cat',
      amount: { amount: 7000, currencyCode: 'KWD' },
    });
    expect(handlers['budget/budget-amount']).toHaveBeenCalledWith({
      month: '2026-03',
      category: 'cat',
      amount: 7000,
    });
    await expect(
      handlers['api/budget-set-amount']({
        month: '2026-03',
        categoryId: 'cat',
        amount: { amount: 7000, currencyCode: 'JPY' },
      }),
    ).rejects.toThrow('currency-mismatch');
  });
});

describe('API foreign pairs', () => {
  beforeEach(async () => {
    await setBudgetCurrency('USD', 2);
    // Handlers refuse foreign currencies until foreign posting ships.
    await db.insertAccount({ id: 'jpy', name: 'Yen', currency: 'JPY' });
  });

  it('reads base and native amounts in their own currencies', async () => {
    await db.insertTransaction({
      id: 'f',
      account: 'jpy',
      date: '2026-03-01',
      amount: -1000,
      transaction_amount: -1500,
    });
    const [raw] = await handlers['api/transactions-get']({ accountId: 'jpy' });
    expect(raw).toMatchObject({ amount: -1000, transaction_amount: -1500 });
    expect(raw).not.toHaveProperty('amount_pair');
    const [money] = await handlers['api/transactions-get']({
      accountId: 'jpy',
      options: { amountFormat: 'money' },
    });
    expect(money).toMatchObject({
      amount: { amount: -1000, currencyCode: 'USD' },
      transaction_amount: { amount: -1500, currencyCode: 'JPY' },
    });
    await expect(
      handlers['api/account-balance']({
        id: 'jpy',
        options: { amountFormat: 'money' },
      }),
    ).resolves.toEqual({ amount: -1500, currencyCode: 'JPY' });
  });

  it('accepts pairs with each field in its own currency', async () => {
    await handlers['api/transactions-add']({
      accountId: 'jpy',
      transactions: [
        {
          date: '2026-03-02',
          amount: { amount: -2000, currencyCode: 'USD' },
          transaction_amount: { amount: -3000, currencyCode: 'JPY' },
        },
      ],
    });
    expect(
      db.firstSync(
        "SELECT amount, transaction_amount, amount_pair FROM transactions WHERE acct = 'jpy'",
      ),
    ).toEqual({
      amount: -2000,
      transaction_amount: -3000,
      amount_pair: '-2000:-3000',
    });
    await expect(
      handlers['api/transactions-add']({
        accountId: 'jpy',
        transactions: [
          {
            date: '2026-03-03',
            amount: { amount: -2000, currencyCode: 'JPY' },
            transaction_amount: -3000,
          },
        ],
      }),
    ).rejects.toThrow('currency-mismatch');
    await expect(
      handlers['api/transactions-add']({
        accountId: 'jpy',
        transactions: [
          {
            date: '2026-03-03',
            amount: -2000,
            transaction_amount: { amount: -3000, currencyCode: 'USD' },
          },
        ],
      }),
    ).rejects.toThrow('currency-mismatch');
    await expect(
      handlers['api/transactions-add']({
        accountId: 'jpy',
        transactions: [{ date: '2026-03-03', amount: -2000 }],
      }),
    ).rejects.toThrow('foreign-pair-required');
    await expect(
      handlers['api/transactions-add']({
        accountId: 'jpy',
        transactions: [
          {
            date: '2026-03-03',
            amount: -2000,
            transaction_amount: -3000,
            amount_pair: '1:1',
          } as never,
        ],
      }),
    ).rejects.toThrow('amount-pair-internal');
  });

  it('keeps the unchanged pair side when updating one value', async () => {
    await db.insertTransaction({
      id: 'f',
      account: 'jpy',
      date: '2026-03-01',
      amount: -1000,
      transaction_amount: -1500,
    });
    await handlers['api/transaction-update']({
      id: 'f',
      fields: { amount: -1100, transaction_amount: -1500 },
    });
    expect(
      db.firstSync(
        "SELECT amount, transaction_amount, amount_pair FROM transactions WHERE id = 'f'",
      ),
    ).toEqual({
      amount: -1100,
      transaction_amount: -1500,
      amount_pair: '-1100:-1500',
    });
  });

  it('propagates guard rejections from transaction updates', async () => {
    await db.insertAccount({ id: 'base', name: 'Checking' });
    await db.insertTransaction({
      id: 'f',
      account: 'jpy',
      date: '2026-03-01',
      amount: -1000,
      transaction_amount: -1500,
    });
    await expect(
      handlers['api/transaction-update']({
        id: 'f',
        fields: { account: 'base' },
      }),
    ).rejects.toThrow('account-move-currency-mismatch');
    expect(
      db.firstSync("SELECT acct FROM transactions WHERE id = 'f'"),
    ).toEqual({ acct: 'jpy' });
  });
});
