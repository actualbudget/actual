import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import {
  advanceSchedulesService,
  createSchedule,
  app as schedulesApp,
  setNextDate,
  updateSchedule,
} from '#server/schedules/app';
import { loadRules } from '#server/transactions/transaction-rules';
import * as monthUtils from '#shared/months';
import type { CategoryEntity, RuleConditionEntity } from '#types/models';

import { runScheduleForecast } from './schedule-template';

// Runs the forecast against a real database, so the transaction queries go
// through the real AQL compiler rather than a mock that interprets their
// filters itself.

vi.mock('#shared/months', async () => {
  const actualModule =
    await vi.importActual<typeof monthUtils>('#shared/months');
  return { ...actualModule, currentDay: vi.fn(actualModule.currentDay) };
});

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  await loadRules();
});

afterEach(() => {
  vi.mocked(monthUtils.currentDay).mockReset();
});

async function setUpRent(start = '2024-01-25') {
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
          start,
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
  const payRent = (date: string, fromCategory: string | null = categoryId) =>
    db.insertTransaction({
      account,
      amount: -10000,
      date,
      category: fromCategory,
      schedule: scheduleId,
    });
  const template = {
    type: 'schedule',
    name: 'Rent',
    scheduleId,
    priority: 0,
    directive: 'template',
  } as const;
  return { account, category, payRent, template, scheduleId };
}

async function setUpYearlyBill() {
  const account = await db.insertAccount({
    name: 'Checking',
    offbudget: 0,
    closed: 0,
  });
  const group = await db.insertCategoryGroup({ name: 'Bills' });
  const categoryId = await db.insertCategory({
    name: 'Insurance',
    cat_group: group,
  });
  const category = { id: categoryId, name: 'Insurance' } as CategoryEntity;
  const conditions = [
    { op: 'is', field: 'account', value: account },
    { op: 'is', field: 'amount', value: -10000 },
    {
      op: 'is',
      field: 'date',
      value: {
        start: '2026-11-11',
        frequency: 'yearly',
        interval: 1,
        patterns: [],
        skipWeekend: false,
        weekendSolveMode: 'after',
        endMode: 'never',
      },
    },
  ] satisfies RuleConditionEntity[];
  const scheduleId = await createSchedule({
    schedule: { name: 'Insurance' },
    conditions,
  });
  const template = {
    type: 'schedule',
    name: 'Insurance',
    scheduleId,
    priority: 0,
    directive: 'template',
  } as const;
  return { account, category, template, scheduleId, conditions };
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
    fromCategory: string | null = categoryId,
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
      category,
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
      category,
    );

    expect(result.to_budget).toBe(10000);
  });

  it('does not charge a bill paid early in the previous month when budgeting ahead', async () => {
    // Oct 26, budgeting November. Rent is due on the 1st; November's was
    // paid and linked on Oct 25, so it already came out of the balance
    // carried into November. Only December onward is left to fund, so
    // December's $100 is saved over November and December.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2024-10-26');
    const { category, payRent, template } = await setUpRent('2024-01-01');
    await payRent('2024-10-01');
    await payRent('2024-10-25');

    const result = await runScheduleForecast(
      [template],
      '2024-11',
      0,
      0,
      category,
    );

    expect(result.to_budget).toBe(5000);
  });

  it('does not charge a bill paid early in the previous month when budgeting the current month', async () => {
    // Oct 15, budgeting October. October's rent, due on the 1st, was paid
    // and linked on Sep 29, so it already came out of the balance carried
    // into October. November's $100 is saved over October and November.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2024-10-15');
    const { category, payRent, template } = await setUpRent('2024-01-01');
    await payRent('2024-09-29');

    const result = await runScheduleForecast(
      [template],
      '2024-10',
      0,
      0,
      category,
    );

    expect(result.to_budget).toBe(5000);
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
      0,
      category,
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
      0,
      category,
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
      0,
      category,
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
      0,
      category,
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
      0,
      category,
    );

    expect(result.to_budget).toBe(2500);
  });

  it('asks a past month for the same amount before and after a schedule completes', async () => {
    // Oct 3, re-running August. Bill A posted Oct 1 and was completed.
    // From August, that payment is still a $100 outflow two months out,
    // alongside Bill B's $90 three months out: $190 over four months.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2026-10-03');
    const { category, payBill, templates, scheduleIds } =
      await setUpOneTimeBills();
    await payBill('Bill A', '2026-10-01', -10000);
    await updateSchedule({
      schedule: { id: scheduleIds['Bill A'], completed: true },
    });

    const result = await runScheduleForecast(
      templates,
      '2026-08',
      0,
      0,
      category,
    );

    expect(result.to_budget).toBe(4750);
  });

  it('counts a completed schedule payment dated later this month', async () => {
    // Oct 3: Bill A was entered for Oct 20 and marked completed by hand.
    // The payment is still ahead of today, so October has to cover it.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2026-10-03');
    const { category, payBill, templates, scheduleIds } =
      await setUpOneTimeBills();
    await payBill('Bill A', '2026-10-20', -10000);
    await updateSchedule({
      schedule: { id: scheduleIds['Bill A'], completed: true },
    });

    const result = await runScheduleForecast(
      [templates[0]],
      '2026-10',
      7500,
      0,
      category,
    );

    expect(result.to_budget).toBe(2500);
  });

  it('reserves a completed bill whose payment is not in this category when budgeting ahead', async () => {
    // Oct 7, budgeting November. Bill A posted Oct 1 and completed, but
    // the payment was uncategorized, so the $153.34 carried in still has
    // to pay it. Reported on #8862 as a way to budget next month before
    // this month's bill comes out.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2026-10-07');
    const { category, payBill, templates, scheduleIds } =
      await setUpOneTimeBills();
    await payBill('Bill A', '2026-10-01', -10000, null);
    await updateSchedule({
      schedule: { id: scheduleIds['Bill A'], completed: true },
    });

    const result = await runScheduleForecast(
      templates,
      '2026-11',
      15334,
      0,
      category,
    );

    expect(result.to_budget).toBe(3666);
  });

  it('counts a completed bill whose payment is dated after today', async () => {
    // Oct 7, budgeting November. Bill B was entered for Nov 1 and marked
    // completed by hand. The payment is still ahead, so November owes it.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2026-10-07');
    const { category, payBill, templates, scheduleIds } =
      await setUpOneTimeBills();
    await payBill('Bill B', '2026-11-01', -9000);
    await updateSchedule({
      schedule: { id: scheduleIds['Bill B'], completed: true },
    });

    const result = await runScheduleForecast(
      [templates[1]],
      '2026-11',
      5334,
      0,
      category,
    );

    expect(result.to_budget).toBe(3666);
  });

  it('ignores a schedule completed long ago whose template line was never removed', async () => {
    // Rent was completed in 2024 with its next date in June 2024. Two
    // years on, the rule would still yield a date every month (Oct 25 has
    // already passed), but nothing after that next date ever happened.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2024-06-01');
    const { category, template } = await setUpRent();
    await updateSchedule({
      schedule: { id: template.scheduleId, completed: true },
    });
    vi.mocked(monthUtils.currentDay).mockReturnValue('2026-10-27');

    const result = await runScheduleForecast(
      [template],
      '2026-10',
      0,
      0,
      category,
    );

    expect(result.to_budget).toBe(0);
  });

  it("does not count a posted full-flag payment as this month's spending", async () => {
    // Oct 10, budgeting October. Bill A is budgeted in full and was paid
    // Oct 1. Bill B is smoothed and due Nov 1. Bill A's $100 comes from its
    // own full amount; it isn't spending the forecast has to cover too.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2026-10-10');
    const { category, payBill, templates } = await setUpOneTimeBills();
    await payBill('Bill A', '2026-10-01', -10000);

    const result = await runScheduleForecast(
      [{ ...templates[0], full: true }, templates[1]],
      '2026-10',
      0,
      0,
      category,
    );

    // $100 for Bill A in full, plus $90 for Bill B spread over Oct and Nov.
    expect(result.to_budget).toBe(10000 + 4500);
  });

  it('counts a completed schedule up to a payment entered after its next date', async () => {
    // Rent was completed on Jun 1 with its next date Jun 25, after July's
    // and August's payments had been entered ahead of time. Earlier
    // payments are on file too. Budgeting August on Aug 1, the Aug 25
    // payment still has to be covered: it extends the schedule past its
    // next date, so the query for it must not drop it.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2024-06-01');
    const { category, payRent, template } = await setUpRent();
    for (const date of [
      '2024-04-25',
      '2024-05-25',
      '2024-07-25',
      '2024-08-25',
    ]) {
      await payRent(date);
    }
    await updateSchedule({
      schedule: { id: template.scheduleId, completed: true },
    });
    vi.mocked(monthUtils.currentDay).mockReturnValue('2024-08-01');

    const result = await runScheduleForecast(
      [template],
      '2024-08',
      0,
      0,
      category,
    );

    expect(result.to_budget).toBe(10000);
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
      0,
      category,
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
      0,
      category,
    );

    expect(result.to_budget).toBe(5000);
    expect(result.perScheduleMonthly.get(templates[0])).toBe(5000);
  });

  it('reserves a bill whose linked payment is not categorized yet when budgeting ahead', async () => {
    // Oct 26, budgeting November. October's rent (Oct 22) posted and is
    // linked, so the schedule moved on to Nov 22, but the payment hasn't
    // been categorized yet. The $100 carried into November still has to
    // pay it, so November needs its own $100.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2026-10-20');
    const { category, payRent, template, scheduleId } =
      await setUpRent('2026-10-22');
    await payRent('2026-10-22', null);
    await setNextDate({ id: scheduleId, advance: true });
    vi.mocked(monthUtils.currentDay).mockReturnValue('2026-10-26');

    const result = await runScheduleForecast(
      [template],
      '2026-11',
      10000,
      0,
      category,
    );

    expect(result.to_budget).toBe(10000);
  });

  it('does not reserve a skipped occurrence when budgeting ahead', async () => {
    // Oct 26, budgeting November. October's rent was skipped, so the
    // $100 carried into November is free toward November's.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2026-10-26');
    const { category, template, scheduleId } = await setUpRent('2026-10-22');
    await setNextDate({ id: scheduleId, advance: true });

    const result = await runScheduleForecast(
      [template],
      '2026-11',
      10000,
      0,
      category,
    );

    expect(result.to_budget).toBe(0);
  });

  it('does not budget a skipped occurrence later this month', async () => {
    // Nov 5, budgeting November. The yearly $100 bill due Nov 11 was
    // skipped, so the schedule moved on to Nov 11, 2027. Nothing is due
    // this month; next year's bill is saved over the 13 months up to it.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2026-11-05');
    const { category, template, scheduleId } = await setUpYearlyBill();
    await setNextDate({ id: scheduleId, advance: true });

    const result = await runScheduleForecast(
      [template],
      '2026-11',
      0,
      0,
      category,
    );

    expect(result.to_budget).toBe(770);
  });

  it('does not budget a skipped occurrence after its date has passed', async () => {
    // Nov 12, budgeting November. The yearly $100 bill due Nov 11 was
    // skipped on Nov 5, so the schedule moved on to Nov 11, 2027. The
    // skipped bill still isn't due, now that its date is behind us.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2026-11-05');
    const { category, template, scheduleId } = await setUpYearlyBill();
    await setNextDate({ id: scheduleId, advance: true });
    vi.mocked(monthUtils.currentDay).mockReturnValue('2026-11-12');

    const result = await runScheduleForecast(
      [template],
      '2026-11',
      0,
      0,
      category,
    );

    expect(result.to_budget).toBe(770);
  });

  describe('when an edit moves next_date past an unpaid occurrence', () => {
    // Nov 12, budgeting November. The yearly $100 bill due Nov 11 is unpaid.
    // Changing the schedule's account or date moves next_date on from today
    // to Nov 11, 2027, but the bill is still due, as it is without the edit.
    async function forecastBeforeAndAfter(
      edit: (
        conditions: RuleConditionEntity[],
      ) => Promise<RuleConditionEntity[]> | RuleConditionEntity[],
    ) {
      vi.mocked(monthUtils.currentDay).mockReturnValue('2026-11-05');
      const { category, template, scheduleId, conditions } =
        await setUpYearlyBill();
      vi.mocked(monthUtils.currentDay).mockReturnValue('2026-11-12');
      const unedited = await runScheduleForecast(
        [template],
        '2026-11',
        0,
        0,
        category,
      );

      const newConditions = await edit(conditions);
      // A reset computes next_date from the clock rather than currentDay().
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 10, 12, 12));
      try {
        await updateSchedule({
          schedule: { id: scheduleId },
          conditions: newConditions,
        });
      } finally {
        vi.useRealTimers();
      }

      const edited = await runScheduleForecast(
        [template],
        '2026-11',
        0,
        0,
        category,
      );
      return { unedited, edited };
    }

    it('still budgets it after an account change', async () => {
      const { unedited, edited } = await forecastBeforeAndAfter(
        async conditions => {
          const savings = await db.insertAccount({
            name: 'Savings',
            offbudget: 0,
            closed: 0,
          });
          return conditions.map(c =>
            c.field === 'account' ? { ...c, value: savings } : c,
          );
        },
      );

      expect(edited.to_budget).toBe(unedited.to_budget);
    });

    it('still budgets it after a date change', async () => {
      // Same yearly dates, from an earlier start.
      const { unedited, edited } = await forecastBeforeAndAfter(conditions =>
        conditions.map(c =>
          c.field === 'date'
            ? {
                ...c,
                value: {
                  start: '2025-11-11',
                  frequency: 'yearly',
                  interval: 1,
                  patterns: [],
                  skipWeekend: false,
                  weekendSolveMode: 'after',
                  endMode: 'never',
                },
              }
            : c,
        ),
      );

      expect(edited.to_budget).toBe(unedited.to_budget);
    });
  });

  it('still budgets the occurrences a late payment moved next_date past', async () => {
    // Nov 12, budgeting November. A weekly $100 bill is due on Sundays from
    // Nov 1. Nov 1 and Nov 8 are unpaid when a payment is linked on Nov 12.
    // The schedule service counts that payment against next_date (Nov 1),
    // then moves next_date on from today, to Nov 15, passing Nov 8 without a
    // payment. The payment pays one occurrence; the others are still due, so
    // November needs all five, as it did before next_date moved.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2026-10-30');
    const account = await db.insertAccount({
      name: 'Checking',
      offbudget: 0,
      closed: 0,
    });
    const group = await db.insertCategoryGroup({ name: 'Bills' });
    const categoryId = await db.insertCategory({
      name: 'Cleaning',
      cat_group: group,
    });
    const category = { id: categoryId, name: 'Cleaning' } as CategoryEntity;
    const scheduleId = await createSchedule({
      schedule: { name: 'Cleaning' },
      conditions: [
        { op: 'is', field: 'account', value: account },
        { op: 'is', field: 'amount', value: -10000 },
        {
          op: 'is',
          field: 'date',
          value: {
            start: '2026-11-01',
            frequency: 'weekly',
            interval: 1,
            patterns: [],
            skipWeekend: false,
            weekendSolveMode: 'after',
            endMode: 'never',
          },
        },
      ],
    });
    const template = {
      type: 'schedule',
      name: 'Cleaning',
      scheduleId,
      priority: 0,
      directive: 'template',
    } as const;
    await db.insertTransaction({
      account,
      amount: -10000,
      date: '2026-11-12',
      category: categoryId,
      schedule: scheduleId,
    });
    vi.mocked(monthUtils.currentDay).mockReturnValue('2026-11-12');
    const beforeService = await runScheduleForecast(
      [template],
      '2026-11',
      0,
      0,
      category,
    );

    // The service moves next_date from the clock rather than currentDay(),
    // and reads the schedule's date and account through the JSON paths the
    // schedules app tracks.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 12, 12));
    schedulesApp.startServices();
    try {
      await advanceSchedulesService(true);
    } finally {
      await schedulesApp.stopServices();
      vi.useRealTimers();
    }
    const nextDate = await db.first<{ local_next_date: number }>(
      'SELECT local_next_date FROM schedules_next_date WHERE schedule_id = ?',
      [scheduleId],
    );
    expect(nextDate?.local_next_date).toBe(20261115);

    const afterService = await runScheduleForecast(
      [template],
      '2026-11',
      0,
      0,
      category,
    );

    expect(afterService.to_budget).toBe(beforeService.to_budget);
    // Nov 1, 8, 15, 22 and 29: the payment covers one of the five.
    expect(afterService.to_budget).toBe(50000);
  });

  it('does not budget an occurrence due today that was paid early by hand and skipped', async () => {
    // Nov 11, budgeting November. The yearly $100 bill due today was paid
    // on Oct 31 without linking the payment, then skipped, so the schedule
    // moved on to Nov 11, 2027. The payment already came out of October.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2026-11-11');
    const { account, category, template, scheduleId } = await setUpYearlyBill();
    await db.insertTransaction({
      account,
      amount: -10000,
      date: '2026-10-31',
      category: category.id,
    });
    await setNextDate({ id: scheduleId, advance: true });

    const result = await runScheduleForecast(
      [template],
      '2026-11',
      0,
      0,
      category,
    );

    expect(result.to_budget).toBe(770);
  });

  it('counts a payment linked through a split parent like an unsplit one', async () => {
    // Nov 12, budgeting November. The yearly $100 bill due Nov 11 was paid
    // on Nov 11 from another category, and the schedule moved on to
    // Nov 11, 2027. A split payment carries the schedule link on its parent,
    // so the forecast must find it as it finds an unsplit payment.
    async function forecastAfterPayment(split: boolean) {
      await global.emptyDatabase()();
      await loadMappings();
      await loadRules();
      vi.mocked(monthUtils.currentDay).mockReturnValue('2026-11-11');
      const { account, category, template, scheduleId } =
        await setUpYearlyBill();
      const otherCategory = await db.insertCategory({
        name: 'Household',
        cat_group: (await db.getCategories())[0].cat_group,
      });
      if (split) {
        await db.insertTransaction({
          id: 'parent',
          account,
          amount: -10000,
          date: '2026-11-11',
          schedule: scheduleId,
          is_parent: true,
        });
        for (const id of ['child1', 'child2']) {
          await db.insertTransaction({
            id,
            account,
            amount: -5000,
            date: '2026-11-11',
            category: otherCategory,
            is_child: true,
            parent_id: 'parent',
          });
        }
      } else {
        await db.insertTransaction({
          account,
          amount: -10000,
          date: '2026-11-11',
          category: otherCategory,
          schedule: scheduleId,
        });
      }
      await setNextDate({ id: scheduleId, advance: true });
      vi.mocked(monthUtils.currentDay).mockReturnValue('2026-11-12');
      return runScheduleForecast([template], '2026-11', 0, 0, category);
    }

    const unsplit = await forecastAfterPayment(false);
    const split = await forecastAfterPayment(true);

    expect(split.to_budget).toBe(unsplit.to_budget);
  });

  it('reserves a bill that has not posted yet this month when budgeting ahead', async () => {
    // Oct 20, budgeting November. October's rent (Oct 22) hasn't posted,
    // so the $100 carried into November still has to pay it.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2026-10-20');
    const { category, template } = await setUpRent('2026-10-22');

    const result = await runScheduleForecast(
      [template],
      '2026-11',
      10000,
      0,
      category,
    );

    expect(result.to_budget).toBe(10000);
  });

  describe('with an unpaid full-flag bill when budgeting ahead', () => {
    // Oct 20, budgeting November. Rent ($100 on the 25th) is budgeted in
    // full; October's was funded and hasn't posted. Insurance ($1,200 a
    // year, first due Oct 1, 2027) is smoothed and has nothing saved yet,
    // so it needs $100 a month.
    async function setUp() {
      vi.mocked(monthUtils.currentDay).mockReturnValue('2026-10-20');
      const { account, category, payRent, template } =
        await setUpRent('2026-01-25');
      const insuranceId = await createSchedule({
        schedule: { name: 'Insurance' },
        conditions: [
          { op: 'is', field: 'account', value: account },
          { op: 'is', field: 'amount', value: -120000 },
          {
            op: 'is',
            field: 'date',
            value: {
              start: '2027-10-01',
              frequency: 'yearly',
              interval: 1,
              patterns: [],
              skipWeekend: false,
              weekendSolveMode: 'after',
              endMode: 'never',
            },
          },
        ],
      });
      const templates = [
        { ...template, full: true },
        {
          type: 'schedule',
          name: 'Insurance',
          scheduleId: insuranceId,
          priority: 0,
          directive: 'template',
        } as const,
      ];
      return { category, payRent, templates };
    }

    it("does not treat the full-flag bill's funding as surplus", async () => {
      const { category, templates } = await setUp();

      const result = await runScheduleForecast(
        templates,
        '2026-11',
        10000,
        0,
        category,
      );

      // $100 for November's rent in full, plus $100 toward insurance.
      expect(result.to_budget).toBe(20000);
    });

    it('asks the same once the full-flag bill has posted', async () => {
      const { category, payRent, templates } = await setUp();
      await payRent('2026-10-20');

      const result = await runScheduleForecast(
        templates,
        '2026-11',
        0,
        0,
        category,
      );

      expect(result.to_budget).toBe(20000);
    });
  });

  describe('with a schedule whose rule has no amount condition', () => {
    // Sep 15, budgeting September. Rent ($100 on the 25th) hasn't posted.
    // Utilities lost its amount condition (it can be removed on the Rules
    // page), so the Schedules page shows it as 0.
    async function setUp() {
      vi.mocked(monthUtils.currentDay).mockReturnValue('2024-09-15');
      const { account, category, template } = await setUpRent();
      const utilitiesId = await createSchedule({
        schedule: { name: 'Utilities' },
        conditions: [
          { op: 'is', field: 'account', value: account },
          {
            op: 'is',
            field: 'date',
            value: {
              start: '2024-01-07',
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
      const utilities = {
        type: 'schedule',
        name: 'Utilities',
        scheduleId: utilitiesId,
        priority: 0,
        directive: 'template',
      } as const;
      return { category, template, utilities };
    }

    it('budgets it as 0 instead of failing', async () => {
      const { category, template, utilities } = await setUp();

      const result = await runScheduleForecast(
        [template, utilities],
        '2024-09',
        0,
        0,
        category,
      );

      expect(result.to_budget).toBe(10000);
      expect(result.perScheduleMonthly.get(utilities)).toBe(0);
    });

    it('does not apply a fixed adjustment to it', async () => {
      const { category, template, utilities } = await setUp();
      const adjusted = {
        ...utilities,
        adjustment: 5,
        adjustmentType: 'fixed',
      } as const;

      const result = await runScheduleForecast(
        [template, adjusted],
        '2024-09',
        0,
        0,
        category,
      );

      expect(result.to_budget).toBe(10000);
      expect(result.perScheduleMonthly.get(template)).toBe(10000);
      expect(result.perScheduleMonthly.get(adjusted)).toBe(0);
    });
  });
});
