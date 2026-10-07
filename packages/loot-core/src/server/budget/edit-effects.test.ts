import * as db from '#server/db';

import { editEffects } from './edit-effects';

const date = '2026-03-10';

function budget(month: number, category: string, amount: number) {
  return db.runQuery(
    `INSERT INTO ${tableName()} (id, month, category, amount) VALUES (?, ?, ?, ?)`,
    [`${month}-${category}`, month, category, amount],
  );
}

let tracking = false;
const tableName = () => (tracking ? 'reflect_budgets' : 'zero_budgets');

beforeEach(async () => {
  await global.emptyDatabase()();
  tracking = false;
  await db.insertAccount({ id: 'usd', name: 'Checking' });
  await db.insertAccount({ id: 'usd2', name: 'Savings' });
  await db.insertAccount({ id: 'off', name: 'Brokerage', offbudget: 1 });
  await db.insertCategoryGroup({ id: 'g', name: 'Group' });
  await db.insertCategoryGroup({ id: 'ig', name: 'Income', is_income: 1 });
  await db.insertCategory({ id: 'food', name: 'Food', cat_group: 'g' });
  await db.insertCategory({ id: 'fun', name: 'Fun', cat_group: 'g' });
  await db.insertCategory({
    id: 'salary',
    name: 'Salary',
    cat_group: 'ig',
    is_income: 1,
  });
});

const side = (
  fields: Partial<Parameters<typeof editEffects>[0]['rows'][0]['before']> = {},
) => ({
  account: 'usd',
  category: 'food',
  date,
  amount: -1000,
  ...fields,
});

describe('budget effects of dialog saves', () => {
  it('reports nothing for unbudgeted months', async () => {
    expect(
      await editEffects({
        rows: [{ before: side(), after: side({ amount: -1250 }) }],
      }),
    ).toEqual([]);
  });

  it.each([false, true])(
    'reports spending and income changes in a budgeted month (tracking %s)',
    async isTracking => {
      tracking = isTracking;
      if (tracking) {
        await db.update('preferences', { id: 'budgetType', value: 'tracking' });
      }
      budget(202603, 'food', 5000);
      expect(
        await editEffects({
          rows: [
            { before: side(), after: side({ amount: -1250 }) },
            {
              before: side({ category: 'salary', amount: 50000 }),
              after: side({ category: 'salary', amount: 40000 }),
            },
            { before: null, after: side({ category: null, amount: -100 }) },
          ],
        }),
      ).toEqual([
        {
          month: '2026-03',
          effects: [
            { category: 'food', name: 'Food', kind: 'spending', amount: -250 },
            {
              category: 'salary',
              name: 'Salary',
              kind: 'income',
              amount: -10000,
            },
            {
              category: null,
              name: null,
              kind: 'uncategorized',
              amount: -100,
            },
          ],
        },
      ]);
    },
  );

  it('shows both months of a date move and a category change', async () => {
    budget(202603, 'food', 5000);
    budget(202604, 'food', 5000);
    expect(
      await editEffects({
        rows: [
          {
            before: side(),
            after: side({ date: '2026-04-02', category: 'fun' }),
          },
        ],
      }),
    ).toEqual([
      {
        month: '2026-03',
        effects: [
          { category: 'food', name: 'Food', kind: 'spending', amount: 1000 },
        ],
      },
      {
        month: '2026-04',
        effects: [
          { category: 'fun', name: 'Fun', kind: 'spending', amount: -1000 },
        ],
      },
    ]);
  });

  it('counts postings: split parents and internal transfers post nothing', async () => {
    budget(202603, 'food', 5000);
    budget(202604, 'food', 5000);
    expect(
      await editEffects({
        rows: [
          // A categorized transaction becoming a split parent with children.
          { before: side(), after: side({ category: null, isParent: true }) },
          { before: null, after: side({ amount: -600 }) },
          { before: null, after: side({ category: 'fun', amount: -400 }) },
          // An on-budget transfer whose legs fall in different months.
          {
            before: side({ category: null, transferAccount: 'usd2' }),
            after: side({
              category: null,
              amount: -1100,
              transferAccount: 'usd2',
            }),
          },
          {
            before: side({
              account: 'usd2',
              category: null,
              date: '2026-04-01',
              amount: 1000,
              transferAccount: 'usd',
            }),
            after: side({
              account: 'usd2',
              category: null,
              date: '2026-04-01',
              amount: 1100,
              transferAccount: 'usd',
            }),
          },
        ],
      }),
    ).toEqual([
      {
        month: '2026-03',
        // Food: -1000 before, -600 after; Fun: -400 after.
        effects: [
          { category: 'food', name: 'Food', kind: 'spending', amount: 400 },
          { category: 'fun', name: 'Fun', kind: 'spending', amount: -400 },
        ],
      },
    ]);
  });

  it('counts the on-budget leg of a budget-boundary move and ignores off-budget rows', async () => {
    budget(202603, 'food', 5000);
    expect(
      await editEffects({
        rows: [
          { before: side(), after: side({ account: 'off' }) },
          {
            before: side({ category: 'food', transferAccount: 'off' }),
            after: side({
              category: 'food',
              amount: -1200,
              transferAccount: 'off',
            }),
          },
        ],
      }),
    ).toEqual([
      {
        month: '2026-03',
        effects: [
          { category: 'food', name: 'Food', kind: 'spending', amount: 800 },
        ],
      },
    ]);
  });

  it('ignores assignments kept for deleted categories', async () => {
    budget(202603, 'food', 5000);
    await db.deleteCategory({ id: 'food' }, 'fun');
    expect(
      await editEffects({
        rows: [{ before: side(), after: side({ amount: -1500 }) }],
      }),
    ).toEqual([]);
  });

  it('reads categories through mappings', async () => {
    budget(202603, 'fun', 5000);
    await db.deleteCategory({ id: 'food' }, 'fun');
    expect(
      await editEffects({
        rows: [{ before: side(), after: side({ amount: -1500 }) }],
      }),
    ).toEqual([
      {
        month: '2026-03',
        effects: [
          { category: 'fun', name: 'Fun', kind: 'spending', amount: -500 },
        ],
      },
    ]);
  });
});
