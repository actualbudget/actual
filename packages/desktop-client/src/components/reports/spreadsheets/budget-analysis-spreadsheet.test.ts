import { send } from '@actual-app/core/platform/client/connection';
import { rangeInclusive } from '@actual-app/core/shared/months';
import type { CategoryEntity } from '@actual-app/core/types/models';

import {
  createBudgetAnalysisSpreadsheet,
  getLastSelectableMonth,
  getNextRunningBalance,
  isBaseCategory,
  summarizeMonthCategories,
} from './budget-analysis-spreadsheet';
import type { BudgetMonthCell } from './budgetMonthCell';

const makeCategory = (
  overrides: Partial<CategoryEntity> & Pick<CategoryEntity, 'id' | 'name'>,
): CategoryEntity => ({
  is_income: false,
  hidden: false,
  group: 'group1',
  ...overrides,
});

const visibleExpense = makeCategory({ id: 'c1', name: 'Groceries' });
const hiddenExpense = makeCategory({
  id: 'c2',
  name: 'Car Fund',
  hidden: true,
});
const incomeCategory = makeCategory({
  id: 'c3',
  name: 'Salary',
  is_income: true,
});
const hiddenIncome = makeCategory({
  id: 'c4',
  name: 'Hidden Income',
  is_income: true,
  hidden: true,
});

const all = [visibleExpense, hiddenExpense, incomeCategory, hiddenIncome];

function filterBaseCategories(
  categories: CategoryEntity[],
  showHiddenCategories: boolean,
  hiddenGroupIds: ReadonlySet<string> = new Set(),
): CategoryEntity[] {
  return categories.filter(cat =>
    isBaseCategory(cat, showHiddenCategories, hiddenGroupIds),
  );
}

describe('createBudgetAnalysisSpreadsheet', () => {
  describe('hidden category filtering', () => {
    it('excludes hidden categories when showHiddenCategories is false', () => {
      const result = filterBaseCategories(all, false);
      expect(result).toContain(visibleExpense);
      expect(result).not.toContain(hiddenExpense);
    });

    it('includes hidden expense categories when showHiddenCategories is true', () => {
      const result = filterBaseCategories(all, true);
      expect(result).toContain(visibleExpense);
      expect(result).toContain(hiddenExpense);
    });

    it('always excludes income categories regardless of showHiddenCategories', () => {
      const resultFalse = filterBaseCategories(all, false);
      const resultTrue = filterBaseCategories(all, true);
      expect(resultFalse).not.toContain(incomeCategory);
      expect(resultFalse).not.toContain(hiddenIncome);
      expect(resultTrue).not.toContain(incomeCategory);
      expect(resultTrue).not.toContain(hiddenIncome);
    });

    it('returns only visible expense categories by default', () => {
      const result = filterBaseCategories(all, false);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(visibleExpense);
    });

    it('returns all expense categories when flag is true', () => {
      const result = filterBaseCategories(all, true);
      expect(result).toHaveLength(2);
      expect(result).toContain(visibleExpense);
      expect(result).toContain(hiddenExpense);
    });

    describe('hidden category groups', () => {
      const inHiddenGroup = makeCategory({
        id: 'c5',
        name: 'Boat',
        group: 'hiddenGroup',
      });
      const hiddenGroupIds = new Set(['hiddenGroup']);

      it('excludes a visible category in a hidden group when showHiddenCategories is false', () => {
        expect(
          filterBaseCategories(
            [visibleExpense, inHiddenGroup],
            false,
            hiddenGroupIds,
          ),
        ).toEqual([visibleExpense]);
      });

      it('includes a visible category in a hidden group when showHiddenCategories is true', () => {
        expect(
          filterBaseCategories(
            [visibleExpense, inHiddenGroup],
            true,
            hiddenGroupIds,
          ),
        ).toEqual([visibleExpense, inHiddenGroup]);
      });

      it('never includes an income category in a hidden group', () => {
        const income = { ...inHiddenGroup, is_income: true };

        expect(filterBaseCategories([income], false, hiddenGroupIds)).toEqual(
          [],
        );
        expect(filterBaseCategories([income], true, hiddenGroupIds)).toEqual(
          [],
        );
      });

      it.each([
        ['unknown', 'no-such-group'],
        ['null', null],
        ['undefined', undefined],
        ['empty', ''],
      ])('keeps a category whose group id is %s', (_label, group) => {
        const orphan = makeCategory({
          id: 'c6',
          name: 'Orphan',
          group: group as string,
        });

        expect(filterBaseCategories([orphan], false, hiddenGroupIds)).toEqual([
          orphan,
        ]);
      });
    });
  });

  describe('getLastSelectableMonth', () => {
    it('extends the range to December of next year', () => {
      expect(getLastSelectableMonth('2026-06', '2026-06')).toBe('2027-12');
    });

    it('ends in December regardless of the current month', () => {
      for (const month of ['2024-01', '2024-06', '2024-12']) {
        expect(getLastSelectableMonth(month, month)).toBe('2025-12');
      }
    });

    it('keeps a later transaction month selectable', () => {
      // A transaction dated past December of next year must not be cut off.
      expect(getLastSelectableMonth('2026-08', '2028-03')).toBe('2028-03');
    });

    it('prefers December of next year when the latest transaction is earlier', () => {
      expect(getLastSelectableMonth('2026-08', '2026-11')).toBe('2027-12');
    });

    it('keeps the boundary month itself', () => {
      expect(getLastSelectableMonth('2026-08', '2027-12')).toBe('2027-12');
    });

    it('produces a range that spans from the earliest month to the endpoint', () => {
      const range = rangeInclusive(
        '2026-06',
        getLastSelectableMonth('2026-06', '2026-06'),
      );

      expect(range[0]).toBe('2026-06');
      expect(range[range.length - 1]).toBe('2027-12');
    });

    it('lists future months before the current month once reversed', () => {
      const last = getLastSelectableMonth('2026-06', '2026-06');
      const allMonths = rangeInclusive('2026-06', last).reverse();

      expect(allMonths[0]).toBe(last);
      expect(allMonths[allMonths.length - 1]).toBe('2026-06');
    });
  });

  describe('summarizeMonthCategories', () => {
    const cells = (
      values: Record<string, number | boolean>,
    ): BudgetMonthCell[] =>
      Object.entries(values).map(([name, value]) => ({
        name: `budget202601!${name}`,
        value,
      })) as BudgetMonthCell[];

    it('reports no budget data when every cell is empty', () => {
      const result = summarizeMonthCategories([], [visibleExpense]);

      expect(result).toEqual({
        budgeted: 0,
        spent: 0,
        carryoverToNextMonth: 0,
        overspendingThisMonth: 0,
        hasBudgetData: false,
      });
    });

    it('reports no budget data for a never-budgeted month', () => {
      // `envelope-budget-month` emits a cell for every category in every
      // month, so an untouched future month arrives as present-but-zero
      // cells rather than as missing ones. Presence alone cannot distinguish
      // it from a real month.
      const result = summarizeMonthCategories(
        cells({
          'budget-c1': 0,
          'sum-amount-c1': 0,
          'leftover-c1': 0,
          'carryover-c1': false,
        }),
        [visibleExpense],
      );

      expect(result.hasBudgetData).toBe(false);
    });

    it('carries a positive balance to the next month', () => {
      const result = summarizeMonthCategories(
        cells({
          'budget-c1': 10000,
          'sum-amount-c1': -4000,
          'leftover-c1': 6000,
          'carryover-c1': false,
        }),
        [visibleExpense],
      );

      expect(result.carryoverToNextMonth).toBe(6000);
      expect(result.overspendingThisMonth).toBe(0);
      expect(result.hasBudgetData).toBe(true);
    });

    it('treats an overspend without carryover as an overspending adjustment', () => {
      const result = summarizeMonthCategories(
        cells({
          'budget-c1': 0,
          'sum-amount-c1': -10000,
          'leftover-c1': -10000,
          'carryover-c1': false,
        }),
        [visibleExpense],
      );

      expect(result.carryoverToNextMonth).toBe(0);
      expect(result.overspendingThisMonth).toBe(-10000);
      expect(result.hasBudgetData).toBe(true);
    });

    it('carries a negative balance forward when carryover is enabled', () => {
      const result = summarizeMonthCategories(
        cells({
          'budget-c1': 0,
          'sum-amount-c1': -10000,
          'leftover-c1': -10000,
          'carryover-c1': true,
        }),
        [visibleExpense],
      );

      expect(result.carryoverToNextMonth).toBe(-10000);
      expect(result.overspendingThisMonth).toBe(0);
    });

    it('only counts the categories it is given', () => {
      const result = summarizeMonthCategories(
        cells({
          'budget-c1': 10000,
          'leftover-c1': 10000,
          'budget-c2': 5000,
          'leftover-c2': 5000,
        }),
        [visibleExpense],
      );

      expect(result.budgeted).toBe(10000);
      expect(result.carryoverToNextMonth).toBe(10000);
    });
  });

  describe('getNextRunningBalance', () => {
    it('hands off only what carries over when the month has data', () => {
      expect(
        getNextRunningBalance({
          hasBudgetData: true,
          carryoverToNextMonth: 6000,
          runningBalance: 20000,
        }),
      ).toBe(6000);
    });

    it('resets a non-carryover overspend instead of dragging it forward', () => {
      // The overspend surfaces as next month's overspending adjustment, so it
      // must not also reduce the running balance.
      expect(
        getNextRunningBalance({
          hasBudgetData: true,
          carryoverToNextMonth: 0,
          runningBalance: 20000,
        }),
      ).toBe(0);
    });

    it('passes the running balance through months with no budget data', () => {
      expect(
        getNextRunningBalance({
          hasBudgetData: false,
          carryoverToNextMonth: 0,
          runningBalance: 20000,
        }),
      ).toBe(20000);
    });

    it('preserves a balance across a run of empty future months', () => {
      let runningBalance = 15000;
      for (let i = 0; i < 6; i++) {
        runningBalance = getNextRunningBalance({
          hasBudgetData: false,
          carryoverToNextMonth: 0,
          runningBalance,
        });
      }

      expect(runningBalance).toBe(15000);
    });

    it('does not carry a non-carryover overspend into later empty months', () => {
      // Overspend of -10000 in a category without carryover enabled.
      let runningBalance = getNextRunningBalance({
        hasBudgetData: true,
        carryoverToNextMonth: 0,
        runningBalance: 0,
      });

      for (let i = 0; i < 3; i++) {
        runningBalance = getNextRunningBalance({
          hasBudgetData: false,
          carryoverToNextMonth: 0,
          runningBalance,
        });
      }

      expect(runningBalance).toBe(0);
    });
  });
});

vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: vi.fn(),
}));

type SpreadsheetProps = Parameters<typeof createBudgetAnalysisSpreadsheet>[0];

async function runSpreadsheet(
  props: Partial<SpreadsheetProps>,
  sendImpl: (name: string, args: { month: string }) => unknown,
) {
  vi.mocked(send).mockImplementation((async (
    name: string,
    args: { month: string },
  ) => sendImpl(name, args)) as never);

  const setData = vi.fn();
  await createBudgetAnalysisSpreadsheet({
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    ...props,
  })(null as never, setData);

  return setData.mock.calls[0][0];
}

describe('createBudgetAnalysisSpreadsheet categories', () => {
  const visibleGroup = { id: 'visible', name: 'Bills', hidden: false };
  const hiddenGroup = { id: 'hidden', name: 'Old Stuff', hidden: true };

  const rent = makeCategory({ id: 'rent', name: 'Rent', group: 'visible' });
  const gym = makeCategory({
    id: 'gym',
    name: 'Gym',
    group: 'visible',
    hidden: true,
  });
  const boat = makeCategory({ id: 'boat', name: 'Boat', group: 'hidden' });

  // Budgeted amounts are distinct powers of ten so a total names exactly which
  // categories it counted.
  const budgetedById: Record<string, number> = {
    rent: 100,
    gym: 1000,
    boat: 10000,
  };

  function run({
    list = [rent, gym, boat],
    grouped = [visibleGroup, hiddenGroup],
    ...props
  }: Partial<SpreadsheetProps> & {
    list?: CategoryEntity[];
    grouped?: Array<{ id: string; name: string; hidden?: boolean }>;
  } = {}) {
    return runSpreadsheet(props, name =>
      name === 'get-categories'
        ? { list, grouped }
        : list.map(cat => ({
            name: `sheet!budget-${cat.id}`,
            value: budgetedById[cat.id] ?? 0,
          })),
    );
  }

  function conditions(field: string, op: string, value: string) {
    return [{ field, op, value }] as SpreadsheetProps['conditions'];
  }

  it('excludes hidden categories and categories in hidden groups by default', async () => {
    expect((await run()).totalBudgeted).toBe(100);
  });

  it('includes them when showHiddenCategories is true', async () => {
    const data = await run({ showHiddenCategories: true });

    expect(data.totalBudgeted).toBe(11100);
  });

  it('reports zero when a category filter only matches a category in a hidden group', async () => {
    const filter = conditions('category', 'is', 'boat');

    expect((await run({ conditions: filter })).totalBudgeted).toBe(0);
    expect(
      (await run({ conditions: filter, showHiddenCategories: true }))
        .totalBudgeted,
    ).toBe(10000);
  });

  it('reports zero when a group filter targets a hidden group', async () => {
    const filter = conditions('category_group', 'is', 'hidden');

    expect((await run({ conditions: filter })).totalBudgeted).toBe(0);
    expect(
      (await run({ conditions: filter, showHiddenCategories: true }))
        .totalBudgeted,
    ).toBe(10000);
  });

  it('keeps hidden group categories out of a negated filter', async () => {
    const filter = conditions('category_group', 'isNot', 'other');

    expect((await run({ conditions: filter })).totalBudgeted).toBe(100);
  });

  it('matches a hidden group by name only when showHiddenCategories is true', async () => {
    const filter = conditions('category_group', 'contains', 'old');

    expect((await run({ conditions: filter })).totalBudgeted).toBe(0);
    expect(
      (await run({ conditions: filter, showHiddenCategories: true }))
        .totalBudgeted,
    ).toBe(10000);
  });

  it('keeps a filter on a visible group working', async () => {
    const filter = conditions('category_group', 'is', 'visible');

    expect((await run({ conditions: filter })).totalBudgeted).toBe(100);
    expect(
      (await run({ conditions: filter, showHiddenCategories: true }))
        .totalBudgeted,
    ).toBe(1100);
  });

  it('keeps categories whose group is unknown or missing', async () => {
    const list = [
      makeCategory({ id: 'rent', name: 'Rent', group: 'no-such-group' }),
      makeCategory({ id: 'gym', name: 'Gym', group: null as never }),
      boat,
    ];

    expect((await run({ list })).totalBudgeted).toBe(1100);
    expect((await run({ list, grouped: [] })).totalBudgeted).toBe(11100);
  });

  it('treats a group without a hidden flag as visible', async () => {
    const data = await run({
      list: [boat],
      grouped: [{ id: 'hidden', name: 'Old Stuff' }],
    });

    expect(data.totalBudgeted).toBe(10000);
  });
});

describe('createBudgetAnalysisSpreadsheet overspending before the period', () => {
  const food = makeCategory({ id: 'food', name: 'Food', group: 'g' });
  const rent = makeCategory({ id: 'rent', name: 'Rent', group: 'g' });

  type Values = Record<string, number | boolean>;

  // `cellsByMonth` holds raw cells, keyed by month and then by cell name.
  function run(
    cellsByMonth: Record<string, Values>,
    { endDate = '2026-02-28', categories = [food, rent] } = {},
  ) {
    return runSpreadsheet({ endDate }, (name, args) =>
      name === 'get-categories'
        ? { list: categories, grouped: [{ id: 'g', name: 'G' }] }
        : Object.entries(cellsByMonth[args.month] ?? {}).map(
            ([cell, value]) => ({ name: `sheet!${cell}`, value }),
          ),
    );
  }

  function adjustments(data: {
    intervalData: Array<{ overspendingAdjustment: number }>;
  }) {
    return data.intervalData.map(month => month.overspendingAdjustment);
  }

  it('surfaces as the first month adjustment and in the total', async () => {
    const data = await run({ '2025-12': { 'leftover-food': -50 } });

    expect(adjustments(data)).toEqual([50, 0]);
    expect(data.totalOverspendingAdjustment).toBe(50);
  });

  it('adds to later adjustments in the total', async () => {
    const data = await run({
      '2025-12': { 'leftover-food': -50 },
      '2026-01': { 'leftover-food': -30 },
    });

    expect(adjustments(data)).toEqual([50, 30]);
    expect(data.totalOverspendingAdjustment).toBe(80);
  });

  it('leaves the overspend of the final month out of the total', async () => {
    const data = await run(
      {
        '2025-12': { 'leftover-food': -50 },
        '2026-01': { 'leftover-food': -30 },
      },
      { endDate: '2026-01-31' },
    );

    expect(data.totalOverspendingAdjustment).toBe(50);
    expect(data.finalOverspendingAdjustment).toBe(-30);
  });

  it('skips categories with carryover or a surplus', async () => {
    const data = await run({
      '2025-12': {
        'leftover-food': -50,
        'leftover-rent': -70,
        'carryover-rent': true,
      },
    });

    expect(adjustments(data)).toEqual([50, 0]);
  });

  it.each([
    ['carryover on', { 'leftover-food': -50, 'carryover-food': true }],
    ['a zero balance', { 'leftover-food': 0 }],
    ['a positive balance', { 'leftover-food': 25 }],
    ['no budget data', {}],
  ])('stays at 0 with %s', async (_label, previous: Values) => {
    const data = await run({ '2025-12': previous });

    expect(adjustments(data)).toEqual([0, 0]);
    expect(data.totalOverspendingAdjustment).toBe(0);
  });

  it('does not change the balance, budgeted or spent figures', async () => {
    const months = {
      '2026-01': {
        'budget-food': 100,
        'sum-amount-food': -60,
        'leftover-food': 40,
      },
    };
    const withOverspend = await run({
      ...months,
      '2025-12': { 'leftover-food': -50 },
    });
    const withoutOverspend = await run(months);

    expect(withOverspend.intervalData[0].balance).toBe(40);
    expect(
      withOverspend.intervalData.map(
        (month: { balance: number }) => month.balance,
      ),
    ).toEqual(
      withoutOverspend.intervalData.map(
        (month: { balance: number }) => month.balance,
      ),
    );
    expect(withOverspend.totalBudgeted).toBe(withoutOverspend.totalBudgeted);
    expect(withOverspend.totalSpent).toBe(withoutOverspend.totalSpent);
  });

  it('only counts categories in the report', async () => {
    const data = await run(
      { '2025-12': { 'leftover-food': -50, 'leftover-rent': -7000 } },
      { categories: [food] },
    );

    expect(adjustments(data)).toEqual([50, 0]);
  });
});
