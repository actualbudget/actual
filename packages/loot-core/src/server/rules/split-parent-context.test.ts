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
  test('keeps parent_amount in cents', () => {
    expect(
      splitRule('=INTEGER_TO_AMOUNT(parent_amount) / 2').exec(parent),
    ).toMatchObject({
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
});
