import { send } from '@actual-app/core/platform/client/connection';
import type { BudgetType } from '@actual-app/core/server/prefs';
import { rangeInclusive } from '@actual-app/core/shared/months';
import type { CategoryEntity } from '@actual-app/core/types/models';

import {
  calculateBudgetAnalysis,
  createBudgetAnalysisSpreadsheet,
  getLastSelectableMonth,
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
): CategoryEntity[] {
  return categories.filter(cat => isBaseCategory(cat, showHiddenCategories));
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
      const result = summarizeMonthCategories([], [visibleExpense], 'envelope');

      expect(result).toEqual({
        budgeted: 0,
        spent: 0,
        carryoverToNextMonth: 0,
        overspendingThisMonth: 0,
        hasBudgetData: false,
      });
    });

    it('reports no budget data for a never-budgeted month', () => {
      // Both `envelope-budget-month` and `tracking-budget-month` emit a cell
      // for every category in every month, so an untouched future month
      // arrives as present-but-zero cells rather than as missing ones.
      // Presence alone cannot distinguish it from a real month.
      const result = summarizeMonthCategories(
        cells({
          'budget-c1': 0,
          'sum-amount-c1': 0,
          'leftover-c1': 0,
          'carryover-c1': false,
        }),
        [visibleExpense],
        'envelope',
      );

      expect(result.hasBudgetData).toBe(false);
    });

    it('treats a null cell value as zero', () => {
      const result = summarizeMonthCategories(
        [
          { name: 'budget202601!leftover-c1', value: null },
        ] as unknown as BudgetMonthCell[],
        [visibleExpense],
        'tracking',
      );

      expect(result.carryoverToNextMonth).toBe(0);
      expect(result.hasBudgetData).toBe(false);
    });

    it('carries a positive balance without carryover only under envelope budgeting', () => {
      const values = cells({
        'budget-c1': 10000,
        'sum-amount-c1': -4000,
        'leftover-c1': 6000,
        'carryover-c1': false,
      });

      expect(
        summarizeMonthCategories(values, [visibleExpense], 'envelope')
          .carryoverToNextMonth,
      ).toBe(6000);
      expect(
        summarizeMonthCategories(values, [visibleExpense], 'tracking')
          .carryoverToNextMonth,
      ).toBe(0);
    });

    it.each(['envelope', 'tracking'] as const)(
      'carries a negative balance when carryover is enabled (%s)',
      budgetType => {
        const result = summarizeMonthCategories(
          cells({ 'leftover-c1': -10000, 'carryover-c1': true }),
          [visibleExpense],
          budgetType,
        );

        expect(result.carryoverToNextMonth).toBe(-10000);
        expect(result.overspendingThisMonth).toBe(0);
      },
    );

    it('does not match a cell for another category with the same suffix', () => {
      const result = summarizeMonthCategories(
        cells({ 'group-budget-c1': 999, 'leftover-pos-c1': 999 }),
        [visibleExpense],
        'envelope',
      );

      expect(result.budgeted).toBe(0);
      expect(result.carryoverToNextMonth).toBe(0);
    });

    it('treats an overspend without carryover as an overspending adjustment under envelope budgeting', () => {
      const result = summarizeMonthCategories(
        cells({ 'leftover-c1': -10000, 'carryover-c1': false }),
        [visibleExpense],
        'envelope',
      );

      expect(result.carryoverToNextMonth).toBe(0);
      expect(result.overspendingThisMonth).toBe(-10000);
    });

    it('has no overspending adjustment under tracking budgeting', () => {
      const result = summarizeMonthCategories(
        cells({ 'leftover-c1': -10000, 'carryover-c1': false }),
        [visibleExpense],
        'tracking',
      );

      expect(result.carryoverToNextMonth).toBe(0);
      expect(result.overspendingThisMonth).toBe(0);
    });

    it('does not count an overspend with carryover enabled as an adjustment', () => {
      const result = summarizeMonthCategories(
        cells({ 'leftover-c1': -10000, 'carryover-c1': true }),
        [visibleExpense],
        'envelope',
      );

      expect(result.overspendingThisMonth).toBe(0);
    });

    it('does not count a zero or positive balance as an overspend', () => {
      for (const leftover of [0, 5000]) {
        const result = summarizeMonthCategories(
          cells({ 'leftover-c1': leftover, 'carryover-c1': false }),
          [visibleExpense],
          'envelope',
        );

        expect(result.overspendingThisMonth).toBe(0);
      }
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
        'envelope',
      );

      expect(result.budgeted).toBe(10000);
      expect(result.carryoverToNextMonth).toBe(10000);
    });
  });
});

describe('calculateBudgetAnalysis', () => {
  type CategoryValues = {
    budgeted?: number;
    spent?: number;
    balance?: number;
    carryover?: boolean;
  };

  function categoryCells(
    id: string,
    { budgeted = 0, spent = 0, balance = 0, carryover = false }: CategoryValues,
  ) {
    return [
      { name: `budget202601!budget-${id}`, value: budgeted },
      { name: `budget202601!sum-amount-${id}`, value: spent },
      { name: `budget202601!leftover-${id}`, value: balance },
      { name: `budget202601!carryover-${id}`, value: carryover },
    ] as BudgetMonthCell[];
  }

  const food = makeCategory({ id: 'food', name: 'Food' });
  const rent = makeCategory({ id: 'rent', name: 'Rent' });

  function calculateFrom(
    budgetType: BudgetType,
    previous: CategoryValues,
    ...months: CategoryValues[]
  ) {
    return calculateBudgetAnalysis({
      budgetType,
      previousMonth: summarizeMonthCategories(
        categoryCells('food', previous),
        [food],
        budgetType,
      ),
      months: months.map((values, index) => ({
        date: `2026-0${index + 1}`,
        ...summarizeMonthCategories(
          categoryCells('food', values),
          [food],
          budgetType,
        ),
      })),
    });
  }

  function calculate(budgetType: BudgetType, ...months: CategoryValues[]) {
    return calculateFrom(budgetType, {}, ...months);
  }

  describe.each(['envelope', 'tracking'] as const)('%s budgets', budgetType => {
    it('passes a carried balance through months with no budget data', () => {
      const { intervalData } = calculate(
        budgetType,
        { budgeted: 100, spent: -50, balance: 50, carryover: true },
        {},
        {},
      );

      expect(intervalData.map(month => month.balance)).toEqual([50, 50, 50]);
    });

    it('passes a carried balance into a period that starts with no budget data', () => {
      const { intervalData } = calculateFrom(
        budgetType,
        { balance: 75, carryover: true },
        {},
      );

      expect(intervalData[0].balance).toBe(75);
    });

    it('resets an overspend without carryover in an inactive month', () => {
      const { intervalData } = calculate(
        budgetType,
        { budgeted: 100, spent: -150, balance: -50 },
        {},
      );

      expect(intervalData.map(month => month.balance)).toEqual([-50, 0]);
    });

    it('reports a zero balance for a period with no budget data', () => {
      const { intervalData } = calculate(budgetType, {}, {});

      expect(intervalData.map(month => month.balance)).toEqual([0, 0]);
    });

    it('sums balances across categories with different carryover settings', () => {
      const categories = [food, rent];
      const { intervalData } = calculateBudgetAnalysis({
        budgetType,
        previousMonth: summarizeMonthCategories(
          [
            ...categoryCells('food', { balance: 30, carryover: true }),
            ...categoryCells('rent', { balance: -70, carryover: false }),
          ],
          categories,
          budgetType,
        ),
        months: [
          {
            date: '2026-01',
            ...summarizeMonthCategories(
              [
                ...categoryCells('food', {
                  budgeted: 100,
                  spent: -100,
                  balance: 30,
                }),
                ...categoryCells('rent', { budgeted: 100, spent: -100 }),
              ],
              categories,
              budgetType,
            ),
          },
        ],
      });

      expect(intervalData[0].balance).toBe(30);
    });

    it('reports variance for each month and as a running total', () => {
      const data = calculate(
        budgetType,
        { budgeted: 100, spent: -130, balance: -30 },
        { budgeted: 100, spent: -60, balance: 40 },
        { budgeted: 100, spent: -100, balance: 0 },
      );

      expect(data.intervalData.map(month => month.variance)).toEqual([
        -30, 40, 0,
      ]);
      expect(data.intervalData.map(month => month.cumulativeVariance)).toEqual([
        -30, 10, 10,
      ]);
      expect(data.totalVariance).toBe(10);
    });

    it('leaves a balance carried in from before the period out of the variance', () => {
      const { totalVariance, intervalData } = calculateFrom(
        budgetType,
        { balance: 500, carryover: true },
        { budgeted: 100, spent: -100, balance: 500 },
      );

      expect(intervalData[0].balance).toBe(500);
      expect(totalVariance).toBe(0);
    });

    it('treats a spending refund as favourable', () => {
      const { totalVariance } = calculate(budgetType, {
        budgeted: 0,
        spent: 25,
        balance: 25,
      });

      expect(totalVariance).toBe(25);
    });

    it('keeps the running variance flat through months with no budget data', () => {
      const { intervalData } = calculate(
        budgetType,
        { budgeted: 100, spent: -150, balance: -50 },
        {},
      );

      expect(intervalData.map(month => month.cumulativeVariance)).toEqual([
        -50, -50,
      ]);
    });

    it('returns zero totals for an empty period', () => {
      const data = calculate(budgetType);

      expect(data.intervalData).toEqual([]);
      expect(data.totalVariance).toBe(0);
      expect(data.budgetType).toBe(budgetType);
    });
  });

  it('resets a positive tracking balance in an inactive month when carryover is off', () => {
    const { intervalData } = calculate(
      'tracking',
      { budgeted: 100, spent: -50, balance: 50 },
      {},
    );

    expect(intervalData.map(month => month.balance)).toEqual([50, 0]);
  });

  it('matches the balance a tracking budget computes for each month', () => {
    // leftover[m] = budget[m] + spent[m] + (carryover[m-1] ? leftover[m-1] : 0)
    const months = [
      { budgeted: 500, spent: -300, carryover: true },
      { budgeted: 500, spent: -900, carryover: false },
      { budgeted: 500, spent: -500, carryover: true },
      { budgeted: 0, spent: -25, carryover: false },
    ];
    let carried = 0;
    const withLeftovers = months.map(month => {
      const balance = month.budgeted + month.spent + carried;
      carried = month.carryover ? balance : 0;
      return { ...month, balance };
    });

    const { intervalData } = calculate('tracking', ...withLeftovers);

    expect(intervalData.map(month => month.balance)).toEqual(
      withLeftovers.map(month => month.balance),
    );
  });

  it('carries a positive envelope balance forward without carryover', () => {
    const { intervalData } = calculate(
      'envelope',
      { budgeted: 100, spent: -60, balance: 40 },
      { budgeted: 0, spent: -10, balance: 30 },
    );

    expect(intervalData.map(month => month.balance)).toEqual([40, 30]);
  });

  it('surfaces an envelope overspend as the next month adjustment', () => {
    const data = calculate(
      'envelope',
      { budgeted: 100, spent: -150, balance: -50 },
      { budgeted: 100, spent: -100, balance: 0 },
    );

    expect(data.intervalData[0].overspendingAdjustment).toBe(0);
    expect(data.intervalData[1].overspendingAdjustment).toBe(50);
    expect(data.intervalData[1].balance).toBe(0);
    expect(data.totalOverspendingAdjustment).toBe(50);
  });

  it('has no overspending adjustment on tracking budgets', () => {
    const data = calculate(
      'tracking',
      { budgeted: 100, spent: -150, balance: -50 },
      { budgeted: 100, spent: -100, balance: 0 },
    );

    expect(data.intervalData[1].overspendingAdjustment).toBe(0);
    expect(data.totalOverspendingAdjustment).toBe(0);
  });
});

vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: vi.fn(),
}));

describe('createBudgetAnalysisSpreadsheet fetching', () => {
  const food = makeCategory({ id: 'food', name: 'Food' });

  it.each([
    ['envelope', 'envelope-budget-month'],
    ['tracking', 'tracking-budget-month'],
  ] as const)(
    'requests %s months one at a time and in order',
    async (budgetType, endpoint) => {
      const requests: Array<[string, string]> = [];
      let inFlight = 0;
      let maxInFlight = 0;

      vi.mocked(send).mockImplementation((async (
        name: string,
        args: { month: string },
      ) => {
        if (name === 'get-categories') {
          return { list: [food], grouped: [] };
        }
        requests.push([name, args.month]);
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise(resolve => setTimeout(resolve, 0));
        inFlight--;
        return [{ name: `sheet!leftover-food`, value: 100 }];
      }) as never);

      const setData = vi.fn();
      await createBudgetAnalysisSpreadsheet({
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        budgetType,
      })(null as never, setData);

      expect(maxInFlight).toBe(1);
      expect(requests).toEqual([
        [endpoint, '2025-12'],
        [endpoint, '2026-01'],
        [endpoint, '2026-02'],
        [endpoint, '2026-03'],
      ]);
      expect(setData.mock.calls[0][0].budgetType).toBe(budgetType);
      expect(setData.mock.calls[0][0].intervalData).toHaveLength(3);
    },
  );
});
