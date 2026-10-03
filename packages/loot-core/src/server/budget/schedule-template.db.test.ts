import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { createSchedule, updateSchedule } from '#server/schedules/app';
import { loadRules } from '#server/transactions/transaction-rules';
import type { Currency } from '#shared/currencies';
import * as monthUtils from '#shared/months';
import type { CategoryEntity } from '#types/models';

import { runScheduleForecast } from './schedule-template';

// Runs the forecast against a real database, so the transaction queries go
// through the real AQL compiler rather than a mock that interprets their
// filters itself.

vi.mock('#shared/months', async () => {
  const actualModule =
    await vi.importActual<typeof monthUtils>('#shared/months');
  return { ...actualModule, currentDay: vi.fn(actualModule.currentDay) };
});

const currency: Currency = {
  code: '',
  symbol: '',
  name: '',
  decimalPlaces: 2,
  numberFormat: 'comma-dot',
  symbolFirst: false,
};

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  await loadRules();
});

afterEach(() => {
  vi.mocked(monthUtils.currentDay).mockReset();
});

async function setUpRent() {
  const account = await db.insertAccount({
    name: 'Checking',
    offbudget: 0,
    closed: 0,
  });
  const group = await db.insertCategoryGroup({ name: 'Bills' });
  const categoryId = await db.insertCategory({
    name: 'Rent',
    cat_group: group,
  });
  const category = { id: categoryId, name: 'Rent' } as CategoryEntity;
  const scheduleId = await createSchedule({
    schedule: { name: 'Rent' },
    conditions: [
      { op: 'is', field: 'account', value: account },
      { op: 'is', field: 'amount', value: -10000 },
      {
        op: 'is',
        field: 'date',
        value: {
          start: '2024-01-25',
          frequency: 'monthly',
          interval: 1,
          patterns: [],
          skipWeekend: false,
          weekendSolveMode: 'after',
          endMode: 'never',
        },
      },
    ],
  });
  const payRent = (date: string) =>
    db.insertTransaction({
      account,
      amount: -10000,
      date,
      category: categoryId,
      schedule: scheduleId,
    });
  const template = {
    type: 'schedule',
    name: 'Rent',
    scheduleId,
    priority: 0,
    directive: 'template',
  } as const;
  return { category, payRent, template };
}

async function setUpOneTimeBills() {
  const account = await db.insertAccount({
    name: 'Checking',
    offbudget: 0,
    closed: 0,
  });
  const group = await db.insertCategoryGroup({ name: 'Bills' });
  const categoryId = await db.insertCategory({
    name: 'Annual bills',
    cat_group: group,
  });
  const category = { id: categoryId, name: 'Annual bills' } as CategoryEntity;
  const bills = [
    { name: 'Bill A', date: '2026-10-01', amount: -10000 },
    { name: 'Bill B', date: '2026-11-01', amount: -9000 },
  ];
  const templates = [];
  const scheduleIds: Record<string, string> = {};
  for (const bill of bills) {
    const scheduleId = await createSchedule({
      schedule: { name: bill.name },
      conditions: [
        { op: 'is', field: 'account', value: account },
        { op: 'is', field: 'amount', value: bill.amount },
        { op: 'is', field: 'date', value: bill.date },
      ],
    });
    scheduleIds[bill.name] = scheduleId;
    templates.push({
      type: 'schedule',
      name: bill.name,
      scheduleId,
      priority: 0,
      directive: 'template',
    } as const);
  }
  const payBill = (
    name: string,
    date: string,
    amount: number,
    fromCategory: string = categoryId,
  ) =>
    db.insertTransaction({
      account,
      amount,
      date,
      category: fromCategory,
      schedule: scheduleIds[name],
    });
  const otherCategoryId = await db.insertCategory({
    name: 'Other bills',
    cat_group: group,
  });
  return { category, otherCategoryId, payBill, templates, scheduleIds };
}

describe('runScheduleForecast against a real database', () => {
  it('ignores payments dated after today when re-running a past month', async () => {
    // Sep 15, re-running June. June's rent posted in June; September's and
    // October's are already entered with future dates. Only June's belongs
    // to June's budget.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2024-09-15');
    const { category, payRent, template } = await setUpRent();
    await payRent('2024-06-25');
    await payRent('2024-09-25');
    await payRent('2024-10-25');

    const result = await runScheduleForecast(
      [template],
      '2024-06',
      0,
      0,
      0,
      [],
      category,
      currency,
    );

    expect(result.to_budget).toBe(10000);
  });

  it('ignores future-dated payments when budgeting the current month', async () => {
    vi.mocked(monthUtils.currentDay).mockReturnValue('2024-09-15');
    const { category, payRent, template } = await setUpRent();
    await payRent('2024-09-25');
    await payRent('2024-10-25');

    const result = await runScheduleForecast(
      [template],
      '2024-09',
      0,
      0,
      0,
      [],
      category,
      currency,
    );

    expect(result.to_budget).toBe(10000);
  });

  it('reserves an unposted one-time bill from an earlier month when budgeting ahead', async () => {
    // Sep 22, budgeting November. Bill A ($100, Oct 1) hasn't posted, so
    // the $153.34 carried into November still has to pay it, leaving
    // $53.34 toward Bill B ($90, Nov 1).
    vi.mocked(monthUtils.currentDay).mockReturnValue('2026-09-22');
    const { category, templates } = await setUpOneTimeBills();

    const result = await runScheduleForecast(
      templates,
      '2026-11',
      15334,
      15334,
      0,
      [],
      category,
      currency,
    );

    expect(result.to_budget).toBe(3666);
    expect([...result.perScheduleMonthly.values()].every(Number.isFinite)).toBe(
      true,
    );
  });

  it('does not reserve a one-time bill from an earlier month once it has posted', async () => {
    // Same as above, but Bill A has posted, so the carry-in already
    // reflects it.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2026-09-22');
    const { category, payBill, templates } = await setUpOneTimeBills();
    await payBill('Bill A', '2026-10-01', -10000);

    const result = await runScheduleForecast(
      templates,
      '2026-11',
      5334,
      5334,
      0,
      [],
      category,
      currency,
    );

    expect(result.to_budget).toBe(3666);
  });

  it('still reserves a one-time bill when its only payment sits in another category', async () => {
    // Same schedule linked from two categories. The payment booked in the
    // other category didn't come out of this one's balance, so this
    // category still has to cover Bill A.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2026-09-22');
    const { category, otherCategoryId, payBill, templates } =
      await setUpOneTimeBills();
    await payBill('Bill A', '2026-10-01', -10000, otherCategoryId);

    const result = await runScheduleForecast(
      templates,
      '2026-11',
      15334,
      15334,
      0,
      [],
      category,
      currency,
    );

    expect(result.to_budget).toBe(3666);
  });

  it('covers a one-time bill that posted and completed this month', async () => {
    // Oct 3: Bill A posted on Oct 1 and the schedule service marked it
    // completed. $75 came into October, so October still owes the $25
    // the payment overspent.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2026-10-03');
    const { category, payBill, templates, scheduleIds } =
      await setUpOneTimeBills();
    await payBill('Bill A', '2026-10-01', -10000);
    await updateSchedule({
      schedule: { id: scheduleIds['Bill A'], completed: true },
    });

    const result = await runScheduleForecast(
      [templates[0]],
      '2026-10',
      7500,
      7500,
      0,
      [],
      category,
      currency,
    );

    expect(result.to_budget).toBe(2500);
  });

  it('covers a completed full-flag bill that posted this month', async () => {
    // Same as above, but the template carries the full flag.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2026-10-03');
    const { category, payBill, templates, scheduleIds } =
      await setUpOneTimeBills();
    await payBill('Bill A', '2026-10-01', -10000);
    await updateSchedule({
      schedule: { id: scheduleIds['Bill A'], completed: true },
    });

    const result = await runScheduleForecast(
      [{ ...templates[0], full: true }],
      '2026-10',
      7500,
      7500,
      0,
      [],
      category,
      currency,
    );

    expect(result.to_budget).toBe(2500);
  });

  it('reserves nothing for a completed schedule when budgeting ahead', async () => {
    // Oct 3, budgeting November. Bill A completed, its payment already in
    // the carry-in. Only Bill B is left to cover.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2026-10-03');
    const { category, payBill, templates, scheduleIds } =
      await setUpOneTimeBills();
    await payBill('Bill A', '2026-10-01', -10000);
    await updateSchedule({
      schedule: { id: scheduleIds['Bill A'], completed: true },
    });

    const result = await runScheduleForecast(
      templates,
      '2026-11',
      5334,
      5334,
      0,
      [],
      category,
      currency,
    );

    expect(result.to_budget).toBe(3666);
  });

  it('splits among past one-time bills when no other schedule is left', async () => {
    vi.mocked(monthUtils.currentDay).mockReturnValue('2026-09-22');
    const { category, templates } = await setUpOneTimeBills();

    const result = await runScheduleForecast(
      [templates[0]],
      '2026-11',
      5000,
      5000,
      0,
      [],
      category,
      currency,
    );

    expect(result.to_budget).toBe(5000);
    expect(result.perScheduleMonthly.get(templates[0])).toBe(5000);
  });
});
