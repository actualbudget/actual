import {
  conform,
  convertForInsert,
  convertForUpdate,
  convertFromSelect,
} from './schema-helpers';

const basicSchema = {
  transactions: {
    id: { type: 'id' },
    date: { type: 'date', required: true },
    account: { type: 'id', required: true },
    amount: { type: 'integer', default: 0, required: true },
    cleared: { type: 'boolean', default: true },
    notes: { type: 'text' },
    sort_order: { type: 'float', default: () => Date.now() },
  },
};

describe('schema-helpers', () => {
  test('select converts field types', () => {
    const trans = convertFromSelect(basicSchema, {}, 'transactions', {
      amount: 5,
      cleared: 0,
      date: 20200101,
    });
    expect(trans).toEqual({
      amount: 5,
      cleared: false,
      date: '2020-01-01',
    });
  });

  test('a basic insert works', () => {
    const trans = convertForInsert(basicSchema, {}, 'transactions', {
      id: 't1',
      account: 'foo',
      amount: 5,
      date: '2020-01-01',
    });
    expect(trans).toEqual({
      id: 't1',
      account: 'foo',
      amount: 5,
      cleared: 1,
      date: 20200101,
      sort_order: 123456789,
    });
  });

  test('a basic update works', () => {
    const trans = convertForUpdate(basicSchema, {}, 'transactions', {
      id: 'foo',
      amount: 5001,
    });
    expect(trans).toEqual({ id: 'foo', amount: 5001 });
  });

  test('insert forces required fields to exist and be non-null', () => {
    expect(() => {
      convertForInsert(basicSchema, {}, 'transactions2', {
        id: 't1',
        account: 'foo',
        amount: 5,
      });
    }).toThrow(/"transactions2" does not exist/);

    expect(() => {
      convertForInsert(basicSchema, {}, 'transactions', {
        id: 't1',
        account: 'foo',
        amount: 5,
      });
    }).toThrow(/"date" is required/);

    expect(() => {
      convertForInsert(basicSchema, {}, 'transactions', {
        id: 't1',
        account: 'foo',
        amount: 5,
        date: null,
      });
    }).toThrow(/"date" is required/);
  });

  test('update forces required fields be non-null', () => {
    expect(() => {
      convertForUpdate(basicSchema, {}, 'transactions2', {
        id: 'trans',
        account: 'acct',
        amount: 5,
      });
    }).toThrow(/"transactions2" does not exist/);

    expect(() => {
      convertForUpdate(basicSchema, {}, 'transactions', {
        id: 'trans',
        account: 'acct',
        amount: 5,
      });
    }).not.toThrow(/"date" is required/);

    expect(() => {
      convertForUpdate(basicSchema, {}, 'transactions', {
        id: 'trans',
        account: 'acct',
        amount: 5,
        date: null,
      });
    }).toThrow(/"date" is required/);

    // It should enforce fields that have a `default` too
    expect(() => {
      convertForUpdate(basicSchema, {}, 'transactions', {
        id: 'trans',
        account: 'acct',
        amount: null,
      });
    }).toThrow(/"amount" is required/);
  });

  test('conform converts types to db representations', () => {
    const obj = conform(basicSchema, {}, 'transactions', {
      date: '2020-01-01',
      cleared: false,
    });
    expect(obj.date).toBe(20200101);
    expect(obj.cleared).toBe(0);
  });

  test('conform renames fields', () => {
    const obj = conform(
      basicSchema,
      {
        views: {
          transactions: { fields: { amount: 'amount2', cleared: 'cleared2' } },
        },
      },
      'transactions',
      { amount: 100, cleared: false, date: '2020-01-01' },
    );
    expect(obj.amount2).toBe(100);
    expect(obj.cleared2).toBe(0);
    expect(obj.date).toBe(20200101);
  });

  test('default values are handled properly', () => {
    // Amount isn't specified, but should default to 0. cleared is
    // specified but is null and should default to 1
    let trans = convertForInsert(basicSchema, {}, 'transactions', {
      id: 't1',
      account: 'foo',
      date: '2020-01-01',
      cleared: null,
    });
    expect(trans).toEqual({
      id: 't1',
      account: 'foo',
      amount: 0,
      date: 20200101,
      cleared: 1,
      sort_order: 123456789,
    });

    // Updates should never apply defaults
    trans = convertForUpdate(basicSchema, {}, 'transactions', {
      id: 'id',
      cleared: null,
    });
    expect(trans).toEqual({
      id: 'id',
      cleared: 0,
    });
  });

  test('null values are skipped when inserting, but not when updating', () => {
    // Note how `notes` is not a part of the final object
    let trans = convertForInsert(basicSchema, {}, 'transactions', {
      id: 't1',
      account: 'foo',
      date: '2020-01-01',
      notes: null,
    });
    expect(trans).toEqual({
      id: 't1',
      account: 'foo',
      date: 20200101,
      amount: 0,
      cleared: 1,
      sort_order: 123456789,
    });

    // `notes` is null and must be included in an update
    trans = convertForUpdate(basicSchema, {}, 'transactions', {
      id: 'id',
      notes: null,
    });
    expect(trans).toEqual({
      id: 'id',
      notes: null,
    });
  });

  test('floats are not allowed as input types to integers', () => {
    expect(() => {
      convertForUpdate(basicSchema, {}, 'transactions', {
        id: 'id',
        amount: 45.5,
      });
    }).toThrow("Can't convert to integer");
  });

  test('dates before 1995-01-01 are rejected', () => {
    expect(() => {
      convertForInsert(basicSchema, {}, 'transactions', {
        id: 't1',
        account: 'foo',
        amount: 5,
        date: '1994-12-31',
      });
    }).toThrow('Invalid date: 1994-12-31');

    expect(() => {
      convertForInsert(basicSchema, {}, 'transactions', {
        id: 't1',
        account: 'foo',
        amount: 5,
        date: '1900-01-01',
      });
    }).toThrow('Invalid date: 1900-01-01');
  });

  test('dates on or after 1995-01-01 are accepted', () => {
    const trans = convertForInsert(basicSchema, {}, 'transactions', {
      id: 't1',
      account: 'foo',
      amount: 5,
      date: '1995-01-01',
    });
    expect(trans.date).toBe(19950101);
  });
});
