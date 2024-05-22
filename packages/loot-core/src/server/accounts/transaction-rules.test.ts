// @ts-strict-ignore
import { q } from '../../shared/query';
import { runQuery } from '../aql';
import * as db from '../db';
import { loadMappings } from '../db/mappings';

import {
  getRules,
  loadRules,
  insertRule,
  updateRule,
  deleteRule,
  makeRule,
  runRules,
  conditionsToAQL,
  resetState,
  getProbableCategory,
  updateCategoryRules,
} from './transaction-rules';

// TODO: write tests to make sure payee renaming is "pre" and category
// setting is "null" stage

beforeEach(async () => {
  await global.emptyDatabase()();
  resetState();
  await loadMappings();
});

async function getMatchingTransactions(conds) {
  const { filters } = conditionsToAQL(conds);
  const { data } = await runQuery(
    q('transactions').filter({ $and: filters }).select('*'),
  );
  return data;
}

describe('Transaction rules', () => {
  test('makeRule validates rule data', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation();

    // Parse errors
    expect(makeRule({ conditions: '{', actions: '[]' })).toBe(null);
    expect(makeRule({ conditions: '[]', actions: '{' })).toBe(null);
    expect(makeRule({ conditions: '{}', actions: '{}' })).toBe(null);

    // This is valid
    expect(makeRule({ conditions: '[]', actions: '[]' })).not.toBe(null);

    // condition has invalid operator
    expect(
      makeRule({
        conditions: JSON.stringify([
          { op: 'noop', field: 'date', value: '2019-05' },
        ]),
        actions: JSON.stringify([
          { op: 'set', field: 'name', value: 'Sarah' },
          { op: 'set', field: 'category', value: 'Sarah' },
        ]),
      }),
    ).toBe(null);

    // setting an invalid field
    expect(
      makeRule({
        conditions: JSON.stringify([
          { op: 'is', field: 'date', value: '2019-05' },
        ]),
        actions: JSON.stringify([
          { op: 'set', field: 'notes', value: 'Sarah' },
          { op: 'set', field: 'invalid', value: 'Sarah' },
        ]),
      }),
    ).toBe(null);

    // condition has valid operator & setting valid fields
    expect(
      makeRule({
        conditions: JSON.stringify([
          { op: 'is', field: 'date', value: '2019-05' },
        ]),
        actions: JSON.stringify([
          { op: 'set', field: 'notes', value: 'Sarah' },
          { op: 'set', field: 'category', value: 'Sarah' },
        ]),
      }),
    ).not.toBe(null);

    spy.mockRestore();
  });

  test('insert a rule into the database', async () => {
    await loadRules();
    await insertRule({
      stage: 'pre',
      conditionsOp: 'and',
      conditions: [],
      actions: [],
    });
    expect((await db.all('SELECT * FROM rules')).length).toBe(1);
    // Make sure it was projected
    expect(getRules().length).toBe(1);

    await insertRule({
      stage: 'pre',
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'date', value: '2019-05' }],
      actions: [
        { op: 'set', field: 'notes', value: 'Sarah' },
        { op: 'set', field: 'category', value: 'food' },
      ],
    });
    expect((await db.all('SELECT * FROM rules')).length).toBe(2);
    expect(getRules().length).toBe(2);

    const spy = jest.spyOn(console, 'warn').mockImplementation();

    // Try to insert an invalid rule (don't use `insertRule` because
    // that will validate the input)
    await db.insertWithUUID('rules', { conditions: '{', actions: '}' });
    // It will be in the database
    expect((await db.all('SELECT * FROM rules')).length).toBe(3);
    // But it will be ignored
    expect(getRules().length).toBe(2);

    spy.mockRestore();

    // Finally make sure the rule is actually in place and runs
    const transaction = runRules({
      date: '2019-05-10',
      notes: '',
      category: null,
    });
    expect(transaction.date).toBe('2019-05-10');
    expect(transaction.notes).toBe('Sarah');
    expect(transaction.category).toBe('food');
  });

  test('update a rule in the database', async () => {
    await loadRules();
    const id = await insertRule({
      stage: 'pre',
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'imported_payee', value: 'kroger' }],
      actions: [
        { op: 'set', field: 'notes', value: 'Sarah' },
        { op: 'set', field: 'category', value: 'food' },
      ],
    });
    expect(getRules().length).toBe(1);

    let transaction = runRules({
      imported_payee: 'Kroger',
      notes: '',
      category: null,
    });
    expect(transaction.imported_payee).toBe('Kroger');
    expect(transaction.notes).toBe('Sarah');
    expect(transaction.category).toBe('food');

    // Change the action
    await updateRule({
      id,
      actions: [{ op: 'set', field: 'category', value: 'bars' }],
    });
    expect(getRules().length).toBe(1);

    transaction = runRules({
      imported_payee: 'Kroger',
      notes: '',
      category: null,
    });
    expect(transaction.imported_payee).toBe('Kroger');
    expect(transaction.notes).toBe('');
    expect(transaction.category).toBe('bars');

    // If changing the condition, make sure the rule is re-indexed
    await updateRule({
      id,
      conditions: [{ op: 'is', field: 'imported_payee', value: 'ABC' }],
    });
    transaction = runRules({
      imported_payee: 'ABC',
      notes: '',
      category: null,
    });
    expect(transaction.category).toBe('bars');
    expect(getRules().length).toBe(1);
  });

  test('delete a rule in the database', async () => {
    await loadRules();
    const id = await insertRule({
      stage: 'pre',
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'payee', value: 'kroger' }],
      actions: [
        { op: 'set', field: 'notes', value: 'Sarah' },
        { op: 'set', field: 'category', value: 'food' },
      ],
    });
    expect(getRules().length).toBe(1);

    let transaction = runRules({
      payee: 'Kroger',
      notes: '',
      category: null,
    });
    expect(transaction.payee).toBe('Kroger');
    expect(transaction.category).toBe('food');

    await deleteRule({ id });
    expect(getRules().length).toBe(0);
    transaction = runRules({
      payee: 'Kroger',
      notes: '',
      category: null,
    });
    expect(transaction.payee).toBe('Kroger');
    expect(transaction.category).toBe(null);
  });

  test('loadRules loads all the rules', async () => {
    await loadRules();
    await insertRule({
      stage: 'pre',
      conditionsOp: 'and',
      conditions: [{ op: 'contains', field: 'imported_payee', value: 'lowes' }],
      actions: [{ op: 'set', field: 'payee', value: 'lowes' }],
    });

    await insertRule({
      stage: 'post',
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'imported_payee', value: 'kroger' }],
      actions: [{ op: 'set', field: 'notes', value: 'Sarah' }],
    });

    resetState();

    expect(getRules().length).toBe(0);
    await loadRules();
    expect(getRules().length).toBe(2);

    let transaction = runRules({
      imported_payee: 'blah Lowes blah',
      payee: null,
      category: null,
    });
    expect(transaction.payee).toBe('lowes');

    transaction = runRules({
      imported_payee: 'kroger',
      category: null,
    });
    expect(transaction.notes).toBe('Sarah');
  });

  test('ids in rules are migrated as mapping changes', async () => {
    await loadRules();

    await db.insertPayee({ id: 'home_id', name: 'home' });
    await db.insertPayee({ id: 'lowes_id', name: 'lowes' });
    await db.insertCategoryGroup({ name: 'group' });
    await db.insertCategory({
      id: 'food_id',
      name: 'food',
      cat_group: 'group',
    });
    await db.insertCategory({
      id: 'beer_id',
      name: 'beer',
      cat_group: 'group',
    });

    await insertRule({
      id: 'one',
      stage: 'pre',
      conditionsOp: 'and',
      conditions: [{ op: 'contains', field: 'imported_payee', value: 'lowes' }],
      actions: [{ op: 'set', field: 'payee', value: 'lowes_id' }],
    });

    await insertRule({
      id: 'two',
      stage: 'pre',
      conditionsOp: 'and',
      conditions: [
        { op: 'is', field: 'payee', value: 'lowes_id' },
        { op: 'is', field: 'category', value: 'food_id' },
      ],
      actions: [{ op: 'set', field: 'notes', value: 'Sarah' }],
    });

    let rule1 = getRules().find(r => r.id === 'one');
    let rule2 = getRules().find(r => r.id === 'two');

    expect(rule1.actions[0].value).toBe('lowes_id');
    expect(rule2.conditions[0].value).toBe('lowes_id');
    await db.mergePayees('home_id', ['lowes_id']);
    expect(rule1.actions[0].value).toBe('home_id');
    expect(rule2.conditions[0].value).toBe('home_id');

    expect(rule2.conditions[1].value).toBe('food_id');
    await db.deleteCategory({ id: 'food_id' }, 'beer_id');
    expect(rule2.conditions[1].value).toBe('beer_id');

    await loadRules();

    // Make sure mappings work when loading fresh
    rule1 = getRules().find(r => r.id === 'one');
    rule2 = getRules().find(r => r.id === 'two');
    expect(rule1.actions[0].value).toBe('home_id');
    expect(rule2.conditions[0].value).toBe('home_id');
    expect(rule2.conditions[1].value).toBe('beer_id');
  });

  test('runRules runs all the rules in each phase', async () => {
    await loadRules();
    await insertRule({
      stage: 'post',
      conditionsOp: 'and',
      conditions: [
        {
          op: 'oneOf',
          field: 'payee',
          value: ['kroger', 'kroger1', 'kroger2', 'kroger3', 'kroger4'],
        },
      ],
      actions: [{ op: 'set', field: 'notes', value: 'got it2' }],
    });

    await insertRule({
      stage: 'pre',
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'imported_payee', value: '123 kroger' }],
      actions: [{ op: 'set', field: 'payee', value: 'kroger3' }],
    });

    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [
        { op: 'contains', field: 'imported_payee', value: 'kroger' },
      ],
      actions: [{ op: 'set', field: 'payee', value: 'kroger4' }],
    });

    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'payee', value: 'kroger4' }],
      actions: [{ op: 'set', field: 'notes', value: 'got it' }],
    });

    expect(
      runRules({
        imported_payee: '123 kroger',
        date: '2020-08-11',
        amount: 50,
      }),
    ).toEqual({
      date: '2020-08-11',
      imported_payee: '123 kroger',
      payee: 'kroger4',
      amount: 50,
      notes: 'got it2',
    });
  });

  test('transactions can be queried by rule', async () => {
    await loadRules();
    const account = await db.insertAccount({ name: 'bank' });
    const categoryGroupId = await db.insertCategoryGroup({ name: 'general' });
    const categoryId = await db.insertCategory({
      name: 'food',
      cat_group: categoryGroupId,
    });
    const krogerId = await db.insertPayee({ name: 'kroger' });
    const lowesId = await db.insertPayee({
      name: 'lowes',
      category: categoryId,
    });

    await db.insertTransaction({
      id: '1',
      date: '2020-10-01',
      account,
      payee: krogerId,
      notes: 'barr',
      amount: 353,
    });
    await db.insertTransaction({
      id: '2',
      date: '2020-10-15',
      account,
      payee: krogerId,
      notes: 'fooo',
      amount: 453,
    });
    await db.insertTransaction({
      id: '3',
      date: '2020-10-15',
      account,
      payee: lowesId,
      notes: 'FooO',
      amount: -322,
    });
    await db.insertTransaction({
      id: '4',
      date: '2020-10-16',
      account,
      payee: lowesId,
      notes: null,
      amount: 101,
    });
    await db.insertTransaction({
      id: '5',
      date: '2020-10-16',
      account,
      payee: lowesId,
      notes: '',
      amount: 102,
    });
    await db.insertTransaction({
      id: '6',
      date: '2020-10-17',
      account,
      payee: krogerId,
      notes: 'baz',
      amount: -102,
    });
    await db.insertTransaction({
      id: '7',
      date: '2020-10-17',
      account,
      payee: krogerId,
      notes: 'zaz',
      amount: -101,
    });

    let transactions = await getMatchingTransactions([
      { field: 'date', op: 'is', value: '2020-10-15' },
    ]);
    expect(transactions.map(t => t.id)).toEqual(['2', '3']);

    transactions = await getMatchingTransactions([
      { field: 'payee', op: 'is', value: lowesId },
    ]);
    expect(transactions.map(t => t.id)).toEqual(['4', '5', '3']);

    transactions = await getMatchingTransactions([
      { field: 'amount', op: 'is', value: 353 },
    ]);
    expect(transactions.map(t => t.id)).toEqual(['1']);

    transactions = await getMatchingTransactions([
      { field: 'amount', op: 'is', value: 102 },
    ]);
    expect(transactions.map(t => t.id)).toEqual(['6', '5']);

    transactions = await getMatchingTransactions([
      { field: 'amount', op: 'isapprox', value: 102 },
    ]);
    expect(transactions.map(t => t.id)).toEqual(['6', '7', '4', '5']);

    transactions = await getMatchingTransactions([
      { field: 'amount', op: 'gt', value: 102 },
    ]);
    expect(transactions.map(t => t.id)).toEqual(['2', '3', '1']);

    transactions = await getMatchingTransactions([
      { field: 'amount', op: 'lt', value: 102 },
    ]);
    expect(transactions.map(t => t.id)).toEqual(['7', '4']);

    transactions = await getMatchingTransactions([
      { field: 'amount', op: 'gte', value: 102 },
    ]);
    expect(transactions.map(t => t.id)).toEqual(['6', '5', '2', '3', '1']);

    transactions = await getMatchingTransactions([
      { field: 'amount', op: 'lte', value: 102 },
    ]);
    expect(transactions.map(t => t.id)).toEqual(['6', '7', '4', '5']);

    transactions = await getMatchingTransactions([
      { field: 'notes', op: 'is', value: 'FooO' },
    ]);
    expect(transactions.map(t => t.id)).toEqual(['2', '3']);

    transactions = await getMatchingTransactions([
      { field: 'notes', op: 'contains', value: 'oo' },
    ]);
    expect(transactions.map(t => t.id)).toEqual(['2', '3']);

    transactions = await getMatchingTransactions([
      { field: 'notes', op: 'oneOf', value: ['fooo', 'barr'] },
    ]);
    expect(transactions.map(t => t.id)).toEqual(['2', '3', '1']);

    transactions = await getMatchingTransactions([
      { field: 'notes', op: 'is', value: '' },
    ]);
    expect(transactions.map(t => t.id)).toEqual(['4', '5']);

    transactions = await getMatchingTransactions([
      { field: 'amount', op: 'gt', value: 300 },
    ]);
    expect(transactions.map(t => t.id)).toEqual(['2', '3', '1']);

    transactions = await getMatchingTransactions([
      { field: 'amount', op: 'gt', value: 400 },
      { field: 'amount', op: 'lt', value: 500 },
    ]);
    expect(transactions.map(t => t.id)).toEqual(['2']);

    transactions = await getMatchingTransactions([
      { field: 'amount', op: 'gt', value: 300, options: { inflow: true } },
      { field: 'amount', op: 'lt', value: 400, options: { inflow: true } },
    ]);
    expect(transactions.map(t => t.id)).toEqual(['1']);

    // If `inflow` is true, it should never return outflow transactions
    transactions = await getMatchingTransactions([
      { field: 'amount', op: 'gt', value: -1000, options: { inflow: true } },
    ]);
    expect(transactions.map(t => t.id)).toEqual(['4', '5', '2', '1']);

    // Same thing for `outflow`: never return `inflow` transactions
    transactions = await getMatchingTransactions([
      { field: 'amount', op: 'gt', value: 300, options: { outflow: true } },
    ]);
    expect(transactions.map(t => t.id)).toEqual(['3']);

    transactions = await getMatchingTransactions([
      { field: 'date', op: 'gt', value: '2020-10-10' },
    ]);
    expect(transactions.map(t => t.id)).toEqual(['6', '7', '4', '5', '2', '3']);

    // todo: isapprox
  });
});

describe('Learning categories', () => {
  function expectCategoryRule(rule, category, expectedPayee) {
    expect(rule.conditions.length).toBe(1);
    expect(rule.conditions[0].op).toBe('is');
    expect(rule.conditions[0].field).toBe('payee');
    expect(rule.conditions[0].value).toBe(expectedPayee);
    expect(rule.actions.length).toBe(1);
    expect(rule.actions[0].op).toBe('set');
    expect(rule.actions[0].field).toBe('category');
    expect(rule.actions[0].value).toBe(category);
  }

  async function insertTransaction(
    transaction,
    expectedCategory,
    expectedRuleCount = 1,
    expectedPayee = 'foo',
  ) {
    await db.insertTransaction(transaction);
    await updateCategoryRules([transaction]);
    expect(getRules().length).toBe(expectedRuleCount);

    if (expectedRuleCount > 0) {
      expectCategoryRule(
        getRules()[expectedRuleCount - 1],
        expectedCategory,
        expectedPayee,
      );
    }
  }

  async function loadData() {
    await loadRules();
    await db.insertAccount({ id: 'acct', name: 'acct' });
    await db.insertCategoryGroup({ id: 'catg', name: 'catg' });
    await db.insertCategory({ id: 'food', name: 'food', cat_group: 'catg' });
    await db.insertCategory({ id: 'beer', name: 'beer', cat_group: 'catg' });
    await db.insertCategory({ id: 'fun', name: 'fun', cat_group: 'catg' });
    await db.insertPayee({ id: 'foo', name: 'foo' });
    await db.insertPayee({ id: 'bar', name: 'bar' });
  }

  test('getProbableCategory estimates a category winner', () => {
    let winner = getProbableCategory([{ category: 'foo' }]);
    // It needs at least 3 transactions
    expect(winner).toBe(null);

    winner = getProbableCategory([
      { category: 'foo' },
      { category: 'foo' },
      { category: 'foo' },
    ]);
    expect(winner).toBe('foo');

    winner = getProbableCategory([
      { category: 'bar' },
      { category: 'foo' },
      { category: 'foo' },
      { category: 'foo' },
    ]);
    expect(winner).toBe('foo');

    winner = getProbableCategory([
      { category: 'bar' },
      { category: 'bar' },
      { category: 'bar' },
      { category: 'foo' },
      { category: 'foo' },
      { category: 'foo' },
    ]);
    expect(winner).toBe('bar');
  });

  test('creates rule when inserting transactions', async () => {
    await loadData();

    await insertTransaction(
      {
        id: 'one',
        date: '2016-12-01',
        account: 'acct',
        payee: 'foo',
        category: 'food',
      },
      null,
      0,
    );

    await insertTransaction(
      {
        id: 'two',
        date: '2016-12-01',
        account: 'acct',
        payee: 'foo',
        category: 'food',
      },
      null,
      0,
    );

    await insertTransaction(
      {
        id: 'three',
        date: '2016-12-01',
        account: 'acct',
        payee: 'foo',
        category: 'food',
      },
      'food',
    );
  });

  test('leaves existing rule alone if probable category is ambiguous', async () => {
    await loadData();

    await insertTransaction(
      {
        id: 'one',
        date: '2016-12-01',
        account: 'acct',
        payee: 'foo',
        category: 'food',
      },
      null,
      0,
    );

    await insertTransaction(
      {
        id: 'two',
        date: '2016-12-01',
        account: 'acct',
        payee: 'foo',
        category: 'beer',
      },
      null,
      0,
    );

    await insertTransaction(
      {
        id: 'three',
        date: '2016-12-01',
        account: 'acct',
        payee: 'foo',
        category: 'beer',
      },
      null,
      0,
    );

    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'payee', value: 'foo' }],
      actions: [{ op: 'set', field: 'category', value: 'fun' }],
    });

    // Even though the system couldn't figure out the category to set,
    // it should leave the existing rule alone
    await insertTransaction(
      {
        id: 'four',
        date: '2016-12-01',
        account: 'acct',
        payee: 'foo',
        category: 'bills',
      },
      'fun',
      1,
    );
  });

  test('updates an existing rule', async () => {
    await loadData();

    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'payee', value: 'foo' }],
      actions: [{ op: 'set', field: 'category', value: 'beer' }],
    });

    await insertTransaction(
      {
        id: 'one',
        date: '2016-12-01',
        account: 'acct',
        payee: 'foo',
        category: 'food',
      },
      'beer',
      1,
    );
    await insertTransaction(
      {
        id: 'two',
        date: '2016-12-01',
        account: 'acct',
        payee: 'foo',
        category: 'food',
      },
      'beer',
      1,
    );
    await insertTransaction(
      {
        id: 'three',
        date: '2016-12-01',
        account: 'acct',
        payee: 'foo',
        category: 'food',
      },
      'food',
      1,
    );
  });

  test('works with multiple payees', async () => {
    await loadData();

    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'payee', value: 'foo' }],
      actions: [{ op: 'set', field: 'category', value: 'beer' }],
    });

    // Use a new payee, so the category should be remembered
    await insertTransaction(
      {
        id: 'three',
        date: '2016-12-03',
        account: 'acct',
        payee: 'bar',
        category: 'fun',
      },
      'beer',
      1,
    );
    await insertTransaction(
      {
        id: 'four',
        date: '2016-12-03',
        account: 'acct',
        payee: 'bar',
        category: 'fun',
      },
      'beer',
      1,
    );
    await insertTransaction(
      {
        id: 'five',
        date: '2016-12-03',
        account: 'acct',
        payee: 'bar',
        category: 'fun',
      },
      'fun',
      2,
      'bar',
    );
  });

  test('updates rules correctly even if multiple rules exist', async () => {
    await loadData();

    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'payee', value: 'foo' }],
      actions: [{ op: 'set', field: 'category', value: 'unknown1' }],
    });
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'payee', value: 'foo' }],
      actions: [{ op: 'set', field: 'category', value: 'unknown2' }],
    });
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'payee', value: null }],
      actions: [{ op: 'set', field: 'category', value: 'beer' }],
    });

    let trans = {
      date: '2016-12-01',
      account: 'acct',
      payee: 'foo',
      category: 'food',
    };
    await db.insertTransaction({ ...trans, id: 'one' });
    await db.insertTransaction({ ...trans, id: 'two' });
    await db.insertTransaction({ ...trans, id: 'three' });
    await updateCategoryRules([{ ...trans, id: 'three' }]);
    expect(getRules()).toMatchSnapshot();

    trans = {
      date: '2016-12-02',
      account: 'acct',
      payee: 'foo',
      category: 'beer',
    };
    await db.insertTransaction({ ...trans, id: 'four' });
    await db.insertTransaction({ ...trans, id: 'five' });
    await db.insertTransaction({ ...trans, id: 'six' });
    await updateCategoryRules([{ ...trans, id: 'three' }]);
    expect(getRules()).toMatchSnapshot();

    const rules = getRules();
    const getPayees = cat => {
      const arr = rules
        .filter(rule => rule.actions[0].value === cat)
        .map(r => r.conditions.map(c => c.value));
      return Array.prototype.concat.apply([], arr);
    };

    // The `foo` payee has been removed from all rules and added to
    // the correct one
    expect(getPayees('unknown1')).toEqual([]);
    expect(getPayees('unknown2')).toEqual([]);
    expect(getPayees('food')).toEqual([]);
    expect(getPayees('beer')).toEqual(['foo', 'foo', null]);
  });

  test('avoids remembering categories for `null` payee', async () => {
    await loadData();

    expect(getRules().length).toBe(0);
    const trans = {
      date: '2016-12-01',
      account: 'acct',
      payee: null,
      category: 'food',
    };
    await db.insertTransaction({ ...trans, id: 'one' });
    await db.insertTransaction({ ...trans, id: 'two' });
    await db.insertTransaction({ ...trans, id: 'three' });
    await updateCategoryRules([{ ...trans, id: 'three' }]);
    expect(getRules().length).toBe(0);
  });

  test('adding transaction with `null` payee never changes rules', async () => {
    await loadData();

    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'payee', value: 'foo' }],
      actions: [{ op: 'set', field: 'category', value: 'unknown1' }],
    });
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'oneOf', field: 'payee', value: ['foo', 'bar'] }],
      actions: [{ op: 'set', field: 'category', value: 'unknown1' }],
    });

    expect(getRules().length).toBe(2);
    const trans = {
      date: '2016-12-01',
      account: 'acct',
      payee: null,
      category: 'food',
    };
    await db.insertTransaction({ ...trans, id: 'one' });
    await db.insertTransaction({ ...trans, id: 'two' });
    await db.insertTransaction({ ...trans, id: 'three' });
    await updateCategoryRules([{ ...trans, id: 'three' }]);

    // This should not have changed the category! This is tested
    // because this was a bug when rules were released
    const rules = getRules();
    expect(rules.length).toBe(2);
    expect(rules[0].actions[0].value).toBe('unknown1');
    expect(rules[1].actions[0].value).toBe('unknown1');
  });

  test('rules are saved with internal field names', async () => {
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'imported_payee', value: 'foo' }],
      actions: [{ op: 'set', field: 'payee', value: 'unknown1' }],
    });

    // The rule that the system sees should use the new public names
    let [rule] = getRules();
    expect(rule.conditions[0].field).toBe('imported_payee');
    expect(rule.actions[0].field).toBe('payee');

    // Internally, it should still be stored with the internal names
    // so that it's backwards compatible
    const rawRule = await db.first('SELECT * FROM rules');
    rawRule.conditions = JSON.parse(rawRule.conditions);
    rawRule.actions = JSON.parse(rawRule.actions);
    expect(rawRule.conditions[0].field).toBe('imported_description');
    expect(rawRule.actions[0].field).toBe('description');

    await loadRules();

    // Make sure reloading everything from the db still uses the new
    // public names
    [rule] = getRules();
    expect(rule.conditions[0].field).toBe('imported_payee');
    expect(rule.actions[0].field).toBe('payee');
  });

  test('rules with public field names are loaded correctly', async () => {
    await db.insertWithUUID('rules', {
      stage: null,
      conditions_op: 'and',
      conditions: JSON.stringify([
        { op: 'is', field: 'imported_payee', value: 'foo' },
      ]),
      actions: JSON.stringify([{ op: 'set', field: 'payee', value: 'payee1' }]),
    });

    await loadRules();

    // This rule internally has been stored with the public names.
    // Making this work now allows us to switch to it by default in
    // the future
    const rawRule = await db.first('SELECT * FROM rules');
    rawRule.conditions = JSON.parse(rawRule.conditions);
    rawRule.actions = JSON.parse(rawRule.actions);
    expect(rawRule.conditions[0].field).toBe('imported_payee');
    expect(rawRule.actions[0].field).toBe('payee');

    const [rule] = getRules();
    expect(rule.conditions[0].field).toBe('imported_payee');
    expect(rule.actions[0].field).toBe('payee');
  });

  // TODO: write tests for split transactions
});
