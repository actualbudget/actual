import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { Rule } from '#server/rules';
import { getRuleForSchedule } from '#server/schedules/app';
import type { Currency } from '#shared/currencies';
import type { CategoryEntity } from '#types/models';
import type { ScheduleTemplate } from '#types/models/templates';

import { isTrackingBudget } from './actions';
import {
  buildMonthlyOutflow,
  createScheduleList,
  runSchedule,
  runScheduleForecast,
  solveMonthlyContribution,
} from './schedule-template';

vi.mock('#server/db');
vi.mock('#server/aql');
vi.mock('./actions');
vi.mock('#server/schedules/app', async () => {
  const actualModule = await vi.importActual('#server/schedules/app');
  return {
    ...actualModule,
    getRuleForSchedule: vi.fn(),
  };
});

const defaultCurrency: Currency = {
  code: '',
  symbol: '',
  name: '',
  decimalPlaces: 2,
  numberFormat: 'comma-dot',
  symbolFirst: false,
};

const defaultCategory = { id: '1', name: 'Test Category' } as CategoryEntity;

type RuleSpec = {
  id?: string;
  start: string;
  amount: number;
  frequency: 'monthly' | 'yearly' | 'weekly' | 'daily';
  interval?: number;
};

function makeRule({
  id = 'r',
  start,
  amount,
  frequency,
  interval = 1,
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
    actions: [],
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

describe('runSchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getAccounts).mockResolvedValue([]);
  });

  it('should return correct budget when recurring schedule set', async () => {
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
    });

    const result = await runSchedule(
      template_lines,
      '2024-08-01',
      0,
      0,
      0,
      0,
      [],
      defaultCategory,
      defaultCurrency,
    );

    expect(result.to_budget).toBe(10000);
    expect(result.errors).toHaveLength(0);
    expect(result.remainder).toBe(0);
  });

  it('should return correct budget when yearly recurring schedule set and balance is greater than target', async () => {
    const template_lines = [
      {
        type: 'schedule',
        name: 'Test Schedule',
        directive: 'template',
        priority: 0,
      } as const,
    ];
    mockSingleSchedule({
      start: '2024-08-01',
      amount: -12000,
      frequency: 'yearly',
    });

    const result = await runSchedule(
      template_lines,
      '2024-09-01',
      12000,
      0,
      12000,
      0,
      [],
      defaultCategory,
      defaultCurrency,
    );

    expect(result.to_budget).toBe(1000);
    expect(result.errors).toHaveLength(0);
    expect(result.remainder).toBe(0);
  });

  it('returns a per-template monthly attribution map keyed by template', async () => {
    const template_lines = [
      {
        type: 'schedule',
        name: '  Test Schedule  ',
        directive: 'template',
        priority: 0,
      } as const,
    ];
    mockSingleSchedule({
      start: '2024-08-01',
      amount: -10000,
      frequency: 'monthly',
    });

    const result = await runSchedule(
      template_lines,
      '2024-08-01',
      0,
      0,
      0,
      0,
      [],
      defaultCategory,
      defaultCurrency,
    );

    expect(result.perScheduleMonthly.get(template_lines[0])).toBe(10000);
    expect(result.to_budget).toBe(10000);
  });

  it('handles a pay-month-of monthly schedule alongside a yearly sinking schedule', async () => {
    const template_lines = [
      {
        type: 'schedule',
        name: 'Internet',
        directive: 'template',
        priority: 0,
      } as const,
      {
        type: 'schedule',
        name: 'Insurance',
        directive: 'template',
        priority: 0,
      } as const,
    ];
    mockSchedulesByName({
      Internet: {
        spec: { start: '2024-01-15', amount: -10000, frequency: 'monthly' },
      },
      Insurance: {
        spec: { start: '2024-12-15', amount: -60000, frequency: 'yearly' },
      },
    });

    const result = await runSchedule(
      template_lines,
      '2024-01-01',
      0,
      0,
      0,
      0,
      [],
      defaultCategory,
      defaultCurrency,
    );

    expect(result.errors).toHaveLength(0);
    const internet = result.perScheduleMonthly.get(template_lines[0]) ?? 0;
    const insurance = result.perScheduleMonthly.get(template_lines[1]) ?? 0;
    expect(internet).toBe(10000); // pay-month-of: full target
    expect(insurance).toBeGreaterThan(0);
    expect(insurance).toBeLessThan(internet);
    expect(internet + insurance).toBeCloseTo(result.to_budget, -1);
  });

  it('budgets nothing in advance for a yearly schedule with `full: true`', async () => {
    const template_lines = [
      {
        type: 'schedule',
        name: 'Insurance',
        full: true,
        directive: 'template',
        priority: 0,
      } as const,
    ];
    mockSingleSchedule({
      start: '2024-12-15',
      amount: -60000,
      frequency: 'yearly',
    });

    const result = await runSchedule(
      template_lines,
      '2024-01-01',
      0,
      0,
      0,
      0,
      [],
      defaultCategory,
      defaultCurrency,
    );
    expect(result.to_budget).toBe(0);
    expect(result.perScheduleMonthly.get(template_lines[0])).toBeUndefined();
  });

  it('only attributes contribution to schedules occurring this month when full: true is used', async () => {
    const template_lines = [
      {
        type: 'schedule',
        name: 'Schedule A',
        full: true,
        directive: 'template',
        priority: 0,
      } as const,
      {
        type: 'schedule',
        name: 'Schedule B',
        full: true,
        directive: 'template',
        priority: 0,
      } as const,
    ];
    mockSchedulesByName({
      'Schedule A': {
        spec: { start: '2024-08-01', amount: -10000, frequency: 'monthly' },
      },
      'Schedule B': {
        spec: { start: '2024-09-01', amount: -20000, frequency: 'monthly' },
      },
    });

    const result = await runSchedule(
      template_lines,
      '2024-08-01',
      0,
      0,
      0,
      0,
      [],
      defaultCategory,
      defaultCurrency,
    );

    expect(result.to_budget).toBe(10000);
    expect(result.perScheduleMonthly.get(template_lines[0])).toBe(10000);
    expect(result.perScheduleMonthly.get(template_lines[1])).toBeUndefined();
  });

  it('applies a percent adjustment to the schedule amount', async () => {
    const template_lines = [
      {
        type: 'schedule',
        name: 'Bill',
        adjustment: 10,
        adjustmentType: 'percent',
        directive: 'template',
        priority: 0,
      } as const,
    ];
    mockSingleSchedule({
      start: '2024-08-15',
      amount: -10000,
      frequency: 'monthly',
    });

    const result = await runSchedule(
      template_lines,
      '2024-08-01',
      0,
      0,
      0,
      0,
      [],
      defaultCategory,
      defaultCurrency,
    );
    expect(result.to_budget).toBe(11000); // $100 × 1.10
  });

  it('applies a fixed adjustment to the schedule amount', async () => {
    const template_lines = [
      {
        type: 'schedule',
        name: 'Bill',
        adjustment: 5,
        adjustmentType: 'fixed',
        directive: 'template',
        priority: 0,
      } as const,
    ];
    mockSingleSchedule({
      start: '2024-08-15',
      amount: -10000,
      frequency: 'monthly',
    });

    const result = await runSchedule(
      template_lines,
      '2024-08-01',
      0,
      0,
      0,
      0,
      [],
      defaultCategory,
      defaultCurrency,
    );
    expect(result.to_budget).toBe(10500); // $100 + $5
  });

  it('skips completed schedules from the budget total', async () => {
    const template_lines = [
      {
        type: 'schedule',
        name: 'Done',
        directive: 'template',
        priority: 0,
      } as const,
    ];
    mockSingleSchedule(
      { start: '2024-08-15', amount: -10000, frequency: 'monthly' },
      1,
    );

    const result = await runSchedule(
      template_lines,
      '2024-08-01',
      0,
      0,
      0,
      0,
      [],
      defaultCategory,
      defaultCurrency,
    );
    expect(result.to_budget).toBe(0);
  });

  it('budgets all daily occurrences within the month for a daily schedule', async () => {
    const template_lines = [
      {
        type: 'schedule',
        name: 'Daily Bill',
        directive: 'template',
        priority: 0,
      } as const,
    ];
    mockSingleSchedule({
      start: '2024-01-01',
      amount: -100,
      frequency: 'daily',
    });

    const result = await runSchedule(
      template_lines,
      '2024-01-01',
      0,
      0,
      0,
      0,
      [],
      defaultCategory,
      defaultCurrency,
    );
    expect(result.to_budget).toBe(3100); // 31 days × $1
  });

  it('sorts sinking schedules by next due date so existing balance covers the earliest first', async () => {
    // Templates given in reverse-date order to verify the engine sorts.
    // Sorted (May first): ($1200-$200)/5 + $600/11 = $254.55 → 25455
    // Unsorted (Nov first): ($600-$200)/11 + $1200/5 = $276.36 — the
    // assertion below only matches if the sort runs.
    const template_lines = [
      {
        type: 'schedule',
        name: 'November bill',
        directive: 'template',
        priority: 0,
      } as const,
      {
        type: 'schedule',
        name: 'May bill',
        directive: 'template',
        priority: 0,
      } as const,
    ];
    mockSchedulesByName({
      'November bill': {
        spec: { start: '2024-11-15', amount: -60000, frequency: 'yearly' },
      },
      'May bill': {
        spec: { start: '2024-05-15', amount: -120000, frequency: 'yearly' },
      },
    });

    const result = await runSchedule(
      template_lines,
      '2024-01-01',
      0,
      0,
      20000,
      0,
      [],
      defaultCategory,
      defaultCurrency,
    );

    expect(result.errors).toHaveLength(0);
    expect(result.to_budget).toBe(25455);
  });

  it('records a Past error for a non-repeating schedule whose date has already passed', async () => {
    // Non-repeating (no frequency) and dated before current_month → engine
    // marks it as past rather than rolling forward.
    const template_lines = [
      {
        type: 'schedule',
        name: 'Past',
        directive: 'template',
        priority: 0,
      } as const,
    ];
    vi.mocked(db.first).mockResolvedValue({ id: 1, completed: 0 });
    vi.mocked(getRuleForSchedule).mockResolvedValue(
      new Rule({
        id: 'r',
        stage: 'pre',
        conditionsOp: 'and',
        conditions: [
          { op: 'is', field: 'date', value: '2023-06-01', type: 'date' },
          { op: 'is', field: 'amount', value: -10000, type: 'number' },
        ],
        actions: [],
      }),
    );
    vi.mocked(isTrackingBudget).mockReturnValue(false);

    const result = await runSchedule(
      template_lines,
      '2024-01-01',
      0,
      0,
      0,
      0,
      [],
      defaultCategory,
      defaultCurrency,
    );
    expect(result.errors).toContainEqual(
      expect.stringMatching(/Schedule Past is in the Past/),
    );
    expect(result.to_budget).toBe(0);
  });

  it('contributes target/interval per month for a fully-funded bi-monthly schedule', async () => {
    // Every-2-months from 2024-03-15: interval 2 keeps it out of the
    // pay-month-of fast path. With balance == target the engine takes
    // the base-contribution branch: target / interval = $200 / 2 = $100.
    const template_lines = [
      {
        type: 'schedule',
        name: 'BiMonthly',
        directive: 'template',
        priority: 0,
      } as const,
    ];
    mockSingleSchedule({
      start: '2024-03-15',
      amount: -20000,
      frequency: 'monthly',
      interval: 2,
    });

    const result = await runSchedule(
      template_lines,
      '2024-01-01',
      20000,
      0,
      0,
      0,
      [],
      defaultCategory,
      defaultCurrency,
    );
    expect(result.to_budget).toBe(10000);
  });

  it('contributes target / months-spanned for a fully-funded six-week schedule', async () => {
    // Every 6 weeks from 2024-02-12: outside the weekly pay-month-of
    // cap (≤4), so it sinks. With balance == target the base path runs:
    // prev = subWeeks(2024-02-12, 6) = 2024-01-01, span = 1 month →
    // contribution = $60 / 1 = $60.
    const template_lines = [
      {
        type: 'schedule',
        name: 'EverySixWeeks',
        directive: 'template',
        priority: 0,
      } as const,
    ];
    mockSingleSchedule({
      start: '2024-02-12',
      amount: -6000,
      frequency: 'weekly',
      interval: 6,
    });

    const result = await runSchedule(
      template_lines,
      '2024-01-01',
      6000,
      0,
      0,
      0,
      [],
      defaultCategory,
      defaultCurrency,
    );
    expect(result.to_budget).toBe(6000);
  });

  it('contributes target / months-spanned for a fully-funded sixty-day schedule', async () => {
    // Every 60 days from 2024-03-01: outside the daily pay-month-of
    // cap (≤31), so it sinks. With balance == target the base path
    // runs: prev = subDays(2024-03-01, 60) = 2024-01-01, span = 2
    // months → contribution = $60 / 2 = $30.
    const template_lines = [
      {
        type: 'schedule',
        name: 'EverySixtyDays',
        directive: 'template',
        priority: 0,
      } as const,
    ];
    mockSingleSchedule({
      start: '2024-03-01',
      amount: -6000,
      frequency: 'daily',
      interval: 60,
    });

    const result = await runSchedule(
      template_lines,
      '2024-01-01',
      6000,
      0,
      0,
      0,
      [],
      defaultCategory,
      defaultCurrency,
    );
    expect(result.to_budget).toBe(3000);
  });

  it('absorbs surplus when last-month balance exceeds a sinking schedule target', async () => {
    // Last-month balance ($150) > yearly target ($120). The sink rolls
    // the surplus forward and contributes nothing this month.
    const template_lines = [
      {
        type: 'schedule',
        name: 'Overfunded',
        directive: 'template',
        priority: 0,
      } as const,
    ];
    mockSingleSchedule({
      start: '2024-12-15',
      amount: -12000,
      frequency: 'yearly',
    });

    const result = await runSchedule(
      template_lines,
      '2024-01-01',
      0,
      0,
      15000,
      0,
      [],
      defaultCategory,
      defaultCurrency,
    );
    expect(result.to_budget).toBe(0);
  });

  it('forces sinking schedules into pay-month-of mode when tracking-budget is on', async () => {
    // In tracking mode every schedule is treated as pay-month-of. A
    // far-future yearly schedule that would normally contribute ~$100/mo
    // sinking instead contributes 0 this month, since pay-month-of only
    // counts schedules whose num_months is 0.
    const template_lines = [
      {
        type: 'schedule',
        name: 'YearlyFar',
        directive: 'template',
        priority: 0,
      } as const,
    ];
    vi.mocked(db.first).mockResolvedValue({ id: 1, completed: 0 });
    vi.mocked(getRuleForSchedule).mockResolvedValue(
      makeRule({ start: '2024-12-15', amount: -12000, frequency: 'yearly' }),
    );
    vi.mocked(isTrackingBudget).mockReturnValue(true);

    const result = await runSchedule(
      template_lines,
      '2024-01-01',
      0,
      0,
      0,
      0,
      [],
      defaultCategory,
      defaultCurrency,
    );
    expect(result.to_budget).toBe(0);
  });
});

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
      defaultCurrency,
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
      defaultCurrency,
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
      defaultCurrency,
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
      defaultCurrency,
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
      0,
      [],
      defaultCategory,
      defaultCurrency,
    );

    expect(result.to_budget).toBe(10000);
    expect(result.errors).toHaveLength(0);
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
      0,
      [],
      defaultCategory,
      defaultCurrency,
    );

    // Re-derive the projection with the returned candidate to check the
    // postcondition directly, rather than asserting against runSchedule.
    const { t } = await createScheduleList(
      template_lines as ScheduleTemplate[],
      '2024-01-01',
      defaultCategory,
      defaultCurrency,
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
      0,
      [],
      defaultCategory,
      defaultCurrency,
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
      0,
      [],
      defaultCategory,
      defaultCurrency,
    );

    // Full schedule isn't due this month, so its on-top contribution is 0;
    // only the smooth monthly schedule contributes.
    expect(result.to_budget).toBe(10000);
    expect(result.perScheduleMonthly.get(template_lines[1])).toBe(10000);
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
      0,
      [],
      defaultCategory,
      defaultCurrency,
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
      0,
      [],
      defaultCategory,
      defaultCurrency,
    );

    expect(result.perScheduleMonthly.size).toBe(2);
    for (const share of result.perScheduleMonthly.values()) {
      expect(Number.isFinite(share)).toBe(true);
    }
  });

  it('never underfunds two annual schedules with different due dates, sharing a category (regression: actualbudget/actual#6513)', async () => {
    // #6513: two annual schedules in one category (£100 due Feb, £90 due
    // Mar), with £80 already banked going into January, under-budgeted
    // every month under runSchedule's independent per-schedule remainder
    // chaining. Assert runScheduleForecast's own postcondition directly —
    // every projected month-end balance stays non-negative — rather than
    // comparing its output against runSchedule's.
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
      8000,
      0,
      [],
      defaultCategory,
      defaultCurrency,
    );

    const { t } = await createScheduleList(
      template_lines as ScheduleTemplate[],
      '2025-01-01',
      defaultCategory,
      defaultCurrency,
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
        0,
        [],
        defaultCategory,
        defaultCurrency,
      );

      expect(result.errors).toHaveLength(0);
      // Re-derive the projection independently to confirm the query result
      // (the unlinked $5 transaction on 2024-01-20) and the weekly
      // schedule's per-occurrence amount were both folded in correctly,
      // rather than asserting a value that could pass by coincidence.
      const { t } = await scheduleTemplateMod.createScheduleList(
        template_lines as ScheduleTemplate[],
        '2024-01',
        defaultCategory,
        defaultCurrency,
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
    const candidate = solveMonthlyContribution(0, monthlyOutflow);
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

    const candidate = solveMonthlyContribution(0, outflow);
    expect(candidate).toBe(149); // threshold_59, the true max — not threshold_0 (100)

    let runningBalance = 0;
    let minBalance = Infinity;
    for (let i = 0; i < 60; i++) {
      runningBalance += candidate - outflow[i];
      minBalance = Math.min(minBalance, runningBalance);
    }
    expect(minBalance).toBeGreaterThanOrEqual(0);
  });
});
