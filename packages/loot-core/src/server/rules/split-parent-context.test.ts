import { finalizeTransactionForRules } from '#server/transactions/transaction-rules';

import { Rule } from './rule';

function splitRule(formula: string) {
  return new Rule({
    conditionsOp: 'and',
    conditions: [{ field: 'amount', op: 'lt', value: 0 }],
    actions: [
      {
        op: 'set',
        field: 'notes',
        value: 'child notes',
        options: { splitIndex: 1 },
      },
      {
        op: 'set-split-amount',
        field: 'amount',
        value: 0,
        options: { splitIndex: 1, method: 'formula', formula },
      },
      {
        op: 'set-split-amount',
        field: 'amount',
        value: 0,
        options: { splitIndex: 2, method: 'remainder' },
      },
    ],
  });
}

const parent = {
  id: 'parent',
  account: 'source-account',
  payee: 'source-payee',
  amount: -3000,
  notes: 'ITEM: 25.50USD FEE: 4.50USD',
  imported_payee: 'Imported bank',
  imported_id: 'bank-id',
  cleared: true,
  schedule: 'schedule-id',
  date: '2024-01-15',
};

describe('split parent formula context', () => {
  test('reads parent_amount as an amount', () => {
    expect(splitRule('=parent_amount / 2').exec(parent)).toMatchObject({
      subtransactions: [{ amount: -1500 }, { amount: -1500 }],
    });
  });

  test('reads parent notes independently of child notes', () => {
    expect(
      splitRule('=IF(parent_notes="' + parent.notes + '", -1, -2)').exec(
        parent,
      ),
    ).toMatchObject({
      subtransactions: [
        { amount: -100, notes: 'child notes' },
        { amount: -2900 },
      ],
    });
  });

  test('parses a decimal amount from parent notes using native functions', async () => {
    const result = splitRule(
      '=-VALUE(MID(parent_notes, SEARCH("ITEM: ", parent_notes)+6, SEARCH("USD", parent_notes, SEARCH("ITEM: ", parent_notes))-SEARCH("ITEM: ", parent_notes)-6))',
    ).apply(parent);
    expect(result).toMatchObject({
      ...parent,
      payee: null,
      is_parent: true,
      subtransactions: [{ amount: -2550 }, { amount: -450 }],
    });
    const finalized = await finalizeTransactionForRules(result);
    for (const transaction of [finalized, ...finalized.subtransactions]) {
      expect(
        Object.keys(transaction).filter(key => key.startsWith('parent_')),
      ).toEqual(transaction.is_child ? ['parent_id'] : []);
    }
  });

  test.each([
    'parent_imported_payee',
    'parent_payee',
    'parent_account',
  ] as const)('exposes %s without overwriting child fields', field => {
    const original = {
      parent_imported_payee: parent.imported_payee,
      parent_payee: parent.payee,
      parent_account: parent.account,
    };
    expect(
      splitRule(`=IF(${field}="${original[field]}", -1, -2)`).exec(parent),
    ).toMatchObject({
      subtransactions: [{ amount: -100 }, { amount: -2900 }],
    });
  });

  test.each(['=1+1', '00123', '2024-01-15', "'quoted"])(
    'treats parent text %s literally',
    notes => {
      expect(
        splitRule(`=IF(parent_notes="${notes}", -1, -2)`).exec({
          ...parent,
          notes,
        }),
      ).toMatchObject({
        subtransactions: [{ amount: -100 }, { amount: -2900 }],
      });
    },
  );

  test('absent parent text is empty', () => {
    expect(
      splitRule('=IF(parent_notes="", -1, -2)').exec({ amount: -300 }),
    ).toMatchObject({ subtransactions: [{ amount: -100 }, { amount: -200 }] });
  });

  test('re-running a split rule on an already-split transaction does not crash (#9189)', () => {
    // A 50/50 split rule, matching the scenario from the bug report.
    const rule = new Rule({
      conditionsOp: 'and',
      conditions: [{ field: 'amount', op: 'lt', value: 0 }],
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

    // Sanity check: on a plain transaction the rule splits it in two.
    expect(rule.apply(parent)).toMatchObject({
      is_parent: true,
      subtransactions: [{ amount: -1500 }, { amount: -1500 }],
    });

    // Editing the parent's own fields (notes, account, …) re-runs rules
    // against the already-split transaction. This used to throw:
    //   TypeError: undefined is not an object (evaluating
    //   'newTransactions[splitTransactionIndex].parent_amount = ...')
    const alreadySplit = { ...parent, is_parent: true };
    expect(() => rule.apply(alreadySplit)).not.toThrow();

    // A split rule must leave an already-split transaction untouched rather
    // than attempting to re-split it.
    expect(rule.apply(alreadySplit)).not.toHaveProperty('subtransactions');
  });

  test('a second split rule in the same run keeps the first rule split intact', () => {
    // Two split rules matching the same transaction. runRules applies each
    // rule's result in sequence, so the second rule sees the already-split
    // parent produced by the first. It must not re-split it (which would both
    // crash and zero out the amounts) — the first rule's split stands.
    function fiftyFiftySplitRule() {
      return new Rule({
        conditionsOp: 'and',
        conditions: [{ field: 'amount', op: 'lt', value: 0 }],
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
    }

    const afterFirst = fiftyFiftySplitRule().apply(parent);
    expect(afterFirst).toMatchObject({
      is_parent: true,
      subtransactions: [{ amount: -1500 }, { amount: -1500 }],
    });

    const afterSecond = fiftyFiftySplitRule().apply(afterFirst);
    expect(afterSecond).toMatchObject({
      is_parent: true,
      subtransactions: [{ amount: -1500 }, { amount: -1500 }],
    });
  });
});
