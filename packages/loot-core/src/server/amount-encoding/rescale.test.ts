import * as db from '#server/db';

import { rescaleBudget } from './rescale';

beforeEach(global.emptyDatabase());

describe('rescaleBudget', () => {
  it.each([
    [400, 150, 149, 2, 0, 2, 2],
    [-400, -150, -149, 2, 0, -2, -2],
    [100, 40, 59, 2, 3, 405, 595],
    [-100, -40, -59, 2, 3, -405, -595],
    [100, 40, 59, 2, 2, 41, 59],
    [0, 150, 150, 2, 0, 0, 0],
  ])(
    'allocates an existing split discrepancy to its parent %s',
    (parent, a, b, from, to, expectedA, expectedB) => {
      db.execQuery(`
      INSERT INTO transactions (id, amount, isParent) VALUES ('parent', ${parent}, 1);
      INSERT INTO transactions (id, amount, isChild, parent_id)
        VALUES ('child-b', ${b}, 1, 'parent'), ('child-a', ${a}, 1, 'parent');
    `);
      const database = db.getDatabase();
      if (!database) throw new Error('missing test database');
      rescaleBudget(database, from, to);
      expect(
        db.runQuery(
          'SELECT id, amount FROM transactions WHERE isChild = 1 ORDER BY id',
          [],
          true,
        ),
      ).toEqual([
        { id: 'child-a', amount: expectedA },
        { id: 'child-b', amount: expectedB },
      ]);
      expect(
        db.firstSync<{ amount: number }>(
          "SELECT amount FROM transactions WHERE id = 'parent'",
        )?.amount,
      ).toBe(expectedA + expectedB);
    },
  );

  it('keeps the account in a rescaled amount authority', () => {
    db.execQuery(`
      INSERT INTO transactions (id, amount, transaction_amount, amount_pair, acct)
        VALUES ('bound', 1250, 1500, '1250:1500@jpy', 'jpy'),
               ('base', 1250, NULL, '1250:@usd', 'usd'),
               ('legacy', 1250, 1500, '1250:1500', 'jpy'),
               ('stamped', 1250, 1500, '1250:1500@jpy~JPY.0', 'jpy'),
               ('stamped-base', 1250, NULL, '1250:@usd~', 'usd');
    `);
    const database = db.getDatabase();
    if (!database) throw new Error('missing test database');
    rescaleBudget(database, 2, 0);
    expect(
      db.runQuery(
        'SELECT id, amount, amount_pair FROM transactions ORDER BY id',
        [],
        true,
      ),
    ).toEqual([
      { id: 'base', amount: 12, amount_pair: '12:@usd' },
      { id: 'bound', amount: 12, amount_pair: '12:1500@jpy' },
      { id: 'legacy', amount: 12, amount_pair: '12:1500' },
      { id: 'stamped', amount: 12, amount_pair: '12:1500@jpy~JPY.0' },
      { id: 'stamped-base', amount: 12, amount_pair: '12:@usd~' },
    ]);
  });

  it('rescales stamped bank balances keeping the stamp', () => {
    db.execQuery(`
      INSERT INTO accounts (id, name, balance_current, balance_available, balance_spec)
        VALUES ('bank', 'Bank', 1250, NULL, '1250::~'),
               ('stale', 'Stale', NULL, NULL, '1250::~JPY.0'),
               ('unsafe', 'Unsafe', NULL, NULL, '9007199254740993::~'),
               ('dash', 'Dash', NULL, NULL, '-::~');
    `);
    const database = db.getDatabase();
    if (!database) throw new Error('missing test database');
    rescaleBudget(database, 2, 0);
    expect(
      db.runQuery(
        "SELECT balance_current, balance_spec FROM accounts WHERE id IN ('bank', 'stale', 'unsafe', 'dash') ORDER BY name",
        [],
        true,
      ),
    ).toEqual([
      { balance_current: 12, balance_spec: '12::~' },
      // Malformed authorities are left as they are.
      { balance_current: null, balance_spec: '-::~' },
      // A balance derived to null under another stamp keeps its integers.
      { balance_current: null, balance_spec: '12::~JPY.0' },
      { balance_current: null, balance_spec: '9007199254740993::~' },
    ]);
  });

  it('rescales orphan children and one-sided transfers without validating their unrelated structure', () => {
    db.execQuery(`
      INSERT INTO transactions (id, amount, isChild, parent_id) VALUES ('orphan', 150, 1, 'missing');
      INSERT INTO transactions (id, amount, transferred_id) VALUES ('one-sided', -150, 'missing');
    `);
    const database = db.getDatabase();
    if (!database) throw new Error('missing test database');
    rescaleBudget(database, 2, 0);
    expect(
      db.runQuery('SELECT id, amount FROM transactions ORDER BY id', [], true),
    ).toEqual([
      { id: 'one-sided', amount: -2 },
      { id: 'orphan', amount: 2 },
    ]);
  });

  it('atomically rescales numeric, relational and JSON amounts with ties to even', () => {
    db.execQuery(`
      INSERT INTO accounts (id, balance_current, balance_available, balance_limit)
        VALUES ('account', 150, NULL, -250);
      INSERT INTO pending_transactions (id, amount) VALUES ('pending', 250);
      INSERT INTO transactions (id, amount, isParent) VALUES ('parent', 300, 1);
      INSERT INTO transactions (id, amount, isChild, parent_id)
        VALUES ('child-b', 150, 1, 'parent'), ('child-a', 150, 1, 'parent');
      INSERT INTO transactions (id, amount, transferred_id)
        VALUES ('transfer-a', 150, 'transfer-b'), ('transfer-b', -150, 'transfer-a');
      INSERT INTO zero_budgets (id, month, category, amount, goal)
        VALUES ('zero', '2026-01', 'category', 150, 250);
      INSERT INTO reflect_budgets (id, month, category, amount, goal)
        VALUES ('reflect', '2026-01', 'category', -150, NULL);
      INSERT INTO zero_budget_months (id, buffered) VALUES ('month', 50);
      INSERT INTO rules (id, conditions, actions)
        VALUES ('rule', '[{"field":"amount","value":{"num1":150,"num2":250}}]',
          '[{"op":"set","field":"amount","value":-150}]');
      INSERT INTO transaction_filters (id, conditions)
        VALUES ('filter', '[{"field":"amount","value":50}]');
      INSERT INTO custom_reports (id, conditions)
        VALUES ('report', '[{"field":"amount","value":149}]');
    `);

    const database = db.getDatabase();
    if (!database) throw new Error('missing test database');
    rescaleBudget(database, 2, 0);

    expect(
      db.firstSync<{
        balance_current: number;
        balance_available: null;
        balance_limit: number;
      }>(
        "SELECT balance_current, balance_available, balance_limit FROM accounts WHERE id = 'account'",
      ),
    ).toEqual({
      balance_current: 2,
      balance_available: null,
      balance_limit: -2,
    });
    expect(
      db.runQuery(
        "SELECT id, amount FROM transactions WHERE id LIKE 'child-%' ORDER BY id",
        [],
        true,
      ),
    ).toEqual([
      { id: 'child-a', amount: 2 },
      { id: 'child-b', amount: 1 },
    ]);
    expect(
      db.runQuery(
        "SELECT id, amount FROM transactions WHERE id LIKE 'transfer-%' ORDER BY id",
        [],
        true,
      ),
    ).toEqual([
      { id: 'transfer-a', amount: 2 },
      { id: 'transfer-b', amount: -2 },
    ]);
    expect(
      db.firstSync<{ conditions: string; actions: string }>(
        "SELECT conditions, actions FROM rules WHERE id = 'rule'",
      ),
    ).toEqual({
      conditions: '[{"field":"amount","value":{"num1":2,"num2":2}}]',
      actions: '[{"op":"set","field":"amount","value":-2}]',
    });
  });

  it('rescales dashboard amounts and leaves computed rule actions alone', () => {
    const monteCarlo = {
      conditions: [{ field: 'amount', value: 250 }],
      minimumWithdrawal: 1000,
      pots: [{ id: 'pot', startingBalance: 12345, annualFeeFixed: 500 }],
      spendingPhases: [{ id: 'phase', annualWithdrawal: 300 }],
      contributions: [{ id: 'c', annualAmount: 700 }],
      taxBands: [{ id: 'band', from: 900, rate: 0.2 }],
    };
    db.runQuery(
      "INSERT INTO dashboard (id, type, meta) VALUES ('mc', 'monte-carlo-card', ?)",
      [JSON.stringify(monteCarlo)],
    );
    db.runQuery(
      "INSERT INTO dashboard (id, type, meta) VALUES ('cross', 'crossover-card', ?)",
      [JSON.stringify({ expectedContribution: 5000 })],
    );
    db.runQuery(
      "INSERT INTO rules (id, conditions, actions) VALUES ('formula', '[]', ?)",
      [
        JSON.stringify([
          {
            op: 'set',
            field: 'amount',
            value: '',
            options: { formula: '=amount * 2' },
          },
        ]),
      ],
    );

    const database = db.getDatabase();
    if (!database) throw new Error('missing test database');
    rescaleBudget(database, 2, 0);

    const meta = (id: string) =>
      JSON.parse(
        db.firstSync<{ meta: string }>(
          'SELECT meta FROM dashboard WHERE id = ?',
          [id],
        )?.meta ?? 'null',
      );
    expect(meta('mc')).toEqual({
      conditions: [{ field: 'amount', value: 2 }],
      minimumWithdrawal: 10,
      pots: [{ id: 'pot', startingBalance: 123, annualFeeFixed: 5 }],
      spendingPhases: [{ id: 'phase', annualWithdrawal: 3 }],
      contributions: [{ id: 'c', annualAmount: 7 }],
      taxBands: [{ id: 'band', from: 9, rate: 0.2 }],
    });
    expect(meta('cross')).toEqual({ expectedContribution: 5000 });
    expect(
      JSON.parse(
        db.firstSync<{ actions: string }>(
          "SELECT actions FROM rules WHERE id = 'formula'",
        )?.actions ?? 'null',
      ),
    ).toEqual([
      {
        op: 'set',
        field: 'amount',
        value: '',
        options: { formula: '=amount * 2' },
      },
    ]);
  });

  it('rolls back every table when validation fails', () => {
    db.execQuery(`
      INSERT INTO accounts (id, balance_current) VALUES ('account', 150);
      INSERT INTO rules (id, conditions) VALUES ('rule', '{"field":"amount","value":150}');
    `);
    const database = db.getDatabase();
    if (!database) throw new Error('missing test database');
    expect(() => rescaleBudget(database, 2, 0)).toThrow();
    expect(
      db.firstSync<{ balance_current: number }>(
        "SELECT balance_current FROM accounts WHERE id = 'account'",
      )?.balance_current,
    ).toBe(150);
  });
});
