// @ts-strict-ignore
import { aqlQuery } from '..';
import { q } from '../../../shared/query';
import * as budgetActions from '../../budget/actions';
import { createAllBudgets } from '../../budget/base';
import * as db from '../../db';
import * as sheet from '../../sheet';

beforeEach(() => {
  return global.emptyDatabase()();
});

async function setupBudget() {
  await sheet.loadSpreadsheet(db);

  await db.insertCategoryGroup({ id: 'group1', name: 'Group 1' });
  await db.insertCategoryGroup({
    id: 'group2',
    name: 'Income',
    is_income: 1,
  });

  await db.insertCategory({
    id: 'cat1',
    name: 'Cat 1',
    cat_group: 'group1',
  });
  await db.insertCategory({
    id: 'cat2',
    name: 'Cat 2',
    cat_group: 'group1',
  });
  await db.insertCategory({
    id: 'cat3',
    name: 'Income Cat',
    cat_group: 'group2',
    is_income: 1,
  });

  await createAllBudgets();
  await sheet.waitOnSpreadsheet();
}

const TEST_MONTH = '2017-01';

describe('Budget executor', () => {
  it('returns budget rows for a specific month', async () => {
    await setupBudget();

    const { data } = await aqlQuery(
      q('budget')
        .filter({ month: TEST_MONTH })
        .select('*'),
    );
    expect(data.length).toBeGreaterThan(0);

    const row = data[0];
    expect(row).toHaveProperty('id');
    expect(row).toHaveProperty('month');
    expect(row).toHaveProperty('category');
    expect(row).toHaveProperty('category_name');
    expect(row).toHaveProperty('group');
    expect(row).toHaveProperty('group_name');
    expect(row).toHaveProperty('is_income');
    expect(row).toHaveProperty('budgeted');
    expect(row).toHaveProperty('spent');
    expect(row).toHaveProperty('leftover');
    expect(row).toHaveProperty('carryover');
  });

  it('filters by month range', async () => {
    await setupBudget();

    const { data } = await aqlQuery(
      q('budget')
        .filter({ month: { $gte: '2017-01', $lte: '2017-02' } })
        .select(['month', 'category']),
    );

    expect(data.length).toBeGreaterThan(0);
    const months = new Set(data.map(r => r.month));
    for (const m of months) {
      expect(['2017-01', '2017-02']).toContain(m);
    }
  });

  it('filters by category', async () => {
    await setupBudget();

    const { data } = await aqlQuery(
      q('budget')
        .filter({ month: TEST_MONTH, category: 'cat1' })
        .select(['category', 'category_name']),
    );

    expect(data.length).toBe(1);
    expect(data[0].category).toBe('cat1');
    expect(data[0].category_name).toBe('Cat 1');
  });

  it('selects specific fields', async () => {
    await setupBudget();

    const { data } = await aqlQuery(
      q('budget')
        .filter({ month: TEST_MONTH })
        .select(['month', 'category_name', 'budgeted', 'spent']),
    );

    expect(data.length).toBeGreaterThan(0);
    const keys = Object.keys(data[0]);
    expect(keys).toContain('month');
    expect(keys).toContain('category_name');
    expect(keys).toContain('budgeted');
    expect(keys).toContain('spent');
  });

  it('reads budgeted amounts', async () => {
    await setupBudget();

    await budgetActions.setBudget({
      category: 'cat1',
      month: TEST_MONTH,
      amount: 1000,
    });
    await sheet.waitOnSpreadsheet();

    const { data } = await aqlQuery(
      q('budget')
        .filter({ month: TEST_MONTH, category: 'cat1' })
        .select(['budgeted']),
    );

    expect(data.length).toBe(1);
    expect(data[0].budgeted).toBe(1000);
  });

  it('limits results', async () => {
    await setupBudget();

    const { data } = await aqlQuery(
      q('budget')
        .filter({ month: TEST_MONTH })
        .select('*')
        .limit(2),
    );
    expect(data.length).toBeLessThanOrEqual(2);
  });

  it('throws descriptive error when spreadsheet not initialized', async () => {
    const { error } = await aqlQuery(q('budget').select('*'));
    expect(error).toBeDefined();
    expect(error?.type).toBe('runtime-error');
    expect(error?.message).toContain('Budget data is not available');
  });
});
