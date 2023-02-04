import query from '../../shared/query';

import { generateSQLWithState } from './compiler';

function sqlLines(str) {
  return str
    .split('\n')
    .filter(s => !s.match(/^\s*$/))
    .map(line => line.trim());
}

let basicSchema = {
  transactions: {
    id: { type: 'id' },
    date: { type: 'date' },
    amount: { type: 'integer' },
    amount2: { type: 'integer' },
    amount3: { type: 'float' },
    is_parent: { type: 'boolean' }
  }
};

let schemaWithRefs = {
  transactions: {
    id: { type: 'id' },
    payee: { type: 'id', ref: 'payees' },
    date: { type: 'date' },
    amount: { type: 'integer' }
  },
  payees: {
    name: { type: 'string' },
    id: { type: 'id' },
    account: { type: 'id', ref: 'accounts' }
  },
  accounts: {
    id: { type: 'id' },
    trans1: { type: 'id', ref: 'transactions' },
    trans2: { type: 'id', ref: 'transactions' },
    trans3: { type: 'id', ref: 'transactions' }
  }
};

let schemaWithTombstone = {
  transactions: {
    id: { type: 'id' },
    payee: { type: 'id', ref: 'payees' },
    amount: { type: 'integer' },
    tombstone: { type: 'boolean' }
  },
  payees: {
    name: { type: 'string' },
    id: { type: 'id' },
    tombstone: { type: 'boolean' }
  },
  accounts: {
    id: { type: 'id' },
    trans: { type: 'id', ref: 'transactions' }
  }
};

describe('sheet language', () => {
  it('`select` should select fields', () => {
    let result = generateSQLWithState(
      query('accounts')
        .select(['trans1', 'trans2'])
        .withoutValidatedRefs()
        .serialize(),
      schemaWithRefs
    );
    expect(result.sql).toMatch(
      'SELECT accounts.trans1 AS trans1, accounts.trans2 AS trans2, accounts.id AS id FROM accounts'
    );

    // Allows renaming
    result = generateSQLWithState(
      query('accounts')
        .select(['trans1', 'trans1.id', { transId: 'trans1.id' }])
        .withoutValidatedRefs()
        .serialize(),
      schemaWithRefs
    );
    expect(result.sql).toMatch(
      'SELECT accounts.trans1 AS trans1, transactions1.id AS "trans1.id", transactions1.id AS transId, accounts.id AS id FROM'
    );

    // Joined fields should be named by path
    result = generateSQLWithState(
      query('accounts')
        .select(['trans1.payee.name'])
        .withoutValidatedRefs()
        .serialize(),
      schemaWithRefs
    );
    expect(result.sql).toMatch(
      'SELECT payees2.name AS "trans1.payee.name", accounts.id AS id FROM accounts'
    );

    // Renaming works with joined fields
    result = generateSQLWithState(
      query('accounts')
        .select([{ payeeName: 'trans1.payee.name' }])
        .withoutValidatedRefs()
        .serialize(),
      schemaWithRefs
    );
    expect(result.sql).toMatch(
      'SELECT payees2.name AS payeeName, accounts.id AS id FROM accounts'
    );

    // By default, it should do id ref validation
    result = generateSQLWithState(
      query('accounts').select(['trans1', 'trans2']).serialize(),
      schemaWithRefs
    );
    expect(sqlLines(result.sql)).toEqual(
      sqlLines(`
        SELECT transactions1.id AS trans1, transactions2.id AS trans2, accounts.id AS id FROM accounts
        LEFT JOIN transactions transactions1 ON transactions1.id = accounts.trans1
        LEFT JOIN transactions transactions2 ON transactions2.id = accounts.trans2
        WHERE 1
      `)
    );
  });

  it('`select` allows nested functions', () => {
    let result = generateSQLWithState(
      query('transactions')
        .select([{ num: { $idiv: [{ $neg: '$amount' }, 2] } }])
        .serialize(),
      schemaWithRefs
    );
    expect(result.sql).toMatch(
      'SELECT ((-transactions.amount) / 2) AS num, transactions.id AS id FROM transactions'
    );
  });

  it('`select` allows selecting all fields with *', () => {
    let result = generateSQLWithState(
      query('accounts').select(['*']).serialize(),
      schemaWithRefs
    );
    expect(sqlLines(result.sql)).toEqual(
      sqlLines(`
        SELECT accounts.id AS id, transactions1.id AS trans1, transactions2.id AS trans2, transactions3.id AS trans3 FROM accounts
        LEFT JOIN transactions transactions1 ON transactions1.id = accounts.trans1
        LEFT JOIN transactions transactions2 ON transactions2.id = accounts.trans2
        LEFT JOIN transactions transactions3 ON transactions3.id = accounts.trans3
        WHERE 1
      `)
    );

    // Test selecting from joined tables
    result = generateSQLWithState(
      query('accounts').select(['*', 'trans1.*']).serialize(),
      schemaWithRefs
    );
    expect(sqlLines(result.sql)).toEqual(
      sqlLines(`
        SELECT accounts.id AS id, transactions1.id AS trans1, transactions2.id AS trans2, transactions3.id AS trans3, transactions1.id AS "trans1.id", payees4.id AS "trans1.payee", transactions1.date AS "trans1.date", transactions1.amount AS "trans1.amount" FROM accounts
        LEFT JOIN transactions transactions1 ON transactions1.id = accounts.trans1
        LEFT JOIN transactions transactions2 ON transactions2.id = accounts.trans2
        LEFT JOIN transactions transactions3 ON transactions3.id = accounts.trans3
        LEFT JOIN payees payees4 ON payees4.id = transactions1.payee
        WHERE 1
     `)
    );
  });

  it('`select` excludes deleted rows by default and `withDead` includes them', () => {
    // The tombstone flag is not added if not necessary (the table
    // doesn't have it )
    let result = generateSQLWithState(
      query('accounts').select(['trans']).withoutValidatedRefs().serialize(),
      schemaWithTombstone
    );
    expect(result.sql).not.toMatch('tombstone');

    // By default, the tombstone flag should be added if necessary
    result = generateSQLWithState(
      query('transactions').select(['amount']).serialize(),
      schemaWithTombstone
    );
    expect(sqlLines(result.sql)).toEqual(
      sqlLines(`
        SELECT transactions.amount AS amount, transactions.id AS id FROM transactions
        WHERE 1 AND transactions.tombstone = 0
      `)
    );

    // `withDead` should not add the tombstone flag
    result = generateSQLWithState(
      query('transactions').select(['amount']).withDead().serialize(),
      schemaWithTombstone
    );
    expect(sqlLines(result.sql)).toEqual(
      sqlLines(`
        SELECT transactions.amount AS amount, transactions.id AS id FROM transactions
        WHERE 1
      `)
    );

    // The tombstone flag should also be added if joining
    result = generateSQLWithState(
      query('accounts')
        .select(['trans.amount', 'trans.payee.name'])
        .serialize(),
      schemaWithTombstone
    );
    expect(sqlLines(result.sql)).toEqual(
      sqlLines(`
        SELECT transactions1.amount AS "trans.amount", payees2.name AS "trans.payee.name", accounts.id AS id FROM accounts
        LEFT JOIN transactions transactions1 ON transactions1.id = accounts.trans AND transactions1.tombstone = 0
        LEFT JOIN payees payees2 ON payees2.id = transactions1.payee AND payees2.tombstone = 0
        WHERE 1
      `)
    );

    // TODO: provide a way to customize joins, which would allow
    // specifying include deleted
  });

  it('`select` always includes the id', () => {
    let result = generateSQLWithState(
      query('payees').select('name').serialize(),
      schemaWithRefs
    );
    expect(result.sql).toMatch('payees.id AS id');

    result = generateSQLWithState(
      query('payees').select(['name', 'id']).serialize(),
      schemaWithRefs
    );
    // id is only included once, we manually selected it
    expect(result.sql).toMatch(
      'SELECT payees.name AS name, payees.id AS id FROM'
    );

    result = generateSQLWithState(
      query('payees').select('name').groupBy('account').serialize(),
      schemaWithRefs
    );
    // id should not automatically by selected if using `groupBy`
    expect(result.sql).not.toMatch('payees.id AS id');
  });

  it('automatically joins tables if referenced by path', () => {
    // Join a simple table
    let result = generateSQLWithState(
      query('transactions')
        .filter({ 'payee.name': 'kroger' })
        .select(['amount'])
        .serialize(),
      schemaWithRefs
    );
    expect([...result.state.paths.keys()]).toEqual(['transactions.payee']);
    expect(sqlLines(result.sql)).toEqual(
      sqlLines(`
        SELECT transactions.amount AS amount, transactions.id AS id FROM transactions
        LEFT JOIN payees payees1 ON payees1.id = transactions.payee
        WHERE (payees1.name = 'kroger')`)
    );

    // Make sure it works in a `get`
    result = generateSQLWithState(
      query('transactions')
        .filter({ amount: 123 })
        .select(['payee.name'])
        .serialize(),
      schemaWithRefs
    );
    expect([...result.state.paths.keys()]).toEqual(['transactions.payee']);
    expect(sqlLines(result.sql)).toEqual(
      sqlLines(`
        SELECT payees1.name AS "payee.name", transactions.id AS id FROM transactions
        LEFT JOIN payees payees1 ON payees1.id = transactions.payee
        WHERE (transactions.amount = 123)
      `)
    );

    // Join tables deeply
    result = generateSQLWithState(
      query('transactions')
        .filter({ 'payee.account.trans1.amount': 234 })
        .select(['amount', 'payee.name'])
        .serialize(),
      schemaWithRefs
    );
    expect([...result.state.paths.keys()]).toEqual([
      'transactions.payee',
      'transactions.payee.account',
      'transactions.payee.account.trans1'
    ]);
    expect(sqlLines(result.sql)).toEqual(
      sqlLines(`
        SELECT transactions.amount AS amount, payees1.name AS "payee.name", transactions.id AS id FROM transactions
        LEFT JOIN payees payees1 ON payees1.id = transactions.payee
        LEFT JOIN accounts accounts2 ON accounts2.id = payees1.account
        LEFT JOIN transactions transactions3 ON transactions3.id = accounts2.trans1
        WHERE (transactions3.amount = 234)
      `)
    );
  });

  it('avoids unnecessary joins when deeply joining', () => {
    let { state, sql } = generateSQLWithState(
      query('transactions')
        .filter({
          'payee.account.trans1.amount': 1,
          'payee.account.trans2.amount': 2,
          'payee.account.trans3.amount': 3
        })
        .select(['payee.account.trans2.payee'])
        .serialize(),
      schemaWithRefs
    );
    expect([...state.paths.keys()]).toEqual([
      'transactions.payee',
      'transactions.payee.account',
      'transactions.payee.account.trans2',
      'transactions.payee.account.trans2.payee',
      'transactions.payee.account.trans1',
      'transactions.payee.account.trans3'
    ]);
    // It should not join `transactions.payee.account` multiple times,
    // only once
    expect(sqlLines(sql)).toEqual(
      sqlLines(`
      SELECT payees4.id AS "payee.account.trans2.payee", transactions.id AS id FROM transactions
      LEFT JOIN payees payees1 ON payees1.id = transactions.payee
      LEFT JOIN accounts accounts2 ON accounts2.id = payees1.account
      LEFT JOIN transactions transactions3 ON transactions3.id = accounts2.trans2
      LEFT JOIN payees payees4 ON payees4.id = transactions3.payee
      LEFT JOIN transactions transactions5 ON transactions5.id = accounts2.trans1
      LEFT JOIN transactions transactions6 ON transactions6.id = accounts2.trans3
      WHERE (transactions5.amount = 1
      AND transactions3.amount = 2
      AND transactions6.amount = 3)
    `)
    );
  });

  it('groupBy should work', () => {
    let result = generateSQLWithState(
      query('transactions').groupBy('payee.name').select('id').serialize(),
      schemaWithRefs
    );
    expect(sqlLines(result.sql)).toEqual(
      sqlLines(`
        SELECT transactions.id AS id FROM transactions
        LEFT JOIN payees payees1 ON payees1.id = transactions.payee
        WHERE 1
        GROUP BY payees1.name
      `)
    );

    // Allows functions
    result = generateSQLWithState(
      query('transactions')
        .groupBy({ $substr: ['$payee.name', 0, 4] })
        .select('id')
        .serialize(),
      schemaWithRefs
    );
    expect(result.sql).toMatch('GROUP BY SUBSTR(payees1.name, 0, 4)');
  });

  it('orderBy should work', () => {
    let result = generateSQLWithState(
      query('transactions').orderBy('payee.name').select('id').serialize(),
      schemaWithRefs
    );
    expect(sqlLines(result.sql)).toEqual(
      sqlLines(`
        SELECT transactions.id AS id FROM transactions
        LEFT JOIN payees payees1 ON payees1.id = transactions.payee
        WHERE 1
        ORDER BY payees1.name
      `)
    );

    // Allows complex ordering and specifying direction
    result = generateSQLWithState(
      query('transactions')
        .orderBy([
          'payee.id',
          { 'payee.name': 'desc' },
          { $substr: ['$payee.name', 0, 4] },
          { $substr: ['$payee.name', 0, 4], $dir: 'desc' }
        ])
        .select('id')
        .serialize(),
      schemaWithRefs
    );
    expect(result.sql).toMatch(
      'ORDER BY payees1.id, payees1.name desc, SUBSTR(payees1.name, 0, 4), SUBSTR(payees1.name, 0, 4) desc'
    );
  });

  it('allows functions in `select`', () => {
    let result = generateSQLWithState(
      query('transactions')
        .select(['id', { payeeName: { $substr: ['$payee.name', 0, 4] } }])
        .serialize(),
      schemaWithRefs
    );
    expect(result.sql).toMatch(
      'SELECT transactions.id AS id, SUBSTR(payees1.name, 0, 4) AS payeeName FROM transactions'
    );

    result = generateSQLWithState(
      query('transactions')
        .select([
          'id',
          { name: { $substr: [{ $substr: ['$payee.name', 1, 5] }, 3, 4] } }
        ])
        .serialize(),
      schemaWithRefs
    );
    expect(result.sql).toMatch(
      'SELECT transactions.id AS id, SUBSTR(SUBSTR(payees1.name, 1, 5), 3, 4) AS name FROM'
    );
  });

  it('allows filtering with `filter`', () => {
    let result = generateSQLWithState(
      query('transactions')
        .filter({
          date: [{ $lt: '2020-01-01' }],
          $or: [{ 'payee.name': 'foo' }, { 'payee.name': 'bar' }]
        })
        .select(['id'])
        .serialize(),
      schemaWithRefs
    );
    expect(sqlLines(result.sql)).toEqual(
      sqlLines(`
        SELECT transactions.id AS id FROM transactions
        LEFT JOIN payees payees1 ON payees1.id = transactions.payee
        WHERE (transactions.date < 20200101
          AND (payees1.name = 'foo'
          OR payees1.name = 'bar'))
      `)
    );

    // Combining `$or` and `$and` works
    result = generateSQLWithState(
      query('transactions')
        .filter({
          $or: [
            { 'payee.name': 'foo' },
            { 'payee.name': 'bar' },
            {
              $and: [
                { date: [{ $gt: '2019-12-31' }] },
                { date: [{ $lt: '2020-01-01' }] }
              ]
            }
          ]
        })
        .select(['id'])
        .serialize(),
      schemaWithRefs
    );
    expect(sqlLines(result.sql)).toEqual(
      sqlLines(`
        SELECT transactions.id AS id FROM transactions
        LEFT JOIN payees payees1 ON payees1.id = transactions.payee
        WHERE ((payees1.name = 'foo'
          OR payees1.name = 'bar'
          OR (transactions.date > 20191231
          AND transactions.date < 20200101)))
      `)
    );

    // Giving a field an array implicitly ANDs the filters
    result = generateSQLWithState(
      query('transactions')
        .filter({ date: [{ $lt: '2020-01-01' }, { $gt: '2019-12-01' }] })
        .select(['id'])
        .serialize(),
      schemaWithRefs
    );
    expect(sqlLines(result.sql)).toEqual(
      sqlLines(`
        SELECT transactions.id AS id FROM transactions
        WHERE (transactions.date < 20200101 AND transactions.date > 20191201)
      `)
    );

    // Allows referencing fields
    result = generateSQLWithState(
      query('transactions')
        .filter({ amount: { $lt: '$amount2' } })
        .select(['id'])
        .serialize(),
      basicSchema
    );
    expect(sqlLines(result.sql)).toEqual(
      sqlLines(`
        SELECT transactions.id AS id FROM transactions
        WHERE (transactions.amount < transactions.amount2)
      `)
    );
  });

  it('$and and $or allow the object form', () => {
    let result = generateSQLWithState(
      query('transactions')
        .filter({
          $and: { payee: 'payee1', amount: 12 }
        })
        .select(['id'])
        .withoutValidatedRefs()
        .serialize(),
      schemaWithRefs
    );
    expect(result.sql).toMatch(
      /WHERE \(\(transactions.payee = 'payee1'\s*\n\s*AND transactions.amount = 12\)\)/
    );

    result = generateSQLWithState(
      query('transactions')
        .filter({
          $or: { payee: 'payee1', amount: 12 }
        })
        .select(['id'])
        .withoutValidatedRefs()
        .serialize(),
      schemaWithRefs
    );
    expect(result.sql).toMatch(
      /WHERE \(\(transactions.payee = 'payee1'\s*\n\s*OR transactions.amount = 12\)\)/
    );
  });

  it('allows functions in `filter`', () => {
    // Allows transforming the input
    let result = generateSQLWithState(
      query('transactions')
        .filter({
          'payee.name': { $transform: { $substr: ['$', 0, 4] }, $lt: 'foo' }
        })
        .select(['id'])
        .serialize(),
      schemaWithRefs
    );
    expect(sqlLines(result.sql)).toEqual(
      sqlLines(`
        SELECT transactions.id AS id FROM transactions
        LEFT JOIN payees payees1 ON payees1.id = transactions.payee
        WHERE (SUBSTR(payees1.name, 0, 4) < 'foo')
      `)
    );

    // Allows transforming left-hand side and calling a function on
    // right-hand side
    result = generateSQLWithState(
      query('transactions')
        .filter({
          date: { $transform: '$month', $lt: { $month: '$date' } }
        })
        .select(['id'])
        .serialize(),
      schemaWithRefs
    );
    expect(result.sql).toMatch(
      'WHERE (CAST(SUBSTR(transactions.date, 1, 6) AS integer) < CAST(SUBSTR(transactions.date, 1, 6) AS integer))'
    );

    // Allows nesting functions
    result = generateSQLWithState(
      query('transactions')
        .filter({
          'payee.name': {
            $lt: { $substr: [{ $substr: ['$payee.name', 1, 5] }, 3, 4] }
          }
        })
        .select(['id'])
        .serialize(),
      schemaWithRefs
    );
    expect(result.sql).toMatch(
      'WHERE (payees1.name < SUBSTR(SUBSTR(payees1.name, 1, 5), 3, 4))'
    );
  });

  it('allows limit and offset', () => {
    let result = generateSQLWithState(
      query('transactions').select(['id']).limit(10).serialize(),
      schemaWithRefs
    );
    expect(result.sql).toMatch(/\s+LIMIT 10\s*$/);

    result = generateSQLWithState(
      query('transactions').select(['id']).offset(11).serialize(),
      schemaWithRefs
    );
    expect(result.sql).toMatch(/\s+OFFSET 11\s*$/);

    result = generateSQLWithState(
      query('transactions').select(['id']).limit(10).offset(11).serialize(),
      schemaWithRefs
    );
    expect(result.sql).toMatch(/\s+LIMIT 10\s*\n\s*OFFSET 11\s*$/);
  });

  it('allows named parameters', () => {
    let result = generateSQLWithState(
      query('transactions')
        .filter({ amount: ':amount' })
        .select(['id'])
        .serialize(),
      schemaWithRefs
    );
    expect(result.sql).toMatch('transactions.amount = ?');

    result = generateSQLWithState(
      query('transactions')
        .filter({ amount: { $lt: { $neg: ':amount' } } })
        .select(['id'])
        .serialize(),
      schemaWithRefs
    );
    expect(result.sql).toMatch('WHERE (transactions.amount < (-?))');

    // Infers the right type
    result = generateSQLWithState(
      query('transactions')
        .filter({ date: { $transform: '$month', $eq: { $month: ':month' } } })
        .select()
        .serialize(),
      schemaWithRefs
    );
    let monthParam = result.state.namedParameters.find(
      p => p.paramName === 'month'
    );
    expect(monthParam.paramType).toBe('date-month');
  });

  it('allows customizing generated SQL', () => {
    let result = generateSQLWithState(
      query('transactions').select(['amount']).serialize(),
      schemaWithRefs,
      {
        tableViews: { transactions: 'v_transactions' },
        tableFilters: name =>
          name === 'transactions' ? [{ amount: { $gt: 0 } }] : []
      }
    );
    expect(sqlLines(result.sql)).toEqual(
      sqlLines(`
        SELECT v_transactions.amount AS amount, v_transactions.id AS id FROM v_transactions
        WHERE 1 AND (v_transactions.amount > 0)
      `)
    );

    // Make sure the same customizations are applied when joining
    result = generateSQLWithState(
      query('accounts').select(['trans1.amount']).serialize(),
      schemaWithRefs,
      {
        tableViews: { transactions: 'v_transactions' },
        tableFilters: name =>
          name === 'transactions' ? [{ amount: { $gt: 0 } }] : []
      }
    );
    // The joined table should be customized
    expect(result.sql).toMatch('LEFT JOIN v_transactions');
    // Make sure the filter works on the joined table, not the
    // implicit table (it has a "1" suffix)
    expect(result.sql).toMatch('transactions1.amount > 0');
    // Check the entire sql
    expect(sqlLines(result.sql)).toEqual(
      sqlLines(`
        SELECT transactions1.amount AS "trans1.amount", accounts.id AS id FROM accounts
        LEFT JOIN v_transactions transactions1 ON transactions1.id = accounts.trans1 AND (transactions1.amount > 0)
        WHERE 1
      `)
    );

    // Internal table filters can't use paths
    expect(() =>
      generateSQLWithState(
        query('accounts').select(['trans1.amount']).serialize(),
        schemaWithRefs,
        {
          tableViews: { transactions: 'v_transactions' },
          tableFilters: name =>
            name === 'transactions' ? [{ 'payee.name': 'foo' }] : []
        }
      )
    ).toThrow(/cannot contain paths/);
  });

  it('raw mode avoids any internal filters', () => {
    let result = generateSQLWithState(
      query('transactions').select(['amount']).raw().serialize(),
      schemaWithRefs,
      {
        tableViews: { transactions: 'v_transactions' },
        tableFilters: name =>
          name === 'transactions' ? [{ amount: { $gt: 0 } }] : []
      }
    );
    expect(sqlLines(result.sql)).toEqual(
      sqlLines(`
        SELECT v_transactions.amount AS amount, v_transactions.id AS id FROM v_transactions
        WHERE 1
      `)
    );
  });

  it('tracks compiler state for debugging', () => {
    // select
    try {
      generateSQLWithState(
        query('transactions')
          .select({ month: { $month: '$payee.name2' } })
          .serialize(),
        schemaWithRefs
      );
      throw new Error('Test should have thrown');
    } catch (e) {
      expect(e.message).toMatch('Expression stack:');
      expect(e.message).toMatch(/\$payee.name2\n/g);
      expect(e.message).toMatch('{"$month":"$payee.name2"}');
      expect(e.message).toMatch('select({"month":{"$month":"$payee.name2"}})');
    }

    // filter
    try {
      generateSQLWithState(
        query('transactions')
          .filter({ date: { $transform: '$month', $eq: 10 } })
          .select(['id'])
          .serialize(),
        schemaWithRefs
      );
      throw new Error('Test should have thrown');
    } catch (e) {
      expect(e.message).toMatch('Expression stack:');
      expect(e.message).toMatch('{"date":{"$transform":"$month","$eq":10}}');
      expect(e.message).toMatch(
        'filter({"date":{"$transform":"$month","$eq":10}})'
      );
    }

    // group by
    try {
      generateSQLWithState(
        query('transactions')
          .groupBy({ $month: '$date2' })
          .select({ amount: { $sum: '$amount' } })
          .serialize(),
        schemaWithRefs
      );
      throw new Error('Test should have thrown');
    } catch (e) {
      expect(e.message).toMatch('Expression stack:');
      expect(e.message).toMatch(/\$date2\n/g);
      expect(e.message).toMatch('{"$month":"$date2"}');
      expect(e.message).toMatch('groupBy({"$month":"$date2"})');
    }

    // order by
    try {
      generateSQLWithState(
        query('transactions')
          .orderBy({ $month: '$date2' })
          .select({ amount: { $sum: '$amount' } })
          .serialize(),
        schemaWithRefs
      );
      throw new Error('Test should have thrown');
    } catch (e) {
      expect(e.message).toMatch('Expression stack:');
      expect(e.message).toMatch(/\$date2\n/g);
      expect(e.message).toMatch('{"$month":"$date2"}');
      expect(e.message).toMatch('orderBy({"$month":"$date2"})');
    }
  });

  it('$oneof creates template for executor to run', () => {
    let result = generateSQLWithState(
      query('transactions')
        .filter({ id: { $oneof: ['one', 'two', 'three'] } })
        .select(['amount'])
        .serialize(),
      schemaWithRefs
    );
    expect(result.sql).toMatch("id IN ('one','two','three')");
  });
});

describe('Type conversions', () => {
  it('date literals are converted to ints on input', () => {
    let result = generateSQLWithState(
      query('transactions')
        .filter({ date: '2020-01-01' })
        .select(['id'])
        .serialize(),
      basicSchema
    );
    expect(result.sql).toMatch('WHERE (transactions.date = 20200101)');

    result = generateSQLWithState(
      query('transactions')
        .filter({ date: { $transform: '$month', $eq: '2020-01' } })
        .select(['id'])
        .serialize(),
      basicSchema
    );
    expect(result.sql).toMatch(
      'WHERE (CAST(SUBSTR(transactions.date, 1, 6) AS integer) = 202001)'
    );

    // You can also specify a full date that is auto-converted to month
    result = generateSQLWithState(
      query('transactions')
        .filter({ date: { $transform: '$month', $eq: '2020-01-01' } })
        .select(['id'])
        .serialize(),
      basicSchema
    );
    expect(result.sql).toMatch(
      'WHERE (CAST(SUBSTR(transactions.date, 1, 6) AS integer) = 202001)'
    );

    // You can also specify a full date that is auto-converted to month
    result = generateSQLWithState(
      query('transactions')
        .filter({ date: { $transform: '$year', $eq: '2020-01-01' } })
        .select(['id'])
        .serialize(),
      basicSchema
    );
    expect(result.sql).toMatch(
      'WHERE (CAST(SUBSTR(transactions.date, 1, 4) AS integer) = 2020)'
    );
  });

  it('date fields are converted to months and years', () => {
    let result = generateSQLWithState(
      query('accounts')
        .filter({
          'trans1.date': { $transform: '$month', $eq: '$trans2.date' }
        })
        .select(['id'])
        .serialize(),
      schemaWithRefs
    );
    expect(result.sql).toMatch(
      'WHERE (CAST(SUBSTR(transactions2.date, 1, 6) AS integer) = CAST(SUBSTR(transactions1.date, 1, 6) AS integer))'
    );

    // You can also specify a full date that is auto-converted to month
    result = generateSQLWithState(
      query('accounts')
        .filter({ 'trans1.date': { $transform: '$year', $eq: '$trans2.date' } })
        .select(['id'])
        .serialize(),
      schemaWithRefs
    );
    expect(result.sql).toMatch(
      'WHERE (CAST(SUBSTR(transactions2.date, 1, 4) AS integer) = CAST(SUBSTR(transactions1.date, 1, 4) AS integer))'
    );
  });

  it('allows conversions from string to id', () => {
    expect(() => {
      generateSQLWithState(
        query('transactions').filter({ id: 'foo' }).select(['id']).serialize(),
        schemaWithRefs
      );
    }).not.toThrow();

    expect(() => {
      generateSQLWithState(
        query('accounts')
          .filter({ id: '$trans1.id' })
          .select(['id'])
          .serialize(),
        schemaWithRefs
      );
    }).not.toThrow();

    // Numbers cannot be converted to ids
    expect(() => {
      generateSQLWithState(
        query('transactions').filter({ id: 5 }).select(['id']).serialize(),
        schemaWithRefs
      );
    }).toThrow(/Can't convert/);
  });

  it('allows conversions from integers to floats', () => {
    expect(() => {
      generateSQLWithState(
        query('transactions')
          .filter({ amount3: 45 })
          .select(['id'])
          .serialize(),
        basicSchema
      );
    }).not.toThrow();

    // Floats cannot be converted to ints
    expect(() => {
      generateSQLWithState(
        query('transactions')
          .filter({ amount: 45.5 })
          .select(['id'])
          .serialize(),
        basicSchema
      );
    }).toThrow(/Can't convert/);
  });

  it('allows fields to be nullable', () => {
    // With validated refs
    let result = generateSQLWithState(
      query('transactions').filter({ payee: null }).select().serialize(),
      schemaWithRefs
    );
    expect(result.sql).toMatch('WHERE (payees1.id IS NULL)');

    // Without validated refs
    result = generateSQLWithState(
      query('transactions')
        .filter({ payee: null })
        .select()
        .withoutValidatedRefs()
        .serialize(),
      schemaWithRefs
    );
    expect(result.sql).toMatch('WHERE (transactions.payee IS NULL)');
  });
});
