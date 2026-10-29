import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { Rule } from '#server/rules';
import { getRuleForSchedule } from '#server/schedules/app';
import * as monthUtils from '#shared/months';
import type { q } from '#shared/query';
import type { CategoryEntity } from '#types/models';
import type { ScheduleTemplate } from '#types/models/templates';

import { isTrackingBudget } from './actions';
import {
  buildMonthlyOutflow,
  createScheduleList,
  runScheduleForecast,
  solveMonthlyContribution,
} from './schedule-template';

vi.mock('#server/db');
vi.mock('#server/aql');
vi.mock('./actions');
// currentDay() is pinned to 2017-01-01 under test; keep that by default and
// let the "relative to today" tests pin their own date.
vi.mock('#shared/months', async () => {
  const actualModule =
    await vi.importActual<typeof monthUtils>('#shared/months');
  return { ...actualModule, currentDay: vi.fn(actualModule.currentDay) };
});
vi.mock('#server/schedules/app', async () => {
  const actualModule = await vi.importActual('#server/schedules/app');
  return {
    ...actualModule,
    getRuleForSchedule: vi.fn(),
  };
});

const defaultCategory = { id: '1', name: 'Test Category' } as CategoryEntity;

type RuleSpec = {
  id?: string;
  start: string;
  amount: number;
  frequency: 'monthly' | 'yearly' | 'weekly' | 'daily';
  interval?: number;
  actions?: ConstructorParameters<typeof Rule>[0]['actions'];
};

function makeRule({
  id = 'r',
  start,
  amount,
  frequency,
  interval = 1,
  actions = [],
}: RuleSpec): Rule {
  return new Rule({
    id,
    stage: 'pre',
    conditionsOp: 'and',
    conditions: [
      {
        op: 'is',
        field: 'date',
        value: {
          start,
          interval,
          frequency,
          patterns: [],
          skipWeekend: false,
          weekendSolveMode: 'before',
          endMode: 'never',
          endOccurrences: 1,
          endDate: '2099-01-01',
        },
        type: 'date',
      },
      { op: 'is', field: 'amount', value: amount, type: 'number' },
    ],
    actions,
  });
}

function mockSingleSchedule(spec: RuleSpec, completed: number = 0) {
  vi.mocked(db.first).mockResolvedValue({ id: 1, completed });
  vi.mocked(getRuleForSchedule).mockResolvedValue(makeRule(spec));
  vi.mocked(isTrackingBudget).mockReturnValue(false);
}

function mockSchedulesByName(
  specsByName: Record<string, { spec: RuleSpec; completed?: number }>,
) {
  const names = Object.keys(specsByName);
  const sidByName: Record<string, number> = Object.fromEntries(
    names.map((name, i) => [name, i + 1]),
  );
  vi.mocked(db.first).mockImplementation(
    async (_q: string, params?: unknown[]) => {
      const name = (params as string[] | undefined)?.[0] ?? '';
      return {
        id: sidByName[name],
        completed: specsByName[name]?.completed ?? 0,
      };
    },
  );
  vi.mocked(getRuleForSchedule).mockImplementation(async id => {
    const name = names.find(n => sidByName[n] === Number(id)) ?? names[0];
    return makeRule(specsByName[name].spec);
  });
  vi.mocked(isTrackingBudget).mockReturnValue(false);
}

describe('createScheduleList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getAccounts).mockResolvedValue([]);
  });

  it('includes dateConditions on each returned entry', async () => {
    mockSingleSchedule({
      start: '2024-08-01',
      amount: -10000,
      frequency: 'monthly',
    });
    const template = {
      type: 'schedule',
      name: 'Test Schedule',
      priority: 0,
      directive: 'template',
    } as const;

    const { t } = await createScheduleList(
      [template],
      '2024-08-01',
      defaultCategory,
    );

    expect(t[0].dateConditions).toBeDefined();
    expect(t[0].dateConditions.value.frequency).toBe('monthly');
  });
});

describe('buildMonthlyOutflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getAccounts).mockResolvedValue([]);
  });

  it('buckets each monthly schedule occurrence into its own month index', async () => {
    mockSingleSchedule({
      start: '2024-01-15',
      amount: -10000,
      frequency: 'monthly',
    });
    const template = {
      type: 'schedule',
      name: 'Rent',
      priority: 0,
      directive: 'template',
    } as const;
    const { t } = await createScheduleList(
      [template],
      '2024-01-01',
      defaultCategory,
    );

    vi.mocked(aqlQuery).mockResolvedValue({ data: [], dependencies: [] });

    const outflow = await buildMonthlyOutflow(t, '2024-01-01', defaultCategory);

    expect(outflow).toHaveLength(60);
    expect(outflow[0]).toBe(10000);
    expect(outflow[1]).toBe(10000);
    expect(outflow[59]).toBe(10000);
  });

  it('adds an unlinked future-dated transaction only to its own month', async () => {
    mockSingleSchedule({
      start: '2024-01-15',
      amount: -10000,
      frequency: 'monthly',
    });
    const template = {
      type: 'schedule',
      name: 'Rent',
      priority: 0,
      directive: 'template',
    } as const;
    const { t } = await createScheduleList(
      [template],
      '2024-01-01',
      defaultCategory,
    );

    vi.mocked(aqlQuery).mockResolvedValue({
      data: [{ amount: -5000, date: '2024-03-10' }],
      dependencies: [],
    });

    const outflow = await buildMonthlyOutflow(t, '2024-01-01', defaultCategory);

    expect(outflow[0]).toBe(10000);
    expect(outflow[2]).toBe(15000); // March: 10000 schedule + 5000 unlinked
    expect(outflow[3]).toBe(10000);
  });

  it('buckets a weekly schedule by its per-occurrence amount, not its monthly-aggregated target', async () => {
    // Regression test for the sub-monthly over-forecast bug: `target` on a
    // weekly entry is the *aggregated* monthly total (createScheduleList
    // sums every occurrence landing in its aggregation window into
    // `target`), not a per-occurrence amount. Bucketing occurrences by
    // `target` instead of `perOccurrenceAmount` would multiply an
    // already-aggregated monthly total by the occurrence count again.
    //
    // 2024-01-01 is a Monday, so weekly-every-Monday from that date lands
    // on 5 Mondays in January (1, 8, 15, 22, 29) and 4 in February (5, 12,
    // 19, 26) -- a real, independently-verifiable calendar fact, not a
    // number derived from the code under test.
    mockSingleSchedule({
      start: '2024-01-01',
      amount: -1000,
      frequency: 'weekly',
    });
    const template = {
      type: 'schedule',
      name: 'Weekly Bill',
      priority: 0,
      directive: 'template',
    } as const;
    const { t } = await createScheduleList(
      [template],
      '2024-01-01',
      defaultCategory,
    );

    // Sanity check on the fixture itself: target is the aggregated
    // January total (5 occurrences), not the single-occurrence amount.
    expect(t[0].target).toBe(5000);
    expect(t[0].perOccurrenceAmount).toBe(1000);

    vi.mocked(aqlQuery).mockResolvedValue({ data: [], dependencies: [] });

    const outflow = await buildMonthlyOutflow(t, '2024-01-01', defaultCategory);

    expect(outflow[0]).toBe(5000); // 5 Mondays in January x $10
    expect(outflow[1]).toBe(4000); // 4 Mondays in February x $10
  });
});

describe('buildMonthlyOutflow relative to today', () => {
  const rentTemplate = {
    type: 'schedule',
    name: 'Rent',
    priority: 0,
    directive: 'template',
  } as const;

  // A monthly $100 rent due on the 25th, with the schedule's stored
  // next_date (the first unpaid occurrence) given as a date repr.
  function mockRent(nextDateRepr: number | null) {
    mockSingleSchedule({
      start: '2024-01-25',
      amount: -10000,
      frequency: 'monthly',
    });
    vi.mocked(db.first).mockResolvedValue({
      id: 1,
      completed: 0,
      next_date: nextDateRepr,
    });
  }

  type QueryKind = 'posted' | 'unlinked' | 'linked';

  // buildMonthlyOutflow issues up to three transaction queries; tell them
  // apart by their filters, since the aqlQuery mock ignores them.
  function queryKind(query: ReturnType<typeof q>): QueryKind {
    const filters: ReadonlyArray<Record<string, unknown>> =
      query.serialize().filterExpressions;
    const scheduleFilter = filters.find(f => 'schedule' in f);
    if (scheduleFilter) {
      return scheduleFilter.schedule === null ? 'unlinked' : 'linked';
    }
    return 'posted';
  }

  type MockTransaction = {
    amount: number;
    date: string;
    schedule?: number | null;
    category?: string | null;
  };

  // Answers each query the way the database would: the transactions inside
  // its date range, limited to unlinked or linked ones where it asks. A
  // transaction is in defaultCategory unless it says otherwise.
  function mockTransactionQueries(transactions: MockTransaction[]) {
    vi.mocked(aqlQuery).mockImplementation(async rawQuery => {
      const query = rawQuery as ReturnType<typeof q>;
      const kind = queryKind(query);
      const range = dateFilter(kind, query);
      const data = transactions
        .filter(
          t =>
            (range.$gte === undefined || t.date >= range.$gte) &&
            (range.$lt === undefined || t.date < range.$lt) &&
            (kind === 'posted' ||
              (kind === 'unlinked' ? t.schedule == null : t.schedule != null)),
        )
        .map(t => ({ category: defaultCategory.id, ...t }));
      return { data, dependencies: [] };
    });
  }

  type DateRange = { $gte?: string; $lt?: string };

  // The date range a query actually applies, read the way AQL compiles it:
  // an array of operator objects is ANDed together, but an object with
  // several operators only applies its first one.
  function dateFilter(
    kind: QueryKind,
    query?: ReturnType<typeof q>,
  ): DateRange {
    query ??= vi
      .mocked(aqlQuery)
      .mock.calls.map(([call]) => call as ReturnType<typeof q>)
      .find(call => queryKind(call) === kind);
    const date = query
      ?.serialize()
      .filterExpressions.find((f: Record<string, unknown>) => 'date' in f)
      ?.date as DateRange | DateRange[] | undefined;
    if (date === undefined) return {};
    const operators = Array.isArray(date) ? date : [date];
    return Object.fromEntries(
      operators.map(operator => Object.entries(operator)[0]),
    );
  }

  function unlinkedDateFilter() {
    return dateFilter('unlinked');
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getAccounts).mockResolvedValue([]);
    vi.mocked(aqlQuery).mockResolvedValue({ data: [], dependencies: [] });
  });

  afterEach(() => {
    // Restores the real (test-pinned) implementation passed to vi.fn.
    vi.mocked(monthUtils.currentDay).mockReset();
  });

  it('reads the stored next_date into storedNextDate', async () => {
    mockRent(20241025);
    const { t } = await createScheduleList(
      [rentTemplate],
      '2024-11',
      defaultCategory,
    );
    expect(t[0].storedNextDate).toBe('2024-10-25');
  });

  it('counts only future-dated unlinked transactions when re-running a past month', async () => {
    vi.mocked(monthUtils.currentDay).mockReturnValue('2024-09-15');
    mockRent(20240925);
    const { t } = await createScheduleList(
      [rentTemplate],
      '2024-06',
      defaultCategory,
    );

    await buildMonthlyOutflow(t, '2024-06', defaultCategory);

    expect(unlinkedDateFilter()).toEqual({
      $gte: '2024-09-16',
      $lt: '2029-06-01',
    });
  });

  it('still counts unlinked spending already posted in the current month', async () => {
    // Sep 15, budgeting September: a $40 unlinked purchase on Sep 5 has to
    // be covered alongside the $100 rent, which isn't due until Sep 25.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2024-09-15');
    mockRent(20240925);
    mockTransactionQueries([{ amount: -4000, date: '2024-09-05' }]);

    const result = await runScheduleForecast(
      [rentTemplate],
      '2024-09',
      0,
      0,
      defaultCategory,
    );

    expect(dateFilter('posted')).toEqual({
      $gte: '2024-09-01',
      $lt: '2024-09-16',
    });
    expect(unlinkedDateFilter()).toEqual({
      $gte: '2024-09-16',
      $lt: '2029-09-01',
    });
    expect(result.to_budget).toBe(14000);
  });

  it('does not double-count a hand-entered, unlinked payment of a bill already due this month', async () => {
    // Sep 26, re-running September: rent (Sep 25) was paid by hand and not
    // linked. It can't be told apart from the rent itself, so the month
    // needs max($100 due, $100 spent), not both.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2024-09-26');
    mockRent(20240925);
    mockTransactionQueries([{ amount: -10000, date: '2024-09-25' }]);

    const result = await runScheduleForecast(
      [rentTemplate],
      '2024-09',
      0,
      0,
      defaultCategory,
    );

    expect(result.to_budget).toBe(10000);
  });

  it('does not double-count a linked payment made before its due date this month', async () => {
    // Sep 21, re-running September: rent (Sep 25) was paid and linked on
    // Sep 20. The linked payment marks the Sep 25 occurrence as elapsed.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2024-09-21');
    mockRent(20240925);
    mockTransactionQueries([
      { amount: -10000, date: '2024-09-20', schedule: 1 },
    ]);
    const { t } = await createScheduleList(
      [rentTemplate],
      '2024-09',
      defaultCategory,
    );

    const outflow = await buildMonthlyOutflow(t, '2024-09', defaultCategory);

    expect(outflow[0]).toBe(10000);
  });

  it("attributes a late linked payment to last month's occurrence, not this month's", async () => {
    // Sep 15: August's rent (Aug 25) was paid late, linked, on Sep 2. It's
    // nearer Aug 25 than Sep 25, so September's rent is still due.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2024-09-15');
    mockRent(20240925);
    mockTransactionQueries([
      { amount: -10000, date: '2024-09-02', schedule: 1 },
    ]);
    const { t } = await createScheduleList(
      [rentTemplate],
      '2024-09',
      defaultCategory,
    );

    const outflow = await buildMonthlyOutflow(t, '2024-09', defaultCategory);

    expect(outflow[0]).toBe(20000); // the $100 already spent + Sep 25's $100
  });

  it.each([
    ['rent posted unlinked', [-10000], 10000],
    ['rent plus a $40 unlinked extra', [-10000, -4000], 14000],
    ['rent that came in at $105', [-10500], 10500],
    ['rent that came in at $95', [-9500], 10000],
  ])(
    're-running a past month counts the larger of scheduled and actual spending: %s',
    async (_label, amounts, expected) => {
      vi.mocked(monthUtils.currentDay).mockReturnValue('2024-09-15');
      mockRent(20240925);
      mockTransactionQueries(
        amounts.map(amount => ({ amount, date: '2024-06-25' })),
      );
      const { t } = await createScheduleList(
        [rentTemplate],
        '2024-06',
        defaultCategory,
      );

      const outflow = await buildMonthlyOutflow(t, '2024-06', defaultCategory);

      expect(dateFilter('posted')).toEqual({
        $gte: '2024-06-01',
        $lt: '2024-07-01',
      });
      expect(outflow[0]).toBe(expected);
      expect(outflow[1]).toBe(10000);
    },
  );

  it('starts the unlinked-transaction window at the budget month when budgeting ahead', async () => {
    vi.mocked(monthUtils.currentDay).mockReturnValue('2024-10-20');
    mockRent(20241125);
    const { t } = await createScheduleList(
      [rentTemplate],
      '2024-11',
      defaultCategory,
    );

    await buildMonthlyOutflow(t, '2024-11', defaultCategory);

    expect(unlinkedDateFilter()).toEqual({
      $gte: '2024-11-01',
      $lt: '2029-11-01',
    });
  });

  it('counts an unpaid occurrence due before the budget month against month 0', async () => {
    // Budgeting November on Oct 20; October's rent (Oct 25) hasn't posted,
    // so the carried-over balance still holds the money for it.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2024-10-20');
    mockRent(20241025);
    const { t } = await createScheduleList(
      [rentTemplate],
      '2024-11',
      defaultCategory,
    );

    const outflow = await buildMonthlyOutflow(t, '2024-11', defaultCategory);

    expect(outflow[0]).toBe(20000); // October's pending rent + November's
    expect(outflow[1]).toBe(10000);
  });

  it('settles a pending occurrence with a linked payment made before its due date', async () => {
    // Oct 21: October's rent (Oct 25) was paid and linked on Oct 20.
    // next_date hasn't advanced, but the payment is already out of the
    // carried-over balance, so October isn't pending.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2024-10-21');
    mockRent(20241025);
    mockTransactionQueries([
      { amount: -10000, date: '2024-10-20', schedule: 1 },
    ]);
    const { t } = await createScheduleList(
      [rentTemplate],
      '2024-11',
      defaultCategory,
    );

    const outflow = await buildMonthlyOutflow(t, '2024-11', defaultCategory);

    expect(dateFilter('linked')).toEqual({
      $gte: '2022-10-01',
      $lt: '2024-11-01',
    });
    expect(outflow[0]).toBe(10000);
  });

  it('does not settle a pending occurrence with an unlinked payment', async () => {
    vi.mocked(monthUtils.currentDay).mockReturnValue('2024-10-21');
    mockRent(20241025);
    mockTransactionQueries([{ amount: -10000, date: '2024-10-20' }]);
    const { t } = await createScheduleList(
      [rentTemplate],
      '2024-11',
      defaultCategory,
    );

    const outflow = await buildMonthlyOutflow(t, '2024-11', defaultCategory);

    expect(outflow[0]).toBe(20000);
  });

  it("does not settle a pending occurrence with a late payment of last month's", async () => {
    // Oct 20: September's rent was paid late, linked, on Oct 3. It's nearer
    // Sep 25 than Oct 25, so October's rent is still pending.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2024-10-20');
    mockRent(20241025);
    mockTransactionQueries([
      { amount: -10000, date: '2024-10-03', schedule: 1 },
    ]);
    const { t } = await createScheduleList(
      [rentTemplate],
      '2024-11',
      defaultCategory,
    );

    const outflow = await buildMonthlyOutflow(t, '2024-11', defaultCategory);

    expect(outflow[0]).toBe(20000);
  });

  it('adds nothing extra once the prior occurrence has posted', async () => {
    vi.mocked(monthUtils.currentDay).mockReturnValue('2024-10-26');
    mockRent(20241125);
    const { t } = await createScheduleList(
      [rentTemplate],
      '2024-11',
      defaultCategory,
    );

    const outflow = await buildMonthlyOutflow(t, '2024-11', defaultCategory);

    expect(outflow[0]).toBe(10000);
  });

  it('ignores occurrences missed before the real current month', async () => {
    // next_date stuck in June (never paid); only October's occurrence,
    // which is still ahead of today, counts as pending.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2024-10-20');
    mockRent(20240625);
    const { t } = await createScheduleList(
      [rentTemplate],
      '2024-11',
      defaultCategory,
    );

    const outflow = await buildMonthlyOutflow(t, '2024-11', defaultCategory);

    expect(outflow[0]).toBe(20000);
  });

  it("does not settle a pending quarterly occurrence with a late payment of the previous quarter's", async () => {
    // Quarterly $300 due Jan 28, Apr 28, Jul 28. On Apr 20, budgeting
    // July: January's bill was paid late, linked, on Mar 12. That's nearer
    // Jan 28 than Apr 28, so April's occurrence is still pending.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2024-04-20');
    mockSingleSchedule({
      start: '2024-01-28',
      amount: -30000,
      frequency: 'monthly',
      interval: 3,
    });
    vi.mocked(db.first).mockResolvedValue({
      id: 1,
      completed: 0,
      next_date: 20240428,
    });
    mockTransactionQueries([
      { amount: -30000, date: '2024-03-12', schedule: 1 },
    ]);
    const { t } = await createScheduleList(
      [rentTemplate],
      '2024-07',
      defaultCategory,
    );

    const outflow = await buildMonthlyOutflow(t, '2024-07', defaultCategory);

    expect(outflow[0]).toBe(60000); // April's pending $300 + July's
  });

  it('settles a pending occurrence only once when it was paid in parts', async () => {
    // Every two weeks, $100, due Oct 12 and Oct 26. On Oct 10, budgeting
    // November: the Oct 12 bill was paid in two linked $50 parts. Both are
    // nearest Oct 12, so Oct 26 is still pending.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2024-10-10');
    mockSingleSchedule({
      start: '2024-09-28',
      amount: -10000,
      frequency: 'weekly',
      interval: 2,
    });
    vi.mocked(db.first).mockResolvedValue({
      id: 1,
      completed: 0,
      next_date: 20241012,
    });
    mockTransactionQueries([
      { amount: -5000, date: '2024-10-09', schedule: 1 },
      { amount: -5000, date: '2024-10-10', schedule: 1 },
    ]);
    const { t } = await createScheduleList(
      [rentTemplate],
      '2024-11',
      defaultCategory,
    );

    const outflow = await buildMonthlyOutflow(t, '2024-11', defaultCategory);

    // Oct 26 pending + Nov 9 + Nov 23
    expect(outflow[0]).toBe(30000);
  });

  it('budgets November in full when October rent is still unpaid', async () => {
    // Regression for budgeting next month early: October's $100 is still
    // in the balance but is spoken for, so November needs its own $100.
    vi.mocked(monthUtils.currentDay).mockReturnValue('2024-10-20');
    mockRent(20241025);

    const result = await runScheduleForecast(
      [rentTemplate],
      '2024-11',
      10000,
      0,
      defaultCategory,
    );

    expect(result.to_budget).toBe(10000);
  });
});

describe('runScheduleForecast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getAccounts).mockResolvedValue([]);
    vi.mocked(aqlQuery).mockResolvedValue({ data: [], dependencies: [] });
  });

  it('contributes the exact monthly amount for a single monthly schedule', async () => {
    const template_lines = [
      {
        type: 'schedule',
        name: 'Rent',
        priority: 0,
        directive: 'template',
      } as const,
    ];
    mockSingleSchedule({
      start: '2024-01-15',
      amount: -10000,
      frequency: 'monthly',
    });

    const result = await runScheduleForecast(
      template_lines,
      '2024-01-01',
      0,
      0,
      defaultCategory,
    );

    expect(result.to_budget).toBe(10000);
  });

  it('never projects a negative month-end balance across two schedules sharing a category', async () => {
    const template_lines = [
      {
        type: 'schedule',
        name: 'Monthly',
        priority: 0,
        directive: 'template',
      } as const,
      {
        type: 'schedule',
        name: 'Yearly',
        priority: 0,
        directive: 'template',
      } as const,
    ];
    mockSchedulesByName({
      Monthly: {
        spec: { start: '2024-01-15', amount: -10000, frequency: 'monthly' },
      },
      Yearly: {
        spec: { start: '2024-12-15', amount: -60000, frequency: 'yearly' },
      },
    });

    const result = await runScheduleForecast(
      template_lines,
      '2024-01-01',
      0,
      0,
      defaultCategory,
    );

    // Re-derive the projection with the returned candidate to check the
    // postcondition directly.
    const { t } = await createScheduleList(
      template_lines as ScheduleTemplate[],
      '2024-01-01',
      defaultCategory,
    );
    const outflow = await buildMonthlyOutflow(t, '2024-01-01', defaultCategory);
    let runningBalance = 0;
    let minBalance = Infinity;
    for (let i = 0; i < 60; i++) {
      runningBalance += result.to_budget - outflow[i];
      minBalance = Math.min(minBalance, runningBalance);
    }
    expect(minBalance).toBeGreaterThanOrEqual(0);
    // And it should be the *minimal* such contribution: one cent less
    // must produce a negative month somewhere.
    let runningBalanceMinusOne = 0;
    let wentNegative = false;
    for (let i = 0; i < 60; i++) {
      runningBalanceMinusOne += result.to_budget - 1 - outflow[i];
      if (runningBalanceMinusOne < 0) wentNegative = true;
    }
    expect(wentNegative).toBe(true);
  });

  it('covers a same-month-due schedule in full immediately rather than smoothing it away', async () => {
    const template_lines = [
      {
        type: 'schedule',
        name: 'DueNow',
        priority: 0,
        directive: 'template',
      } as const,
    ];
    mockSingleSchedule({
      start: '2024-01-15',
      amount: -60000,
      frequency: 'yearly',
    });

    const result = await runScheduleForecast(
      template_lines,
      '2024-01-01',
      0,
      0,
      defaultCategory,
    );

    expect(result.to_budget).toBe(60000);
  });

  it('budgets full-flag schedules on top of, and separate from, the forecast', async () => {
    const template_lines = [
      {
        type: 'schedule',
        name: 'Full',
        full: true,
        priority: 0,
        directive: 'template',
      } as const,
      {
        type: 'schedule',
        name: 'Smooth',
        priority: 0,
        directive: 'template',
      } as const,
    ];
    mockSchedulesByName({
      Full: {
        spec: { start: '2024-12-15', amount: -60000, frequency: 'yearly' },
      },
      Smooth: {
        spec: { start: '2024-01-15', amount: -10000, frequency: 'monthly' },
      },
    });

    const result = await runScheduleForecast(
      template_lines,
      '2024-01-01',
      0,
      0,
      defaultCategory,
    );

    // Full schedule isn't due this month, so its on-top contribution is 0;
    // only the smooth monthly schedule contributes.
    expect(result.to_budget).toBe(10000);
    expect(result.perScheduleMonthly.get(template_lines[1])).toBe(10000);
  });

  it('does not fund a full-flag bill due this month twice', async () => {
    const template_lines = [
      {
        type: 'schedule',
        name: 'Full',
        full: true,
        priority: 0,
        directive: 'template',
      } as const,
      {
        type: 'schedule',
        name: 'Smooth',
        priority: 0,
        directive: 'template',
      } as const,
    ];
    mockSchedulesByName({
      Full: {
        spec: { start: '2024-01-20', amount: -60000, frequency: 'yearly' },
      },
      Smooth: {
        spec: { start: '2024-01-15', amount: -10000, frequency: 'monthly' },
      },
    });

    const result = await runScheduleForecast(
      template_lines,
      '2024-01-01',
      0,
      0,
      defaultCategory,
    );

    // $600 in full for the bill due this month, plus $100 for the monthly
    // one. The $600 is new money, so it doesn't also come off the balance.
    expect(result.to_budget).toBe(70000);
  });

  it('splits perScheduleMonthly by monthly-equivalent contribution, not raw target, for a monthly + yearly mix', async () => {
    const template_lines = [
      {
        type: 'schedule',
        name: 'Monthly',
        priority: 0,
        directive: 'template',
      } as const,
      {
        type: 'schedule',
        name: 'Yearly',
        priority: 0,
        directive: 'template',
      } as const,
    ];
    mockSchedulesByName({
      Monthly: {
        spec: { start: '2024-01-15', amount: -10000, frequency: 'monthly' },
      },
      Yearly: {
        spec: { start: '2024-12-15', amount: -60000, frequency: 'yearly' },
      },
    });

    const result = await runScheduleForecast(
      template_lines,
      '2024-01-01',
      0,
      0,
      defaultCategory,
    );

    // No full-flag entries and a starting balance of 0, so the whole
    // to_budget is the smoothed candidate.
    const candidate = result.to_budget;
    const monthlyShare = result.perScheduleMonthly.get(template_lines[0]);
    const yearlyShare = result.perScheduleMonthly.get(template_lines[1]);
    expect(monthlyShare).toBeDefined();
    expect(yearlyShare).toBeDefined();
    if (monthlyShare === undefined || yearlyShare === undefined) {
      throw new Error('unreachable');
    }

    // Monthly-equivalent weights are 10000 (Monthly, target/1) and 5000
    // (Yearly, target/1/12 = 60000/12) -- a 2:1 ratio -- not the raw
    // 10000:60000 (1:6) ratio a naive split on entry.target would produce.
    expect(monthlyShare / yearlyShare).toBeCloseTo(2, 1);
    // The two shares should still (modulo per-share rounding) add back up
    // to the single smoothed candidate.
    expect(monthlyShare + yearlyShare).toBeGreaterThanOrEqual(candidate - 1);
    expect(monthlyShare + yearlyShare).toBeLessThanOrEqual(candidate + 1);
  });

  it('never produces a non-finite perScheduleMonthly share when smooth schedules in one category offset to a zero net weight', async () => {
    const template_lines = [
      {
        type: 'schedule',
        name: 'Expense',
        priority: 0,
        directive: 'template',
      } as const,
      {
        type: 'schedule',
        name: 'Refund',
        priority: 0,
        directive: 'template',
      } as const,
    ];
    mockSchedulesByName({
      // Monthly-equivalent weight: 10000 (target / interval).
      Expense: {
        spec: { start: '2024-01-15', amount: -10000, frequency: 'monthly' },
      },
      // Monthly-equivalent weight: -120000 / 1 / 12 = -10000, exactly
      // offsetting Expense's weight so the total nets to zero while
      // neither individual weight is zero.
      Refund: {
        spec: { start: '2024-01-15', amount: 120000, frequency: 'yearly' },
      },
    });

    const result = await runScheduleForecast(
      template_lines,
      '2024-01-01',
      0,
      0,
      defaultCategory,
    );

    expect(result.perScheduleMonthly.size).toBe(2);
    for (const share of result.perScheduleMonthly.values()) {
      expect(Number.isFinite(share)).toBe(true);
    }
  });

  it('never underfunds two annual schedules with different due dates, sharing a category (regression: actualbudget/actual#6513)', async () => {
    // #6513: two annual schedules in one category (£100 due Feb, £90 due
    // Mar), with £80 already banked going into January, under-budgeted
    // every month under the old algorithm's independent per-schedule
    // remainder chaining. Assert runScheduleForecast's own postcondition
    // directly: every projected month-end balance stays non-negative.
    const template_lines = [
      {
        type: 'schedule',
        name: 'Bill A',
        priority: 0,
        directive: 'template',
      } as const,
      {
        type: 'schedule',
        name: 'Bill B',
        priority: 0,
        directive: 'template',
      } as const,
    ];
    mockSchedulesByName({
      'Bill A': {
        spec: { start: '2025-02-15', amount: -10000, frequency: 'yearly' },
      },
      'Bill B': {
        spec: { start: '2025-03-15', amount: -9000, frequency: 'yearly' },
      },
    });

    const result = await runScheduleForecast(
      template_lines,
      '2025-01-01',
      8000,
      0,
      defaultCategory,
    );

    const { t } = await createScheduleList(
      template_lines as ScheduleTemplate[],
      '2025-01-01',
      defaultCategory,
    );
    const outflow = await buildMonthlyOutflow(t, '2025-01-01', defaultCategory);
    let runningBalance = 8000;
    let minBalance = Infinity;
    for (let i = 0; i < 60; i++) {
      runningBalance += result.to_budget - outflow[i];
      minBalance = Math.min(minBalance, runningBalance);
    }
    expect(minBalance).toBeGreaterThanOrEqual(0);
  });
});

describe('runScheduleForecast budgeting rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getAccounts).mockResolvedValue([]);
    vi.mocked(aqlQuery).mockResolvedValue({ data: [], dependencies: [] });
  });

  const billTemplate = {
    type: 'schedule',
    name: 'Bill',
    directive: 'template',
    priority: 0,
  } as const;

  it('applies a percent adjustment to the schedule amount', async () => {
    mockSingleSchedule({
      start: '2024-08-15',
      amount: -10000,
      frequency: 'monthly',
    });

    const result = await runScheduleForecast(
      [{ ...billTemplate, adjustment: 10, adjustmentType: 'percent' }],
      '2024-08-01',
      0,
      0,
      defaultCategory,
    );
    expect(result.to_budget).toBe(11000); // $100 × 1.10
  });

  it('applies a fixed adjustment to the schedule amount', async () => {
    mockSingleSchedule({
      start: '2024-08-15',
      amount: -10000,
      frequency: 'monthly',
    });

    const result = await runScheduleForecast(
      [{ ...billTemplate, adjustment: 5, adjustmentType: 'fixed' }],
      '2024-08-01',
      0,
      0,
      defaultCategory,
    );
    expect(result.to_budget).toBe(10500); // $100 + $5
  });

  it('budgets nothing for a completed schedule with no payments', async () => {
    mockSingleSchedule(
      { start: '2024-08-15', amount: -10000, frequency: 'monthly' },
      1,
    );

    const result = await runScheduleForecast(
      [billTemplate],
      '2024-08-01',
      0,
      0,
      defaultCategory,
    );
    expect(result.to_budget).toBe(0);
  });

  it('keeps meeting the deadline for a schedule repeating every 360 days', async () => {
    // Every 360 days is daily in shape but yearly in effect. $500 is due
    // 2026-05-15 and $100 is already saved, so February through May need
    // the remaining $400 at $100 a month (#6644).
    mockSingleSchedule({
      start: '2026-05-15',
      amount: -50000,
      frequency: 'daily',
      interval: 360,
    });

    const result = await runScheduleForecast(
      [billTemplate],
      '2026-02-01',
      10000,
      0,
      defaultCategory,
    );
    expect(result.to_budget).toBe(10000);
  });

  it('budgets nothing while the category holds more than its bills need', async () => {
    // $1,200 due every March. The steady rate is $100 a month, and $5,000
    // banked covers years of it.
    mockSingleSchedule({
      start: '2024-03-15',
      amount: -120000,
      frequency: 'yearly',
    });

    const result = await runScheduleForecast(
      [billTemplate],
      '2024-01-01',
      500000,
      0,
      defaultCategory,
    );
    expect(result.to_budget).toBe(0);
  });

  it('never takes money back out of the category', async () => {
    mockSingleSchedule({
      start: '2024-03-15',
      amount: -120000,
      frequency: 'yearly',
    });

    const result = await runScheduleForecast(
      [billTemplate],
      '2024-01-01',
      10000000,
      0,
      defaultCategory,
    );
    expect(result.to_budget).toBe(0);
  });

  describe('in a tracking budget', () => {
    it('budgets nothing ahead for a bill due in a later month', async () => {
      mockSingleSchedule({
        start: '2024-12-15',
        amount: -12000,
        frequency: 'yearly',
      });
      vi.mocked(isTrackingBudget).mockReturnValue(true);

      const result = await runScheduleForecast(
        [billTemplate],
        '2024-01-01',
        0,
        0,
        defaultCategory,
      );
      expect(result.to_budget).toBe(0);
    });

    it('budgets a bill in full in the month it is due', async () => {
      mockSingleSchedule({
        start: '2024-12-15',
        amount: -12000,
        frequency: 'yearly',
      });
      vi.mocked(isTrackingBudget).mockReturnValue(true);

      const result = await runScheduleForecast(
        [billTemplate],
        '2024-12-01',
        0,
        0,
        defaultCategory,
      );
      expect(result.to_budget).toBe(12000);
    });
  });
});

describe('runScheduleForecast (real AQL query path)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getAccounts).mockResolvedValue([]);
  });

  it('builds and compiles a real unlinked-transaction query for a month-shaped current_month and a weekly schedule', async () => {
    // Integration regression test for Fix 1 (month-shaped `current_month`
    // like '2024-01' must not throw a CompileError from the AQL date
    // caster, which requires day-shaped date literals) and Fix 2 (a
    // weekly, non-monthly schedule must not be over-counted).
    //
    // `#server/aql` is automocked for the rest of this file (see the
    // top-level `vi.mock('#server/aql')`), which is exactly what would
    // hide both of these bugs: the query never actually gets built or
    // compiled. To exercise the real query-building/compiling path we
    // unmock just this module and re-import it (and its dependents) into
    // a fresh module registry, while `#server/db` stays mocked -- so the
    // real AQL compiler runs, and only the actual SQLite read at the very
    // bottom (`db.all`) is stubbed.
    vi.resetModules();
    vi.doUnmock('#server/aql');

    const dbMod = await import('#server/db');
    vi.mocked(dbMod.getAccounts).mockResolvedValue([]);
    vi.mocked(dbMod.first).mockResolvedValue({ id: 1, completed: 0 } as never);
    // The compiler's date caster stores dates as an integer (YYYYMMDD);
    // db.all returns raw SQLite rows, which applyTypes then converts back
    // to a 'yyyy-MM-dd' string via convertOutputType.
    // Return a fresh array/object on every call: `applyTypes` mutates the
    // returned rows in place when converting output types, and this test
    // calls the real query-building path more than once (`runScheduleForecast`
    // internally, then again independently below to verify the result).
    vi.mocked(dbMod.all).mockImplementation(
      async () => [{ amount: -500, date: 20240120 }] as never,
    );

    const scheduleAppMod = await import('#server/schedules/app');
    vi.mocked(scheduleAppMod.getRuleForSchedule).mockResolvedValue(
      makeRule({ start: '2024-01-01', amount: -1000, frequency: 'weekly' }),
    );

    const actionsMod = await import('./actions');
    vi.mocked(actionsMod.isTrackingBudget).mockReturnValue(false);

    const scheduleTemplateMod = await import('./schedule-template');

    const template_lines = [
      {
        type: 'schedule',
        name: 'Weekly Bill',
        priority: 0,
        directive: 'template',
      } as const,
    ];

    try {
      // Month-shaped, as the real budget engine passes it -- this is what
      // Fix 1 makes safe to pass straight to the AQL query.
      const result = await scheduleTemplateMod.runScheduleForecast(
        template_lines,
        '2024-01',
        0,
        0,
        defaultCategory,
      );
      // Re-derive the projection independently to confirm the query result
      // (the unlinked $5 transaction on 2024-01-20) and the weekly
      // schedule's per-occurrence amount were both folded in correctly,
      // rather than asserting a value that could pass by coincidence.
      const { t } = await scheduleTemplateMod.createScheduleList(
        template_lines as ScheduleTemplate[],
        '2024-01',
        defaultCategory,
      );
      const outflow = await scheduleTemplateMod.buildMonthlyOutflow(
        t,
        '2024-01',
        defaultCategory,
      );
      // 5 Mondays in January 2024 x $10 + the $5 unlinked transaction.
      expect(outflow[0]).toBe(5000 + 500);

      let runningBalance = 0;
      let minBalance = Infinity;
      for (let i = 0; i < 60; i++) {
        runningBalance += result.to_budget - outflow[i];
        minBalance = Math.min(minBalance, runningBalance);
      }
      expect(minBalance).toBeGreaterThanOrEqual(0);
    } finally {
      // Restore the file-wide automock and module registry for any tests
      // that run after this one.
      vi.doMock('#server/aql');
      vi.resetModules();
    }
  });
});

describe('solveMonthlyContribution', () => {
  it('finds the minimal whole-cent contribution for a single one-time bill', () => {
    const monthlyOutflow = new Array(60).fill(0);
    monthlyOutflow[30] = 60000; // one bill, due in month 30
    const candidate = solveMonthlyContribution(0, monthlyOutflow, 0);
    // 60000 / 31 months = 1935.48 -> ceil to 1936; verify it actually
    // covers month 30 and is the minimal such whole-cent amount.
    expect(candidate * 31).toBeGreaterThanOrEqual(60000);
    expect((candidate - 1) * 31).toBeLessThan(60000);
  });

  it('picks the month with the larger cumulative threshold, not the one with the larger raw balance', () => {
    // Regression test for a weighting bug in an earlier guess-and-correct
    // version of solveMonthlyContribution (see that function's own doc
    // comment for the derivation). Month 0's threshold is 100 (weight 1);
    // month 59's is higher, at 149, but at any shared candidate near 149
    // its raw shortfall (threshold gap x weight) is *smaller* than month
    // 0's would be, purely because of the (i+1) weighting. The correct
    // answer is governed by whichever month's *threshold* (need / (i+1))
    // is larger — here that's month 59, not whichever month's raw balance
    // looks more negative at some candidate.
    // Month 0's own outflow is 100 (threshold_0 = 100/1 = 100). Month
    // 59's *cumulative* outflow needs to make threshold_59 = 149, i.e.
    // cumsum_59 = 149 * 60 = 8940, with month 0's 100 already part of
    // that cumulative sum.
    const outflow = new Array(60).fill(0);
    outflow[0] = 100;
    outflow[59] = 8940 - 100;

    const candidate = solveMonthlyContribution(0, outflow, 0);
    expect(candidate).toBe(149); // threshold_59, the true max — not threshold_0 (100)

    let runningBalance = 0;
    let minBalance = Infinity;
    for (let i = 0; i < 60; i++) {
      runningBalance += candidate - outflow[i];
      minBalance = Math.min(minBalance, runningBalance);
    }
    expect(minBalance).toBeGreaterThanOrEqual(0);
  });

  // $1,200 due each March and $600 each September, starting in January.
  function yearlyBillsOutflow(startMonth: number) {
    return Array.from({ length: 60 }, (_, i) => {
      const monthOfYear = (startMonth + i) % 12;
      if (monthOfYear === 2) return 120000;
      if (monthOfYear === 8) return 60000;
      return 0;
    });
  }

  it('budgets the steady rate once a category holds exactly what its bills need', () => {
    // The lowest balance the steady $150/month covers is $750 in January.
    expect(solveMonthlyContribution(75000, yearlyBillsOutflow(0), 15000)).toBe(
      15000,
    );
  });

  it('budgets nothing while the category holds more than its bills need', () => {
    expect(solveMonthlyContribution(500000, yearlyBillsOutflow(0), 15000)).toBe(
      0,
    );
  });

  it('covers only what a small surplus does not', () => {
    // $50 over the $750 needed: $150 less the $50 surplus.
    expect(solveMonthlyContribution(80000, yearlyBillsOutflow(0), 15000)).toBe(
      10000,
    );
  });

  it('never asks for less than nothing', () => {
    expect(
      solveMonthlyContribution(10000000, yearlyBillsOutflow(0), 15000),
    ).toBe(0);
  });

  it('uses up a surplus, then settles at the steady rate without going negative', () => {
    let balance = 500000;
    const contributions: number[] = [];
    for (let month = 0; month < 72; month++) {
      const outflow = yearlyBillsOutflow(month);
      const contribution = solveMonthlyContribution(balance, outflow, 15000);
      contributions.push(contribution);
      balance += contribution - outflow[0];
      expect(balance).toBeGreaterThanOrEqual(0);
    }

    const firstPaid = contributions.findIndex(amount => amount > 0);
    expect(firstPaid).toBeGreaterThan(24);
    expect(
      contributions.slice(0, firstPaid).every(amount => amount === 0),
    ).toBe(true);
    // After at most one partial month, every month is the steady rate.
    expect(
      contributions.slice(firstPaid + 1).every(amount => amount === 15000),
    ).toBe(true);
  });

  it('catches up faster than the steady rate when the category is short', () => {
    // Empty in January with $1,200 due in March: $400/month until then.
    expect(solveMonthlyContribution(0, yearlyBillsOutflow(0), 15000)).toBe(
      40000,
    );
  });

  it('spreads the catch-up evenly up to the first bill when bills start a few months out', () => {
    // $190 a month in bills, first due two months from now. The months
    // before the first bill don't pull the steady rate below $190, so the
    // catch-up is $190 over three months, not nearly $190 up front.
    const outflowFrom = (month: number) =>
      Array.from({ length: 60 }, (_, i) => (month + i >= 2 ? 19000 : 0));
    let balance = 0;
    const contributions: number[] = [];
    for (let month = 0; month < 6; month++) {
      const outflow = outflowFrom(month);
      const contribution = solveMonthlyContribution(balance, outflow, 19000);
      contributions.push(contribution);
      balance += contribution - outflow[0];
      expect(balance).toBeGreaterThanOrEqual(0);
    }
    expect(contributions).toEqual([6334, 6333, 6333, 19000, 19000, 19000]);
  });
});

// Budgets attached to the review of actualbudget/actual#8862.
describe('runScheduleForecast on reviewer budgets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getAccounts).mockResolvedValue([]);
    vi.mocked(aqlQuery).mockResolvedValue({ data: [], dependencies: [] });
  });

  const template = (name: string) =>
    ({ type: 'schedule', name, priority: 0, directive: 'template' }) as const;

  it('saves up evenly for monthly bills that start a few months out', async () => {
    const template_lines = [template('Bill A'), template('Bill B')];
    mockSchedulesByName({
      'Bill A': {
        spec: { start: '2026-10-22', amount: -10000, frequency: 'monthly' },
      },
      'Bill B': {
        spec: { start: '2026-10-22', amount: -9000, frequency: 'monthly' },
      },
    });

    const result = await runScheduleForecast(
      template_lines,
      '2026-08',
      0,
      0,
      defaultCategory,
    );

    // $190 due in October, saved over August, September and October.
    expect(result.to_budget).toBe(6334);
  });

  it('gives the catch-up to the schedules that are behind, not a monthly bill that is on pace', async () => {
    const template_lines = [
      template('Monthly'),
      template('Yearly 1'),
      template('Yearly 2'),
    ];
    mockSchedulesByName({
      Monthly: {
        spec: { start: '2026-10-01', amount: -100000, frequency: 'monthly' },
      },
      'Yearly 1': {
        spec: { start: '2027-02-01', amount: -500000, frequency: 'yearly' },
      },
      'Yearly 2': {
        spec: { start: '2027-04-01', amount: -500000, frequency: 'yearly' },
      },
    });

    const result = await runScheduleForecast(
      template_lines,
      '2026-10',
      0,
      0,
      defaultCategory,
    );

    // $17,000 due October through April, over those seven months.
    expect(result.to_budget).toBe(242858);
    expect(result.perScheduleMonthly.get(template_lines[0])).toBe(100000);
    expect(result.perScheduleMonthly.get(template_lines[1])).toBe(71429);
    expect(result.perScheduleMonthly.get(template_lines[2])).toBe(71429);
  });
});

describe('runScheduleForecast with split rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getAccounts).mockResolvedValue([]);
    vi.mocked(aqlQuery).mockResolvedValue({ data: [], dependencies: [] });
  });

  // A paycheck-style schedule: a -$100.00 transaction split into a $30.00
  // portion categorized as the budgeted category and a remainder split that
  // sets only a payee (e.g. a transfer to another account) and no category.
  // Only the categorized split belongs to the budgeted category.
  it('should only budget the splits explicitly assigned to the category', async () => {
    const template_lines = [
      {
        type: 'schedule',
        name: 'Test Schedule',
        priority: 0,
        directive: 'template',
      } as const,
    ];
    mockSingleSchedule({
      start: '2024-08-01',
      amount: -10000,
      frequency: 'monthly',
      actions: [
        {
          op: 'set-split-amount',
          value: -3000,
          options: { method: 'fixed-amount', splitIndex: 1 },
        },
        {
          op: 'set',
          field: 'category',
          value: defaultCategory.id,
          type: 'id',
          options: { splitIndex: 1 },
        },
        {
          op: 'set-split-amount',
          value: null,
          options: { method: 'remainder', splitIndex: 2 },
        },
        {
          op: 'set',
          field: 'payee',
          value: 'other-payee',
          type: 'id',
          options: { splitIndex: 2 },
        },
      ],
    });

    const result = await runScheduleForecast(
      template_lines,
      '2024-08-01',
      0,
      0,
      defaultCategory,
    );

    // Only the categorized split ($30.00) counts; the uncategorized remainder
    // split must not inherit the budgeted category.
    expect(result.to_budget).toBe(3000);
  });
});
