// @ts-strict-ignore
import {
  Action,
  Condition,
  iterateIds,
  parseDateString,
  rankRules,
  Rule,
  RuleIndexer,
} from '.';

describe('Condition', () => {
  test('parses date formats correctly', () => {
    expect(parseDateString('2020-08-10')).toEqual({
      type: 'date',
      date: '2020-08-10',
    });
    expect(parseDateString('2020-08')).toEqual({
      type: 'month',
      date: '2020-08',
    });
    expect(parseDateString('2020')).toEqual({
      type: 'year',
      date: '2020',
    });

    // Invalid dates
    expect(parseDateString('2020-0')).toBe(null);
    expect(parseDateString('2020-14-01')).toBe(null);
    expect(parseDateString('2020-05-53')).toBe(null);
  });

  test('ops handles null fields', () => {
    let cond = new Condition('contains', 'notes', 'foo', null);
    expect(cond.eval({ notes: null })).toBe(false);

    cond = new Condition('matches', 'notes', '^fo*$', null);
    expect(cond.eval({ notes: null })).toBe(false);

    cond = new Condition('oneOf', 'imported_payee', ['foo'], null);
    expect(cond.eval({ imported_payee: null })).toBe(false);

    ['gt', 'gte', 'lt', 'lte', 'isapprox'].forEach(op => {
      const cond = new Condition(op, 'date', '2020-01-01', null);
      expect(cond.eval({ date: null })).toBe(false);
    });

    cond = new Condition('is', 'payee', null, null);
    expect(cond.eval({ payee: null })).toBe(true);

    cond = new Condition('is', 'notes', '', null);
    expect(cond.eval({ notes: null })).toBe(true);
  });

  test('ops handles undefined fields', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => null);

    let cond = new Condition('is', 'payee', null, null);
    // null is strict and won't match undefined
    expect(cond.eval({ notes: 'James' })).toBe(false);

    cond = new Condition('contains', 'notes', 'foo', null);
    expect(cond.eval({ date: '2020-01-01' })).toBe(false);

    cond = new Condition('matches', 'notes', '^fo*$', null);
    expect(cond.eval({ date: '2020-01-01' })).toBe(false);

    spy.mockRestore();
  });

  test('date restricts operators for each type', () => {
    expect(() => {
      new Condition('isapprox', 'date', '2020-08', null);
    }).toThrow('Invalid date value for');
    expect(() => {
      new Condition('gt', 'date', '2020-08', null);
    }).toThrow('Invalid date value for');
    expect(() => {
      new Condition('gte', 'date', '2020-08', null);
    }).toThrow('Invalid date value for');
    expect(() => {
      new Condition('lt', 'date', '2020-08', null);
    }).toThrow('Invalid date value for');
    expect(() => {
      new Condition('lte', 'date', '2020-08', null);
    }).toThrow('Invalid date value for');
  });

  test('date conditions work with `is` operator', () => {
    let cond = new Condition('is', 'date', '2020-08-10', null);
    expect(cond.eval({ date: '2020-08-05' })).toBe(false);
    expect(cond.eval({ date: '2020-08-10' })).toBe(true);

    cond = new Condition('is', 'date', '2020-08', null);
    expect(cond.eval({ date: '2020-08-05' })).toBe(true);
    expect(cond.eval({ date: '2020-08-10' })).toBe(true);
    expect(cond.eval({ date: '2020-09-10' })).toBe(false);

    cond = new Condition('is', 'date', '2020', null);
    expect(cond.eval({ date: '2020-08-05' })).toBe(true);
    expect(cond.eval({ date: '2020-08-10' })).toBe(true);
    expect(cond.eval({ date: '2020-09-10' })).toBe(true);
    expect(cond.eval({ date: '2019-09-10' })).toBe(false);

    // Approximate dates
    cond = new Condition('isapprox', 'date', '2020-08-07', null);
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
        patterns: [{ type: 'day', value: 15 }],
      },
      null,
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
        interval: 3,
      },
      null,
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
        patterns: [{ type: 'day', value: 15 }],
      },
      null,
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
    let cond = new Condition('gt', 'date', '2020-08-10', null);
    expect(cond.eval({ date: '2020-08-11' })).toBe(true);
    expect(cond.eval({ date: '2020-08-10' })).toBe(false);

    cond = new Condition('gte', 'date', '2020-08-10', null);
    expect(cond.eval({ date: '2020-08-11' })).toBe(true);
    expect(cond.eval({ date: '2020-08-10' })).toBe(true);
    expect(cond.eval({ date: '2020-08-09' })).toBe(false);

    cond = new Condition('lt', 'date', '2020-08-10', null);
    expect(cond.eval({ date: '2020-08-09' })).toBe(true);
    expect(cond.eval({ date: '2020-08-10' })).toBe(false);

    cond = new Condition('lte', 'date', '2020-08-10', null);
    expect(cond.eval({ date: '2020-08-09' })).toBe(true);
    expect(cond.eval({ date: '2020-08-10' })).toBe(true);
    expect(cond.eval({ date: '2020-08-11' })).toBe(false);
  });

  test('id works with all operators', () => {
    let cond = new Condition('is', 'payee', 'foo', null);
    expect(cond.eval({ payee: 'foo' })).toBe(true);
    expect(cond.eval({ payee: 'FOO' })).toBe(true);
    expect(cond.eval({ payee: 'foo2' })).toBe(false);

    cond = new Condition('oneOf', 'payee', ['foo', 'bar'], null);
    expect(cond.eval({ payee: 'foo' })).toBe(true);
    expect(cond.eval({ payee: 'FOO' })).toBe(true);
    expect(cond.eval({ payee: 'Bar' })).toBe(true);
    expect(cond.eval({ payee: 'bar2' })).toBe(false);
  });

  test('string works with all operators', () => {
    let cond = new Condition('is', 'notes', 'foo', null);
    expect(cond.eval({ notes: 'foo' })).toBe(true);
    expect(cond.eval({ notes: 'FOO' })).toBe(true);
    expect(cond.eval({ notes: 'foo2' })).toBe(false);

    cond = new Condition('oneOf', 'imported_payee', ['foo', 'bar'], null);
    expect(cond.eval({ imported_payee: 'foo' })).toBe(true);
    expect(cond.eval({ imported_payee: 'FOO' })).toBe(true);
    expect(cond.eval({ imported_payee: 'Bar' })).toBe(true);
    expect(cond.eval({ imported_payee: 'bar2' })).toBe(false);

    cond = new Condition('contains', 'notes', 'foo', null);
    expect(cond.eval({ notes: 'bar foo baz' })).toBe(true);
    expect(cond.eval({ notes: 'bar FOOb' })).toBe(true);
    expect(cond.eval({ notes: 'foo' })).toBe(true);
    expect(cond.eval({ notes: 'foob' })).toBe(true);
    expect(cond.eval({ notes: 'bfoo' })).toBe(true);
    expect(cond.eval({ notes: 'bfo' })).toBe(false);
    expect(cond.eval({ notes: 'f o o' })).toBe(false);

    cond = new Condition('matches', 'notes', '^fo*$', null);
    expect(cond.eval({ notes: 'bar foo baz' })).toBe(false);
    expect(cond.eval({ notes: 'bar FOOb' })).toBe(false);
    expect(cond.eval({ notes: 'foo' })).toBe(true);
    expect(cond.eval({ notes: 'FOOOO' })).toBe(true);
    expect(cond.eval({ notes: 'foob' })).toBe(false);
    expect(cond.eval({ notes: 'bfoo' })).toBe(false);
    expect(cond.eval({ notes: 'bfo' })).toBe(false);
    expect(cond.eval({ notes: 'f o o' })).toBe(false);
  });

  test('matches handles invalid regex', () => {
    const cond = new Condition('matches', 'notes', 'fo**', null);
    expect(cond.eval({ notes: 'foo' })).toBe(false);
  });

  test('number validates value', () => {
    new Condition('isapprox', 'amount', 34, null);

    expect(() => {
      new Condition('isapprox', 'amount', 'hello', null);
    }).toThrow('Value must be a number or between amount');

    expect(() => {
      new Condition('is', 'amount', { num1: 0, num2: 10 }, null);
    }).toThrow('Invalid number value for');

    new Condition('isbetween', 'amount', { num1: 0, num2: 10 }, null);

    expect(() => {
      new Condition('isbetween', 'amount', 34.22, null);
    }).toThrow('Invalid between value for');
    expect(() => {
      new Condition('isbetween', 'amount', { num1: 0 }, null);
    }).toThrow('Value must be a number or between amount');
  });

  test('number works with all operators', () => {
    let cond = new Condition('is', 'amount', 155, null);
    expect(cond.eval({ amount: 155 })).toBe(true);
    expect(cond.eval({ amount: 167 })).toBe(false);

    cond = new Condition('isapprox', 'amount', 1535, null);
    expect(cond.eval({ amount: 1540 })).toBe(true);
    expect(cond.eval({ amount: 1300 })).toBe(false);
    expect(cond.eval({ amount: 1650 })).toBe(true);
    expect(cond.eval({ amount: 1800 })).toBe(false);

    cond = new Condition('isbetween', 'amount', { num1: 32, num2: 86 }, null);
    expect(cond.eval({ amount: 30 })).toBe(false);
    expect(cond.eval({ amount: 32 })).toBe(true);
    expect(cond.eval({ amount: 80 })).toBe(true);
    expect(cond.eval({ amount: 86 })).toBe(true);
    expect(cond.eval({ amount: 90 })).toBe(false);

    cond = new Condition('isbetween', 'amount', { num1: -16, num2: -20 }, null);
    expect(cond.eval({ amount: -18 })).toBe(true);
    expect(cond.eval({ amount: -12 })).toBe(false);

    cond = new Condition('gt', 'amount', 1.55, null);
    expect(cond.eval({ amount: 1.55 })).toBe(false);
    expect(cond.eval({ amount: 1.67 })).toBe(true);
    expect(cond.eval({ amount: 1.5 })).toBe(false);

    cond = new Condition('gte', 'amount', 1.55, null);
    expect(cond.eval({ amount: 1.55 })).toBe(true);
    expect(cond.eval({ amount: 1.67 })).toBe(true);
    expect(cond.eval({ amount: 1.5 })).toBe(false);

    cond = new Condition('lt', 'amount', 1.55, null);
    expect(cond.eval({ amount: 1.55 })).toBe(false);
    expect(cond.eval({ amount: 1.67 })).toBe(false);
    expect(cond.eval({ amount: 1.5 })).toBe(true);

    cond = new Condition('lte', 'amount', 1.55, null);
    expect(cond.eval({ amount: 1.55 })).toBe(true);
    expect(cond.eval({ amount: 1.67 })).toBe(false);
    expect(cond.eval({ amount: 1.5 })).toBe(true);
  });
});

describe('Action', () => {
  test('`set` operator sets a field', () => {
    const action = new Action('set', 'notes', 'James', null);
    const item = { notes: 'Sarah' };
    action.exec(item);
    expect(item.notes).toBe('James');

    expect(() => {
      new Action('set', 'foo', 'James', null);
    }).toThrow(/invalid field/i);

    expect(() => {
      new Action(null, 'notes', 'James', null);
    }).toThrow(/invalid action operation/i);
  });

  test('empty account values result in error', () => {
    expect(() => {
      new Action('set', 'account', '', null);
    }).toThrow(/Field cannot be empty/i);
  });

  describe('templating', () => {
    test('should use available fields', () => {
      const action = new Action('set', 'notes', '', {
        template: 'Hey {{notes}}! You just payed {{amount}}',
      });
      const item = { notes: 'Sarah', amount: 10 };
      action.exec(item);
      expect(item.notes).toBe('Hey Sarah! You just payed 10');
    });

    test('should create actions with balance math operations', () => {
      // This test ensures the template validation doesn't fail when using balance
      expect(() => {
        new Action('set', 'notes', '', {
          template: '{{ floor (div (mul balance (div 7.99 100)) 12) }}',
        });
      }).not.toThrow();
    });

    test('should not escape text', () => {
      const action = new Action('set', 'notes', '', {
        template: '{{notes}}',
      });
      const note = 'Sarah !@#$%^&*()<> Special';
      const item = { notes: note };
      action.exec(item);
      expect(item.notes).toBe(note);
    });

    describe('regex helper', () => {
      function testHelper(template: string, expected: unknown) {
        test(template, () => {
          const action = new Action('set', 'notes', '', { template });
          const item = { notes: 'Sarah Condition' };
          action.exec(item);
          expect(item.notes).toBe(expected);
        });
      }

      testHelper('{{regex notes "/[aeuio]/g" "a"}}', 'Sarah Candataan');
      testHelper('{{regex notes "/[aeuio]/" ""}}', 'Srah Condition');
      // capture groups
      testHelper('{{regex notes "/^.+ (.+)$/" "$1"}}', 'Condition');
      // no match
      testHelper('{{regex notes "/Klaas/" "Jantje"}}', 'Sarah Condition');
      // no regex format (/.../flags)
      testHelper('{{regex notes "Sarah" "Jantje"}}', 'Jantje Condition');

      // should not use regex when not in regex format
      testHelper('{{replace notes "[a-z]" "a"}}', 'Sarah Condition');
      // should use regex when in regex format
      testHelper('{{replace notes "/[a-z]/g" "a"}}', 'Saaaa Caaaaaaaa');
      // should replace once with non regex
      testHelper('{{replace notes "a" "b"}}', 'Sbrah Condition');

      // should not use regex when not in regex format
      testHelper('{{replaceAll notes "[a-z]" "a"}}', 'Sarah Condition');
      // should use regex when in regex format
      testHelper('{{replaceAll notes "/[a-z]/g" "a"}}', 'Saaaa Caaaaaaaa');
      // should replace all with non regex
      testHelper('{{replaceAll notes "a" "b"}}', 'Sbrbh Condition');
    });

    describe('math helpers', () => {
      function testHelper(
        template: string,
        expected: unknown,
        field = 'amount',
      ) {
        test(template, () => {
          const action = new Action('set', field, '', { template });
          const item = { [field]: 10 };
          action.exec(item);
          expect(item[field]).toBe(expected);
        });
      }

      testHelper('{{add amount 5}}', 15);
      testHelper('{{add amount 5 10}}', 25);
      testHelper('{{sub amount 5}}', 5);
      testHelper('{{sub amount 5 10}}', -5);
      testHelper('{{mul amount 5}}', 50);
      testHelper('{{mul amount 5 10}}', 500);
      testHelper('{{div amount 5}}', 2);
      testHelper('{{div amount 5 10}}', 0.2);
      testHelper('{{mod amount 3}}', 1);
      testHelper('{{mod amount 6 5}}', 4);
      testHelper('{{floor (div amount 3)}}', 3);
      testHelper('{{ceil (div amount 3)}}', 4);
      testHelper('{{round (div amount 3)}}', 3);
      testHelper('{{round (div amount 4)}}', 3);
      testHelper('{{abs -5}}', 5);
      testHelper('{{abs 5}}', 5);
      testHelper('{{min amount 5 500}}', 5);
      testHelper('{{max amount 5 500}}', 500);
      testHelper('{{fixed (div 10 4) 2}}', '2.50', 'notes');
    });

    describe('date helpers', () => {
      function testHelper(template: string, expected: unknown) {
        test(template, () => {
          const action = new Action('set', 'notes', '', { template });
          const item = { notes: '' };
          action.exec(item);
          expect(item.notes).toBe(expected);
        });
      }

      testHelper('{{day "2002-07-25"}}', '25');
      testHelper('{{month "2002-07-25"}}', '7');
      testHelper('{{year "2002-07-25"}}', '2002');
      testHelper('{{format "2002-07-25" "MM yyyy d"}}', '07 2002 25');
      testHelper('{{day undefined}}', '');
      testHelper('{{month undefined}}', '');
      testHelper('{{year undefined}}', '');
      testHelper('{{day}}', '');
      testHelper('{{month}}', '');
      testHelper('{{year}}', '');
      testHelper('{{format undefined undefined}}', '');
      testHelper('{{format}}', '');
      testHelper('{{addDays "2002-07-25" 5}}', '2002-07-30');
      testHelper('{{addDays}}', '');
      testHelper('{{subDays "2002-07-25" 5}}', '2002-07-20');
      testHelper('{{subDays}}', '');
      testHelper('{{addMonths "2002-07-25" 5}}', '2002-12-25');
      testHelper('{{addMonths}}', '');
      testHelper('{{subMonths "2002-07-25" 5}}', '2002-02-25');
      testHelper('{{subMonths}}', '');
      testHelper('{{addYears "2002-07-25" 5}}', '2007-07-25');
      testHelper('{{addYears}}', '');
      testHelper('{{subYears "2002-07-25" 5}}', '1997-07-25');
      testHelper('{{subYears}}', '');
      testHelper('{{addWeeks "2002-07-25" 1}}', '2002-08-01');
      testHelper('{{addWeeks}}', '');
      testHelper('{{subWeeks "2002-07-25" 1}}', '2002-07-18');
      testHelper('{{subWeeks}}', '');
      testHelper('{{setDay "2002-07-25" 1}}', '2002-07-01');
      testHelper('{{setDay "2002-07-25" 32}}', '2002-08-01');
      testHelper('{{setDay "2002-07-25" 0}}', '2002-06-30');
      testHelper('{{setDay}}', '');
    });

    describe('other helpers', () => {
      function testHelper(template: string, expected: unknown) {
        test(template, () => {
          const action = new Action('set', 'notes', '', { template });
          const item = { notes: '' };
          action.exec(item);
          expect(item.notes).toBe(expected);
        });
      }

      testHelper('{{concat "Sarah" "Trops"}}', 'SarahTrops');
      testHelper('{{concat "Sarah" "Trops" 12 "Wow"}}', 'SarahTrops12Wow');
    });

    test('should have access to balance variable', () => {
      const action = new Action('set', 'notes', '', {
        template: 'Balance: {{balance}}, Amount: {{amount}}',
      });
      const item = { notes: '', amount: 5000, balance: 100000 };
      action.exec(item);
      expect(item.notes).toBe('Balance: 100000, Amount: 5000');
    });

    test('should allow math operations on balance', () => {
      const action = new Action('set', 'notes', '', {
        template: 'New balance: {{add balance amount}}',
      });
      const item = { notes: '', amount: 5000, balance: 100000 };
      action.exec(item);
      expect(item.notes).toBe('New balance: 105000');
    });

    test('should handle undefined balance gracefully in number fields', () => {
      const action = new Action('set', 'amount', '', {
        template: '{{ floor (div (mul balance (div 7.99 100)) 12) }}',
      });
      const item = { amount: 0 }; // No balance field
      action.exec(item);
      // Should default to 0 instead of NaN when balance is undefined
      expect(item.amount).toBe(0);
    });

    test('should calculate with balance in number fields', () => {
      const action = new Action('set', 'amount', '', {
        template: '{{ floor (div (mul balance (div 7.99 100)) 12) }}',
      });
      const item = { amount: 0, balance: 1200 };
      action.exec(item);
      // (1200 * 7.99) / 12 = 7.99 -> floor = 7
      expect(item.amount).toBe(7);
    });

    test('{{debug}} should log the item', () => {
      const action = new Action('set', 'notes', '', {
        template: '{{debug notes}}',
      });
      const item = { notes: 'Sarah' };
      const spy = vi.spyOn(console, 'log').mockImplementation(() => null);
      action.exec(item);
      expect(spy).toHaveBeenCalledWith('Sarah');
      spy.mockRestore();
    });
  });
});

describe('Rule', () => {
  test('executing a rule works', () => {
    let rule = new Rule({
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'notes', value: 'James' }],
      actions: [{ op: 'set', field: 'notes', value: 'Sarah' }],
    });

    // This matches
    expect(rule.exec({ notes: 'James' })).toEqual({ notes: 'Sarah' });
    // It returns updates, not the whole object
    expect(rule.exec({ notes: 'James', date: '2018-10-01' })).toEqual({
      notes: 'Sarah',
    });
    // This does not match
    expect(rule.exec({ notes: 'James2' })).toEqual(null);
    expect(rule.apply({ notes: 'James2' })).toEqual({ notes: 'James2' });

    rule = new Rule({
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'notes', value: 'James' }],
      actions: [
        { op: 'set', field: 'notes', value: 'Sarah' },
        { op: 'set', field: 'category', value: 'Sarah' },
      ],
    });

    expect(rule.exec({ notes: 'James' })).toEqual({
      notes: 'Sarah',
      category: 'Sarah',
    });
    expect(rule.exec({ notes: 'James2' })).toEqual(null);
    expect(rule.apply({ notes: 'James2' })).toEqual({ notes: 'James2' });
  });

  test('rule with `and` conditionsOp evaluates conditions as AND', () => {
    const rule = new Rule({
      conditionsOp: 'and',
      conditions: [
        { op: 'is', field: 'notes', value: 'James' },
        {
          op: 'isapprox',
          field: 'date',
          value: {
            start: '2018-01-12',
            frequency: 'monthly',
            interval: 3,
          },
        },
      ],
      actions: [{ op: 'set', field: 'notes', value: 'Sarah' }],
    });

    expect(rule.exec({ notes: 'James', date: '2018-01-12' })).toEqual({
      notes: 'Sarah',
    });
    expect(rule.exec({ notes: 'James2', date: '2018-01-12' })).toEqual(null);
    expect(rule.exec({ notes: 'James', date: '2018-01-10' })).toEqual({
      notes: 'Sarah',
    });
    expect(rule.exec({ notes: 'James', date: '2018-01-15' })).toEqual(null);
  });

  test('rule with `or` conditionsOp evaluates conditions as OR', () => {
    const rule = new Rule({
      conditionsOp: 'or',
      conditions: [
        { op: 'is', field: 'notes', value: 'James' },
        {
          op: 'isapprox',
          field: 'date',
          value: {
            start: '2018-01-12',
            frequency: 'monthly',
            interval: 3,
          },
        },
      ],
      actions: [{ op: 'set', field: 'notes', value: 'Sarah' }],
    });

    expect(rule.exec({ notes: 'James', date: '2018-01-12' })).toEqual({
      notes: 'Sarah',
    });
    expect(rule.exec({ notes: 'James2', date: '2018-01-12' })).toEqual({
      notes: 'Sarah',
    });
    expect(rule.exec({ notes: 'James', date: '2018-01-10' })).toEqual({
      notes: 'Sarah',
    });
    expect(rule.exec({ notes: 'James', date: '2018-01-15' })).toEqual({
      notes: 'Sarah',
    });
  });

  describe('split actions', () => {
    test('splits can change the payee', () => {
      const rule = new Rule({
        conditionsOp: 'and',
        conditions: [{ op: 'is', field: 'payee', value: '123' }],
        actions: [
          {
            op: 'set-split-amount',
            field: 'amount',
            value: 100,
            options: { splitIndex: 1, method: 'fixed-amount' },
          },
          {
            op: 'set',
            field: 'payee',
            value: '456',
            options: { splitIndex: 1 },
          },
        ],
      });

      expect(rule.exec({ payee: '123' })).toMatchObject({
        subtransactions: [{ payee: '456' }],
      });
    });

    const fixedAmountRule = new Rule({
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'imported_payee', value: 'James' }],
      actions: [
        {
          op: 'set-split-amount',
          field: 'amount',
          value: 100,
          options: { splitIndex: 1, method: 'fixed-amount' },
        },
        {
          op: 'set-split-amount',
          field: 'amount',
          value: 100,
          options: { splitIndex: 2, method: 'fixed-amount' },
        },
      ],
    });

    test('basic fixed-amount', () => {
      expect(
        fixedAmountRule.exec({ imported_payee: 'James', amount: 200 }),
      ).toMatchObject({
        subtransactions: [{ amount: 100 }, { amount: 100 }],
      });
    });

    test('basic fixed-percent', () => {
      const rule = new Rule({
        conditionsOp: 'and',
        conditions: [{ op: 'is', field: 'imported_payee', value: 'James' }],
        actions: [
          {
            op: 'set-split-amount',
            field: 'amount',
            value: 50,
            options: { splitIndex: 1, method: 'fixed-percent' },
          },
          {
            op: 'set-split-amount',
            field: 'amount',
            value: 50,
            options: { splitIndex: 2, method: 'fixed-percent' },
          },
        ],
      });

      expect(rule.exec({ imported_payee: 'James', amount: 200 })).toMatchObject(
        {
          subtransactions: [{ amount: 100 }, { amount: 100 }],
        },
      );
    });

    test('basic remainder', () => {
      const rule = new Rule({
        conditionsOp: 'and',
        conditions: [{ op: 'is', field: 'imported_payee', value: 'James' }],
        actions: [
          {
            op: 'set-split-amount',
            field: 'amount',
            options: { splitIndex: 1, method: 'remainder' },
          },
          {
            op: 'set-split-amount',
            field: 'amount',
            options: { splitIndex: 2, method: 'remainder' },
          },
        ],
      });

      expect(rule.exec({ imported_payee: 'James', amount: 200 })).toMatchObject(
        {
          subtransactions: [{ amount: 100 }, { amount: 100 }],
        },
      );
    });

    const prioritizationRule = new Rule({
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'imported_payee', value: 'James' }],
      actions: [
        {
          op: 'set-split-amount',
          field: 'amount',
          value: 100,
          options: { splitIndex: 1, method: 'fixed-amount' },
        },
        {
          op: 'set-split-amount',
          field: 'amount',
          value: 50,
          options: { splitIndex: 2, method: 'fixed-percent' },
        },
        {
          op: 'set-split-amount',
          field: 'amount',
          options: { splitIndex: 3, method: 'remainder' },
        },
      ],
    });

    test('percent is of the post-fixed-amount total', () => {
      // Percent is a percent of the amount pre-remainder
      expect(
        prioritizationRule.exec({ imported_payee: 'James', amount: 200 }),
      ).toMatchObject({
        subtransactions: [{ amount: 100 }, { amount: 50 }, { amount: 50 }],
      });
    });

    test('remainder/percent goes negative if less than expected after fixed amounts', () => {
      // Remainder/percent goes negative if less than expected after fixed amounts
      expect(
        prioritizationRule.exec({ imported_payee: 'James', amount: 50 }),
      ).toMatchObject({
        subtransactions: [{ amount: 100 }, { amount: -25 }, { amount: -25 }],
      });
    });

    test('remainder zeroes out if nothing left', () => {
      const rule = new Rule({
        conditionsOp: 'and',
        conditions: [{ op: 'is', field: 'imported_payee', value: 'James' }],
        actions: [
          {
            op: 'set-split-amount',
            field: 'amount',
            value: 100,
            options: { splitIndex: 1, method: 'fixed-amount' },
          },
          {
            op: 'set-split-amount',
            field: 'amount',
            value: 100,
            options: { splitIndex: 2, method: 'fixed-percent' },
          },
          {
            op: 'set-split-amount',
            field: 'amount',
            options: { splitIndex: 3, method: 'remainder' },
          },
        ],
      });

      expect(rule.exec({ imported_payee: 'James', amount: 150 })).toMatchObject(
        {
          subtransactions: [{ amount: 100 }, { amount: 50 }, { amount: 0 }],
        },
      );
    });

    test('remainder rounds correctly and only if necessary', () => {
      const rule = new Rule({
        conditionsOp: 'and',
        conditions: [{ op: 'is', field: 'imported_payee', value: 'James' }],
        actions: [
          {
            op: 'set-split-amount',
            field: 'amount',
            options: { splitIndex: 1, method: 'remainder' },
          },
          {
            op: 'set-split-amount',
            field: 'amount',
            options: { splitIndex: 2, method: 'remainder' },
          },
        ],
      });

      expect(
        rule.exec({ imported_payee: 'James', amount: -2397 }),
      ).toMatchObject({
        subtransactions: [{ amount: -1198 }, { amount: -1199 }],
      });

      expect(rule.exec({ imported_payee: 'James', amount: 123 })).toMatchObject(
        {
          subtransactions: [{ amount: 62 }, { amount: 61 }],
        },
      );

      expect(rule.exec({ imported_payee: 'James', amount: 100 })).toMatchObject(
        {
          subtransactions: [{ amount: 50 }, { amount: 50 }],
        },
      );
    });

    test('generate errors when fixed amounts exceed the total', () => {
      expect(
        fixedAmountRule.exec({ imported_payee: 'James', amount: 100 }),
      ).toMatchObject({
        error: {
          difference: -100,
          type: 'SplitTransactionError',
          version: 1,
        },
        subtransactions: [{ amount: 100 }, { amount: 100 }],
      });
    });

    test('generate errors when fixed amounts undershoot the total', () => {
      expect(
        fixedAmountRule.exec({ imported_payee: 'James', amount: 300 }),
      ).toMatchObject({
        error: {
          difference: 100,
          type: 'SplitTransactionError',
          version: 1,
        },
        subtransactions: [{ amount: 100 }, { amount: 100 }],
      });
    });
  });

  test('rules are deterministically ranked', () => {
    const rule = (id, conditions) =>
      new Rule({
        id,
        conditionsOp: 'and',
        conditions,
        actions: [],
      });
    const expectOrder = (rules, ids) =>
      expect(rules.map(r => r.getId())).toEqual(ids);

    let rules = [
      rule('id1', [{ op: 'contains', field: 'notes', value: 'sar' }]),
      rule('id2', [{ op: 'contains', field: 'notes', value: 'jim' }]),
      rule('id3', [{ op: 'is', field: 'notes', value: 'James' }]),
    ];

    expectOrder(rankRules(rules), ['id1', 'id2', 'id3']);

    rules = [
      rule('id1', [{ op: 'contains', field: 'notes', value: 'sar' }]),
      rule('id2', [
        { op: 'oneOf', field: 'imported_payee', value: ['jim', 'sar'] },
      ]),
      rule('id3', [{ op: 'is', field: 'notes', value: 'James' }]),
      rule('id4', [
        { op: 'is', field: 'notes', value: 'James' },
        { op: 'gt', field: 'amount', value: 5 },
      ]),
      rule('id5', [
        { op: 'is', field: 'notes', value: 'James' },
        { op: 'gt', field: 'amount', value: 5 },
        { op: 'lt', field: 'amount', value: 10 },
      ]),
    ];
    expectOrder(rankRules(rules), ['id1', 'id4', 'id5', 'id2', 'id3']);
  });

  test('iterateIds finds all the ids', () => {
    const rule = (id, conditions, actions = []) =>
      new Rule({ id, conditionsOp: 'and', conditions, actions });

    const rules = [
      rule(
        'first',
        [{ op: 'is', field: 'payee', value: 'id1' }],
        [{ op: 'set', field: 'notes', value: 'sar' }],
      ),
      rule('second', [{ op: 'oneOf', field: 'payee', value: ['id2', 'id3'] }]),
      rule(
        'third',
        [{ op: 'is', field: 'notes', value: 'James' }],
        [{ op: 'set', field: 'payee', value: 'id3' }],
      ),
      rule('fourth', [
        { op: 'is', field: 'notes', value: 'James' },
        { op: 'gt', field: 'amount', value: 5 },
      ]),
      rule('fifth', [
        { op: 'is', field: 'category', value: 'id5' },
        { op: 'gt', field: 'amount', value: 5 },
        { op: 'lt', field: 'amount', value: 10 },
      ]),
    ];

    const foundRules = [];
    iterateIds(rules, 'payee', rule => {
      foundRules.push(rule.getId());
    });
    expect(foundRules).toEqual(['first', 'second', 'second', 'third']);
  });
});

describe('RuleIndexer', () => {
  test('indexing a single field works', () => {
    const indexer = new RuleIndexer({ field: 'notes' });

    const rule = new Rule({
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'notes', value: 'James' }],
      actions: [{ op: 'set', field: 'notes', value: 'Sarah' }],
    });
    indexer.index(rule);

    const rule2 = new Rule({
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'category', value: 'foo' }],
      actions: [{ op: 'set', field: 'notes', value: 'Sarah' }],
    });
    indexer.index(rule2);

    // rule2 always gets returned because it's not indexed and always
    // needs to be run
    expect(indexer.getApplicableRules({ notes: 'James' })).toEqual(
      new Set([rule, rule2]),
    );
    expect(indexer.getApplicableRules({ notes: 'James2' })).toEqual(
      new Set([rule2]),
    );
    expect(indexer.getApplicableRules({ amount: 15 })).toEqual(
      new Set([rule2]),
    );
  });

  test('indexing using the firstchar method works', () => {
    // A condition that references both of the fields
    const indexer = new RuleIndexer({ field: 'category', method: 'firstchar' });
    const rule = new Rule({
      conditionsOp: 'and',
      conditions: [
        { op: 'is', field: 'notes', value: 'James' },
        { op: 'is', field: 'category', value: 'food' },
      ],
      actions: [{ op: 'set', field: 'notes', value: 'Sarah' }],
    });
    indexer.index(rule);

    const rule2 = new Rule({
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'category', value: 'bars' }],
      actions: [{ op: 'set', field: 'notes', value: 'Sarah' }],
    });
    indexer.index(rule2);

    const rule3 = new Rule({
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'date', value: '2020-01-20' }],
      actions: [{ op: 'set', field: 'notes', value: 'Sarah' }],
    });
    indexer.index(rule3);

    expect(indexer.rules.size).toBe(3);
    expect(indexer.rules.get('f').size).toBe(1);
    expect(indexer.rules.get('b').size).toBe(1);
    expect(indexer.rules.get('*').size).toBe(1);

    expect(
      indexer.getApplicableRules({ notes: 'James', category: 'food' }),
    ).toEqual(new Set([rule, rule3]));
    expect(
      indexer.getApplicableRules({ notes: 'James', category: 'f' }),
    ).toEqual(new Set([rule, rule3]));
    expect(
      indexer.getApplicableRules({ notes: 'James', category: 'foo' }),
    ).toEqual(new Set([rule, rule3]));
    expect(
      indexer.getApplicableRules({ notes: 'James', category: 'bars' }),
    ).toEqual(new Set([rule2, rule3]));
    expect(indexer.getApplicableRules({ notes: 'James' })).toEqual(
      new Set([rule3]),
    );
  });

  test('re-indexing a field works', () => {
    const indexer = new RuleIndexer({ field: 'category', method: 'firstchar' });

    let rule = new Rule({
      id: 'id1',
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'category', value: 'food' }],
      actions: [{ op: 'set', field: 'notes', value: 'Sarah' }],
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
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'category', value: 'alcohol' }],
      actions: [{ op: 'set', field: 'notes', value: 'Sarah' }],
    });
    indexer.index(rule);

    expect(indexer.rules.get('f').size).toBe(0);
    expect(indexer.rules.get('a').size).toBe(1);
    expect(indexer.getApplicableRules({ category: 'alco' }).size).toBe(1);
    expect(indexer.getApplicableRules({ category: 'food' }).size).toBe(0);
  });

  test('indexing works with the oneOf operator', () => {
    const indexer = new RuleIndexer({
      field: 'imported_payee',
      method: 'firstchar',
    });

    const rule = new Rule({
      conditionsOp: 'and',
      conditions: [
        {
          op: 'oneOf',
          field: 'imported_payee',
          value: ['James', 'Sarah', 'Evy'],
        },
      ],
      actions: [{ op: 'set', field: 'category', value: 'Food' }],
    });
    indexer.index(rule);

    const rule2 = new Rule({
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'imported_payee', value: 'Georgia' }],
      actions: [{ op: 'set', field: 'category', value: 'Food' }],
    });
    indexer.index(rule2);

    expect(indexer.getApplicableRules({ imported_payee: 'James' })).toEqual(
      new Set([rule]),
    );
    expect(indexer.getApplicableRules({ imported_payee: 'Evy' })).toEqual(
      new Set([rule]),
    );
    expect(indexer.getApplicableRules({ imported_payee: 'Charlotte' })).toEqual(
      new Set([]),
    );
    expect(indexer.getApplicableRules({ imported_payee: 'Georgia' })).toEqual(
      new Set([rule2]),
    );
  });
});
