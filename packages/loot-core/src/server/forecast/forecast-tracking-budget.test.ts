import { describe, expect, it } from 'vitest';

import type { AccountWithComputedBalance } from './forecast-accounts';
import type { ForecastDateContext } from './forecast-projection';
import { projectTrackingBudgetForecast } from './forecast-tracking-budget';

const dateContext: ForecastDateContext = {
  forecastStartDate: '2024-03-01',
  forecastEndDate: '2024-05-31',
  forecastDays: [],
  firstForecastDate: '2024-03-10',
  endDateObj: new Date('2024-05-31T00:00:00'),
};

const accounts: AccountWithComputedBalance[] = [
  {
    id: 'checking',
    name: 'Checking',
    closed: 0,
    offbudget: 0,
    balance_current: 10000,
  },
  {
    id: 'investment',
    name: 'Investment',
    closed: 0,
    offbudget: 1,
    balance_current: 90000,
  },
];

describe('tracking budget forecast projection', () => {
  it('increases the forecast by budgeted income', () => {
    const result = projectTrackingBudgetForecast({
      accounts,
      dateContext: {
        ...dateContext,
        forecastEndDate: '2024-03-31',
      },
      months: [{ month: '2024-03', budgetedIncome: 5000, budgetedExpenses: 0 }],
    });

    expect(result.dataPoints).toMatchObject([
      {
        date: '2024-03-31',
        balance: 15000,
        accountId: 'tracking-budget',
        accountName: 'Tracking Budget',
        transactions: [],
      },
    ]);
  });

  it('decreases the forecast by budgeted expenses', () => {
    const result = projectTrackingBudgetForecast({
      accounts,
      dateContext: {
        ...dateContext,
        forecastEndDate: '2024-03-31',
      },
      months: [{ month: '2024-03', budgetedIncome: 0, budgetedExpenses: 3000 }],
    });

    expect(result.dataPoints[0]?.balance).toBe(7000);
    expect(result.lowestBalance).toEqual({
      date: '2024-03-31',
      balance: 7000,
      accountId: 'tracking-budget',
      accountName: 'Tracking Budget',
    });
  });

  it('accumulates income and expenses across multiple months', () => {
    const result = projectTrackingBudgetForecast({
      accounts,
      dateContext,
      months: [
        { month: '2024-03', budgetedIncome: 5000, budgetedExpenses: 3000 },
        { month: '2024-04', budgetedIncome: 4000, budgetedExpenses: 4500 },
        { month: '2024-05', budgetedIncome: 3000, budgetedExpenses: 2500 },
      ],
    });

    expect(result.dataPoints.map(point => point.balance)).toEqual([
      12000, 11500, 12000,
    ]);
  });
});
