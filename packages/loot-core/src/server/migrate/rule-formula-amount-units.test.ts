import { beforeEach, describe, expect, it } from 'vitest';

import runMigration, {
  convertRuleFormulaCentsToAmounts,
} from '#migrations/1786562404665_rule_formula_amount_units';
import * as db from '#server/db';
import { Action } from '#server/rules/action';

beforeEach(async () => {
  // oxlint-disable-next-line typescript/no-explicit-any
  await (global as any).emptyDatabase()();
});

function insertRule(id: string, actions: unknown) {
  db.runQuery(
    'INSERT INTO rules (id, stage, conditions, actions) VALUES (?, ?, ?, ?)',
    [
      id,
      null,
      '[]',
      typeof actions === 'string' ? actions : JSON.stringify(actions),
    ],
  );
}

function getActions(id: string): string {
  const [row] = db.runQuery<{ actions: string }>(
    'SELECT actions FROM rules WHERE id = ?',
    [id],
    true,
  );
  return row.actions;
}

async function runIt() {
  await runMigration({
    runQuery: db.runQuery,
    execQuery: db.execQuery,
    transaction: db.transaction,
  });
}

describe('rule formula amount units migration', () => {
  it('rewrites formulas so they keep producing the same result', async () => {
    insertRule('rule-1', [
      {
        op: 'set',
        field: 'notes',
        value: null,
        options: { formula: '=CONCATENATE("Fee: ", amount / 100 * 0.05)' },
      },
      {
        op: 'set-split-amount',
        field: 'amount',
        value: 0,
        options: {
          splitIndex: 1,
          method: 'formula',
          formula: '=BALANCE_OF("Savings") / 100',
        },
      },
    ]);

    await runIt();

    expect(JSON.parse(getActions('rule-1'))).toMatchObject([
      {
        options: {
          formula: '=CONCATENATE("Fee: ", (amount * 100) / 100 * 0.05)',
        },
      },
      { options: { formula: '=(BALANCE_OF("Savings") * 100) / 100' } },
    ]);
  });

  it('leaves rules without formulas untouched', async () => {
    const actions = JSON.stringify([
      { op: 'set', field: 'notes', value: 'amount', options: null },
      { op: 'prepend-notes', field: 'notes', value: 'balance ' },
    ]);
    insertRule('rule-2', actions);

    await runIt();

    expect(getActions('rule-2')).toBe(actions);
  });

  it('skips rules whose actions cannot be parsed', async () => {
    insertRule('rule-3', 'not json');
    insertRule('rule-4', [
      {
        op: 'set',
        field: 'amount',
        value: null,
        options: { formula: '=amount' },
      },
    ]);

    await expect(runIt()).resolves.toBeUndefined();

    expect(getActions('rule-3')).toBe('not json');
    expect(JSON.parse(getActions('rule-4'))).toMatchObject([
      { options: { formula: '=(amount * 100)' } },
    ]);
  });
});

describe('convertRuleFormulaCentsToAmounts', () => {
  it('wraps the monetary variables', () => {
    expect(convertRuleFormulaCentsToAmounts('=amount / 100')).toBe(
      '=(amount * 100) / 100',
    );
    expect(convertRuleFormulaCentsToAmounts('=balance + amount')).toBe(
      '=(balance * 100) + (amount * 100)',
    );
  });

  it('treats parent_amount as its own variable', () => {
    expect(convertRuleFormulaCentsToAmounts('=parent_amount * 0.5')).toBe(
      '=(parent_amount * 100) * 0.5',
    );
  });

  it('wraps BALANCE_OF calls without touching the account literal', () => {
    expect(convertRuleFormulaCentsToAmounts('=BALANCE_OF("Savings") + 1')).toBe(
      '=(BALANCE_OF("Savings") * 100) + 1',
    );
    expect(
      convertRuleFormulaCentsToAmounts(String.raw`=BALANCE_OF("a\"b")`),
    ).toBe(String.raw`=(BALANCE_OF("a\"b") * 100)`);
  });

  it('leaves BALANCE_OF alone when the argument is not a literal', () => {
    // It resolves to 0 either way, and 0 means the same in both units
    expect(convertRuleFormulaCentsToAmounts('=BALANCE_OF(account_name)')).toBe(
      '=BALANCE_OF(account_name)',
    );
  });

  it('ignores variable names inside string literals', () => {
    expect(
      convertRuleFormulaCentsToAmounts('=CONCATENATE("amount: ", amount)'),
    ).toBe('=CONCATENATE("amount: ", (amount * 100))');
    expect(convertRuleFormulaCentsToAmounts('=BALANCE_OF("balance")')).toBe(
      '=(BALANCE_OF("balance") * 100)',
    );
  });

  it('does not run past an unterminated string literal', () => {
    expect(convertRuleFormulaCentsToAmounts('=amount & "oops')).toBe(
      '=(amount * 100) & "oops',
    );
  });

  it('matches variable names case-insensitively and keeps their casing', () => {
    expect(convertRuleFormulaCentsToAmounts('=AMOUNT + Balance')).toBe(
      '=(AMOUNT * 100) + (Balance * 100)',
    );
  });

  it('does not touch function names containing a variable name', () => {
    expect(convertRuleFormulaCentsToAmounts('=INTEGER_TO_AMOUNT(amount)')).toBe(
      '=INTEGER_TO_AMOUNT((amount * 100))',
    );
  });

  it('leaves anything that is not a formula alone', () => {
    expect(convertRuleFormulaCentsToAmounts('amount')).toBe('amount');
    expect(convertRuleFormulaCentsToAmounts('')).toBe('');
  });

  it('preserves what the old cents-based formulas produced', () => {
    const action = new Action('set', 'notes', null, {});
    const transaction = {
      amount: -4567,
      balance: 120000,
      _balanceOfPrefetched: new Map([['Savings', 50000]]),
    };

    // What each formula meant before amounts replaced integers
    const cases: Array<[string, unknown]> = [
      ['=amount / 100', -45.67],
      ['=ROUND(balance / 100 * 0.05, 2)', 60],
      ['=BALANCE_OF("Savings") / 100', 500],
      ['=IF(ABS(amount) > 1000, "big", "small")', 'big'],
    ];

    for (const [formula, expected] of cases) {
      expect(
        action.executeFormulaSync(
          convertRuleFormulaCentsToAmounts(formula),
          transaction,
        ),
      ).toBe(expected);
    }
  });
});
