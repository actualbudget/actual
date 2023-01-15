import {
  parseDateString,
  rankRules,
  iterateIds,
  Condition,
  Action,
  Rule,
  RuleIndexer
} from './rules';

let fieldTypes = new Map(
  Object.entries({
    id: 'id',
    date: 'date',
    name: 'string',
    category: 'string',
    description: 'id',
    description2: 'id',
    amount: 'number'
  })
);

describe('Condition', () => {
  test('parses date formats correctly', () => {
    expect(parseDateString('2020-08-10')).toEqual({
      type: 'date',
      date: '2020-08-10'
    });
    expect(parseDateString('2020-08')).toEqual({
      type: 'month',
      date: '2020-08'
    });
    expect(parseDateString('2020')).toEqual({
      type: 'year',
      date: '2020'
    });

    // Invalid dates
    expect(parseDateString('2020-0')).toBe(null);
    expect(parseDateString('2020-14-01')).toBe(null);
    expect(parseDateString('2020-05-53')).toBe(null);
  });

  test('ops handles null fields', () => {
    let cond = new Condition('contains', 'name', 'foo', null, fieldTypes);
    expect(cond.eval({ name: null })).toBe(false);

    cond = new Condition('oneOf', 'name', ['foo'], null, fieldTypes);
    expect(cond.eval({ name: null })).toBe(false);

    ['gt', 'gte', 'lt', 'lte', 'isapprox'].forEach(op => {
      let cond = new Condition(op, 'date', '2020-01-01', null, fieldTypes);
      expect(cond.eval({ date: null })).toBe(false);
    });

    cond = new Condition('is', 'id', null, null, fieldTypes);
    expect(cond.eval({ id: null })).toBe(true);
  });

  test('ops handles undefined fields', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation();

    let cond = new Condition('is', 'id', null, null, fieldTypes);
    // null is strict and won't match undefined
    expect(cond.eval({ name: 'James' })).toBe(false);

    cond = new Condition('contains', 'name', 'foo', null, fieldTypes);
    expect(cond.eval({ date: '2020-01-01' })).toBe(false);

    spy.mockRestore();
  });

  test('date restricts operators for each type', () => {
    expect(() => {
      new Condition('isapprox', 'date', '2020-08', null, fieldTypes);
    }).toThrow('Invalid date value for');
    expect(() => {
      new Condition('gt', 'date', '2020-08', null, fieldTypes);
    }).toThrow('Invalid date value for');
    expect(() => {
      new Condition('gte', 'date', '2020-08', null, fieldTypes);
    }).toThrow('Invalid date value for');
    expect(() => {
      new Condition('lt', 'date', '2020-08', null, fieldTypes);
    }).toThrow('Invalid date value for');
    expect(() => {
      new Condition('lte', 'date', '2020-08', null, fieldTypes);
    }).toThrow('Invalid date value for');
  });

  test('date conditions work with `is` operator', () => {
    let cond = new Condition('is', 'date', '2020-08-10', null, fieldTypes);
    expect(cond.eval({ date: '2020-08-05' })).toBe(false);
    expect(cond.eval({ date: '2020-08-10' })).toBe(true);

    cond = new Condition('is', 'date', '2020-08', null, fieldTypes);
    expect(cond.eval({ date: '2020-08-05' })).toBe(true);
    expect(cond.eval({ date: '2020-08-10' })).toBe(true);
    expect(cond.eval({ date: '2020-09-10' })).toBe(false);

    cond = new Condition('is', 'date', '2020', null, fieldTypes);
    expect(cond.eval({ date: '2020-08-05' })).toBe(true);
    expect(cond.eval({ date: '2020-08-10' })).toBe(true);
    expect(cond.eval({ date: '2020-09-10' })).toBe(true);
    expect(cond.eval({ date: '2019-09-10' })).toBe(false);

    // Approximate dates
    cond = new Condition('isapprox', 'date', '2020-08-07', null, fieldTypes);
    expect(cond.eval({ date: '2020-08-04' })).toBe(false);
    expect(cond.eval({ date: '2020-08-05' })).toBe(true);
    expect(cond.eval({ date: '2020-08-09' })).toBe(true);
    expect(cond.eval({ date: '2020-08-10' })).toBe(false);
  });

  test('recurring date conditions work with `is` operator', () => {
    let cond = new Condition(
      'is',
      'date',
      {
        start: '2019-01-01',
        frequency: 'monthly',
        patterns: [{ type: 'day', value: 15 }]
      },
      null,
      fieldTypes
    );
    expect(cond.eval({ date: '2018-03-15' })).toBe(false);
    expect(cond.eval({ date: '2019-03-15' })).toBe(true);
    expect(cond.eval({ date: '2020-05-15' })).toBe(true);
    expect(cond.eval({ date: '2020-06-15' })).toBe(true);
    expect(cond.eval({ date: '2020-06-10' })).toBe(false);

    cond = new Condition(
      'is',
      'date',
      {
        start: '2018-01-12',
        frequency: 'monthly',
        interval: 3
      },
      null,
      fieldTypes
    );
    expect(cond.eval({ date: '2019-01-12' })).toBe(true);
    expect(cond.eval({ date: '2019-04-12' })).toBe(true);
    expect(cond.eval({ date: '2020-07-12' })).toBe(true);
    expect(cond.eval({ date: '2020-06-12' })).toBe(false);

    // Approximate dates
    cond = new Condition(
      'isapprox',
      'date',
      {
        start: '2019-01-01',
        frequency: 'monthly',
        patterns: [{ type: 'day', value: 15 }]
      },
      null,
      fieldTypes
    );
    expect(cond.eval({ date: '2019-03-12' })).toBe(false);
    expect(cond.eval({ date: '2019-03-13' })).toBe(true);
    expect(cond.eval({ date: '2019-03-15' })).toBe(true);
    expect(cond.eval({ date: '2019-03-17' })).toBe(true);
    expect(cond.eval({ date: '2019-03-18' })).toBe(false);
    expect(cond.eval({ date: '2019-04-15' })).toBe(true);
    expect(cond.eval({ date: '2019-05-15' })).toBe(true);
    expect(cond.eval({ date: '2019-05-17' })).toBe(true);
  });

  test('date conditions work with comparison operators', () => {
    let cond = new Condition('gt', 'date', '2020-08-10', null, fieldTypes);
    expect(cond.eval({ date: '2020-08-11' })).toBe(true);
    expect(cond.eval({ date: '2020-08-10' })).toBe(false);

    cond = new Condition('gte', 'date', '2020-08-10', null, fieldTypes);
    expect(cond.eval({ date: '2020-08-11' })).toBe(true);
    expect(cond.eval({ date: '2020-08-10' })).toBe(true);
    expect(cond.eval({ date: '2020-08-09' })).toBe(false);

    cond = new Condition('lt', 'date', '2020-08-10', null, fieldTypes);
    expect(cond.eval({ date: '2020-08-09' })).toBe(true);
    expect(cond.eval({ date: '2020-08-10' })).toBe(false);

    cond = new Condition('lte', 'date', '2020-08-10', null, fieldTypes);
    expect(cond.eval({ date: '2020-08-09' })).toBe(true);
    expect(cond.eval({ date: '2020-08-10' })).toBe(true);
    expect(cond.eval({ date: '2020-08-11' })).toBe(false);
  });

  test('id works with all operators', () => {
    let cond = new Condition('is', 'id', 'foo', null, fieldTypes);
    expect(cond.eval({ id: 'foo' })).toBe(true);
    expect(cond.eval({ id: 'FOO' })).toBe(true);
    expect(cond.eval({ id: 'foo2' })).toBe(false);

    cond = new Condition('oneOf', 'id', ['foo', 'bar'], null, fieldTypes);
    expect(cond.eval({ id: 'foo' })).toBe(true);
    expect(cond.eval({ id: 'FOO' })).toBe(true);
    expect(cond.eval({ id: 'Bar' })).toBe(true);
    expect(cond.eval({ id: 'bar2' })).toBe(false);
  });

  test('string works with all operators', () => {
    let cond = new Condition('is', 'name', 'foo', null, fieldTypes);
    expect(cond.eval({ name: 'foo' })).toBe(true);
    expect(cond.eval({ name: 'FOO' })).toBe(true);
    expect(cond.eval({ name: 'foo2' })).toBe(false);

    cond = new Condition('oneOf', 'name', ['foo', 'bar'], null, fieldTypes);
    expect(cond.eval({ name: 'foo' })).toBe(true);
    expect(cond.eval({ name: 'FOO' })).toBe(true);
    expect(cond.eval({ name: 'Bar' })).toBe(true);
    expect(cond.eval({ name: 'bar2' })).toBe(false);

    cond = new Condition('contains', 'name', 'foo', null, fieldTypes);
    expect(cond.eval({ name: 'bar foo baz' })).toBe(true);
    expect(cond.eval({ name: 'bar FOOb' })).toBe(true);
    expect(cond.eval({ name: 'foo' })).toBe(true);
    expect(cond.eval({ name: 'foob' })).toBe(true);
    expect(cond.eval({ name: 'bfoo' })).toBe(true);
    expect(cond.eval({ name: 'bfo' })).toBe(false);
    expect(cond.eval({ name: 'f o o' })).toBe(false);
  });

  test('number validates value', () => {
    new Condition('isapprox', 'amount', 34, null, fieldTypes);

    expect(() => {
      new Condition('isapprox', 'amount', 'hello', null, fieldTypes);
    }).toThrow('Value must be a number or between amount');

    expect(() => {
      new Condition('is', 'amount', { num1: 0, num2: 10 }, null, fieldTypes);
    }).toThrow('Invalid number value for');

    new Condition(
      'isbetween',
      'amount',
      { num1: 0, num2: 10 },
      null,
      fieldTypes
    );

    expect(() => {
      new Condition('isbetween', 'amount', 34.22, null, fieldTypes);
    }).toThrow('Invalid between value for');
    expect(() => {
      new Condition('isbetween', 'amount', { num1: 0 }, null, fieldTypes);
    }).toThrow('Value must be a number or between amount');
  });

  test('number works with all operators', () => {
    let cond = new Condition('is', 'amount', 155, null, fieldTypes);
    expect(cond.eval({ amount: 155 })).toBe(true);
    expect(cond.eval({ amount: 167 })).toBe(false);

    cond = new Condition('isapprox', 'amount', 1535, null, fieldTypes);
    expect(cond.eval({ amount: 1540 })).toBe(true);
    expect(cond.eval({ amount: 1300 })).toBe(false);
    expect(cond.eval({ amount: 1650 })).toBe(true);
    expect(cond.eval({ amount: 1800 })).toBe(false);

    cond = new Condition(
      'isbetween',
      'amount',
      { num1: 32, num2: 86 },
      null,
      fieldTypes
    );
    expect(cond.eval({ amount: 30 })).toBe(false);
    expect(cond.eval({ amount: 32 })).toBe(true);
    expect(cond.eval({ amount: 80 })).toBe(true);
    expect(cond.eval({ amount: 86 })).toBe(true);
    expect(cond.eval({ amount: 90 })).toBe(false);

    cond = new Condition(
      'isbetween',
      'amount',
      { num1: -16, num2: -20 },
      null,
      fieldTypes
    );
    expect(cond.eval({ amount: -18 })).toBe(true);
    expect(cond.eval({ amount: -12 })).toBe(false);

    cond = new Condition('gt', 'amount', 1.55, null, fieldTypes);
    expect(cond.eval({ amount: 1.55 })).toBe(false);
    expect(cond.eval({ amount: 1.67 })).toBe(true);
    expect(cond.eval({ amount: 1.5 })).toBe(false);

    cond = new Condition('gte', 'amount', 1.55, null, fieldTypes);
    expect(cond.eval({ amount: 1.55 })).toBe(true);
    expect(cond.eval({ amount: 1.67 })).toBe(true);
    expect(cond.eval({ amount: 1.5 })).toBe(false);

    cond = new Condition('lt', 'amount', 1.55, null, fieldTypes);
    expect(cond.eval({ amount: 1.55 })).toBe(false);
    expect(cond.eval({ amount: 1.67 })).toBe(false);
    expect(cond.eval({ amount: 1.5 })).toBe(true);

    cond = new Condition('lte', 'amount', 1.55, null, fieldTypes);
    expect(cond.eval({ amount: 1.55 })).toBe(true);
    expect(cond.eval({ amount: 1.67 })).toBe(false);
    expect(cond.eval({ amount: 1.5 })).toBe(true);
  });
});

describe('Action', () => {
  test('`set` operator sets a field', () => {
    let action = new Action('set', 'name', 'James', null, fieldTypes);
    let item = { name: 'Sarah' };
    action.exec(item);
    expect(item.name).toBe('James');

    expect(() => {
      new Action('set', 'foo', 'James', null, new Map());
    }).toThrow(/invalid field/i);

    expect(() => {
      new Action('noop', 'name', 'James', null, fieldTypes);
    }).toThrow(/invalid action operation/i);
  });
});

describe('Rule', () => {
  test('executing a rule works', () => {
    let rule = new Rule({
      conditions: [{ op: 'is', field: 'name', value: 'James' }],
      actions: [{ op: 'set', field: 'name', value: 'Sarah' }],
      fieldTypes
    });

    // This matches
    expect(rule.exec({ name: 'James' })).toEqual({ name: 'Sarah' });
    // It returns updates, not the whole object
    expect(rule.exec({ name: 'James', date: '2018-10-01' })).toEqual({
      name: 'Sarah'
    });
    // This does not match
    expect(rule.exec({ name: 'James2' })).toEqual(null);
    expect(rule.apply({ name: 'James2' })).toEqual({ name: 'James2' });

    rule = new Rule({
      conditions: [{ op: 'is', field: 'name', value: 'James' }],
      actions: [
        { op: 'set', field: 'name', value: 'Sarah' },
        { op: 'set', field: 'category', value: 'Sarah' }
      ],
      fieldTypes
    });

    expect(rule.exec({ name: 'James' })).toEqual({
      name: 'Sarah',
      category: 'Sarah'
    });
    expect(rule.exec({ name: 'James2' })).toEqual(null);
    expect(rule.apply({ name: 'James2' })).toEqual({ name: 'James2' });
  });

  test('rule evaluates conditions as AND', () => {
    let rule = new Rule({
      conditions: [
        { op: 'is', field: 'name', value: 'James' },
        {
          op: 'isapprox',
          field: 'date',
          value: {
            start: '2018-01-12',
            frequency: 'monthly',
            interval: 3
          }
        }
      ],
      actions: [{ op: 'set', field: 'name', value: 'Sarah' }],
      fieldTypes
    });

    expect(rule.exec({ name: 'James', date: '2018-01-12' })).toEqual({
      name: 'Sarah'
    });
    expect(rule.exec({ name: 'James2', date: '2018-01-12' })).toEqual(null);
    expect(rule.exec({ name: 'James', date: '2018-01-10' })).toEqual({
      name: 'Sarah'
    });
    expect(rule.exec({ name: 'James', date: '2018-01-15' })).toEqual(null);
  });

  test('rules are deterministically ranked', () => {
    let rule = (id, conditions) =>
      new Rule({ id, conditions, actions: [], fieldTypes });
    let expectOrder = (rules, ids) =>
      expect(rules.map(r => r.getId())).toEqual(ids);

    let rules = [
      rule('id1', [{ op: 'contains', field: 'name', value: 'sar' }]),
      rule('id2', [{ op: 'contains', field: 'name', value: 'jim' }]),
      rule('id3', [{ op: 'is', field: 'name', value: 'James' }])
    ];

    expectOrder(rankRules(rules), ['id1', 'id2', 'id3']);

    rules = [
      rule('id1', [{ op: 'contains', field: 'name', value: 'sar' }]),
      rule('id2', [{ op: 'oneOf', field: 'name', value: ['jim', 'sar'] }]),
      rule('id3', [{ op: 'is', field: 'name', value: 'James' }]),
      rule('id4', [
        { op: 'is', field: 'name', value: 'James' },
        { op: 'gt', field: 'amount', value: 5 }
      ]),
      rule('id5', [
        { op: 'is', field: 'name', value: 'James' },
        { op: 'gt', field: 'amount', value: 5 },
        { op: 'lt', field: 'amount', value: 10 }
      ])
    ];
    expectOrder(rankRules(rules), ['id1', 'id4', 'id5', 'id2', 'id3']);
  });

  test('iterateIds finds all the ids', () => {
    let rule = (id, conditions, actions = []) =>
      new Rule({ id, conditions, actions, fieldTypes });

    let rules = [
      rule(
        'first',
        [{ op: 'is', field: 'description', value: 'id1' }],
        [{ op: 'set', field: 'name', value: 'sar' }]
      ),
      rule('second', [
        { op: 'oneOf', field: 'description', value: ['id2', 'id3'] }
      ]),
      rule(
        'third',
        [{ op: 'is', field: 'name', value: 'James' }],
        [{ op: 'set', field: 'description', value: 'id3' }]
      ),
      rule('fourth', [
        { op: 'is', field: 'name', value: 'James' },
        { op: 'gt', field: 'amount', value: 5 }
      ]),
      rule('fifth', [
        { op: 'is', field: 'description2', value: 'id5' },
        { op: 'gt', field: 'amount', value: 5 },
        { op: 'lt', field: 'amount', value: 10 }
      ])
    ];

    let foundRules = [];
    iterateIds(rules, 'description', (rule, value) => {
      foundRules.push(rule.getId());
    });
    expect(foundRules).toEqual(['first', 'second', 'second', 'third']);
  });
});

describe('RuleIndexer', () => {
  test('indexing a single field works', () => {
    let indexer = new RuleIndexer({ field: 'name' });

    let rule = new Rule({
      conditions: [{ op: 'is', field: 'name', value: 'James' }],
      actions: [{ op: 'set', field: 'name', value: 'Sarah' }],
      fieldTypes
    });
    indexer.index(rule);

    let rule2 = new Rule({
      conditions: [{ op: 'is', field: 'category', value: 'foo' }],
      actions: [{ op: 'set', field: 'name', value: 'Sarah' }],
      fieldTypes
    });
    indexer.index(rule2);

    // rule2 always gets returned because it's not indexed and always
    // needs to be run
    expect(indexer.getApplicableRules({ name: 'James' })).toEqual(
      new Set([rule, rule2])
    );
    expect(indexer.getApplicableRules({ name: 'James2' })).toEqual(
      new Set([rule2])
    );
    expect(indexer.getApplicableRules({ amount: 15 })).toEqual(
      new Set([rule2])
    );
  });

  test('indexing using the firstchar method works', () => {
    // A condition that references both of the fields
    let indexer = new RuleIndexer({ field: 'category', method: 'firstchar' });
    let rule = new Rule({
      conditions: [
        { op: 'is', field: 'name', value: 'James' },
        { op: 'is', field: 'category', value: 'food' }
      ],
      actions: [{ op: 'set', field: 'name', value: 'Sarah' }],
      fieldTypes
    });
    indexer.index(rule);

    let rule2 = new Rule({
      conditions: [{ op: 'is', field: 'category', value: 'bars' }],
      actions: [{ op: 'set', field: 'name', value: 'Sarah' }],
      fieldTypes
    });
    indexer.index(rule2);

    let rule3 = new Rule({
      conditions: [{ op: 'is', field: 'date', value: '2020-01-20' }],
      actions: [{ op: 'set', field: 'name', value: 'Sarah' }],
      fieldTypes
    });
    indexer.index(rule3);

    expect(indexer.rules.size).toBe(3);
    expect(indexer.rules.get('f').size).toBe(1);
    expect(indexer.rules.get('b').size).toBe(1);
    expect(indexer.rules.get('*').size).toBe(1);

    expect(
      indexer.getApplicableRules({ name: 'James', category: 'food' })
    ).toEqual(new Set([rule, rule3]));
    expect(
      indexer.getApplicableRules({ name: 'James', category: 'f' })
    ).toEqual(new Set([rule, rule3]));
    expect(
      indexer.getApplicableRules({ name: 'James', category: 'foo' })
    ).toEqual(new Set([rule, rule3]));
    expect(
      indexer.getApplicableRules({ name: 'James', category: 'bars' })
    ).toEqual(new Set([rule2, rule3]));
    expect(indexer.getApplicableRules({ name: 'James' })).toEqual(
      new Set([rule3])
    );
  });

  test('re-indexing a field works', () => {
    let indexer = new RuleIndexer({ field: 'category', method: 'firstchar' });

    let rule = new Rule({
      id: 'id1',
      conditions: [{ op: 'is', field: 'category', value: 'food' }],
      actions: [{ op: 'set', field: 'name', value: 'Sarah' }],
      fieldTypes
    });
    indexer.index(rule);

    expect(indexer.rules.get('f').size).toBe(1);
    expect(indexer.rules.get('*')).toBe(undefined);
    expect(indexer.getApplicableRules({ category: 'alco' }).size).toBe(0);
    expect(indexer.getApplicableRules({ category: 'food' }).size).toBe(1);

    indexer.remove(rule);

    expect(indexer.rules.get('f').size).toBe(0);
    expect(indexer.getApplicableRules({ category: 'alco' }).size).toBe(0);
    expect(indexer.getApplicableRules({ category: 'food' }).size).toBe(0);

    rule = new Rule({
      conditions: [{ op: 'is', field: 'category', value: 'alcohol' }],
      actions: [{ op: 'set', field: 'name', value: 'Sarah' }],
      fieldTypes
    });
    indexer.index(rule);

    expect(indexer.rules.get('f').size).toBe(0);
    expect(indexer.rules.get('a').size).toBe(1);
    expect(indexer.getApplicableRules({ category: 'alco' }).size).toBe(1);
    expect(indexer.getApplicableRules({ category: 'food' }).size).toBe(0);
  });

  test('indexing works with the oneOf operator', () => {
    let indexer = new RuleIndexer({ field: 'name', method: 'firstchar' });

    let rule = new Rule({
      conditions: [
        { op: 'oneOf', field: 'name', value: ['James', 'Sarah', 'Evy'] }
      ],
      actions: [{ op: 'set', field: 'category', value: 'Food' }],
      fieldTypes
    });
    indexer.index(rule);

    let rule2 = new Rule({
      conditions: [{ op: 'is', field: 'name', value: 'Georgia' }],
      actions: [{ op: 'set', field: 'category', value: 'Food' }],
      fieldTypes
    });
    indexer.index(rule2);

    expect(indexer.getApplicableRules({ name: 'James' })).toEqual(
      new Set([rule])
    );
    expect(indexer.getApplicableRules({ name: 'Evy' })).toEqual(
      new Set([rule])
    );
    expect(indexer.getApplicableRules({ name: 'Charlotte' })).toEqual(
      new Set([])
    );
    expect(indexer.getApplicableRules({ name: 'Georgia' })).toEqual(
      new Set([rule2])
    );
  });
});
