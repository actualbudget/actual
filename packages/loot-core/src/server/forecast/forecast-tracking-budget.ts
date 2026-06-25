import * as sheet from '#server/sheet';
import * as monthUtils from '#shared/months';
import type { ForecastDataPoint } from '#types/models/forecast';

import type { AccountWithComputedBalance } from './forecast-accounts';
import type { ForecastDateContext } from './forecast-projection';

const TRACKING_BUDGET_FORECAST_ACCOUNT_ID = 'tracking-budget';
const TRACKING_BUDGET_FORECAST_ACCOUNT_NAME = 'Tracking Budget';

type TrackingBudgetMonth = {
  month: string;
  budgetedIncome: number;
  budgetedExpenses: number;
};

function numberOrZero(value: unknown) {
  return typeof value === 'number' ? value : 0;
}

function getTrackingBudgetMonth(month: string): TrackingBudgetMonth {
  const sheetName = monthUtils.sheetForMonth(month);

  return {
    month,
    budgetedIncome: numberOrZero(
      sheet.getCellValue(sheetName, 'total-budget-income'),
    ),
    budgetedExpenses: numberOrZero(
      sheet.getCellValue(sheetName, 'total-budgeted'),
    ),
  };
}

export function projectTrackingBudgetForecast({
  accounts,
  dateContext,
  months,
}: {
  accounts: AccountWithComputedBalance[];
  dateContext: ForecastDateContext;
  months?: TrackingBudgetMonth[];
}) {
  let runningBalance = accounts.reduce(
    (sum, account) =>
      account.offbudget === 0 ? sum + account.balance_current : sum,
    0,
  );
  const forecastStartMonth = monthUtils.monthFromDate(
    dateContext.forecastStartDate,
  );
  const forecastEndMonth = monthUtils.monthFromDate(
    dateContext.forecastEndDate,
  );
  const forecastMonths =
    months ??
    monthUtils
      .rangeInclusive(forecastStartMonth, forecastEndMonth)
      .map(getTrackingBudgetMonth);

  const dataPoints: ForecastDataPoint[] = forecastMonths.map(month => {
    runningBalance += month.budgetedIncome - month.budgetedExpenses;

    return {
      date: monthUtils.lastDayOfMonth(month.month),
      balance: runningBalance,
      accountId: TRACKING_BUDGET_FORECAST_ACCOUNT_ID,
      accountName: TRACKING_BUDGET_FORECAST_ACCOUNT_NAME,
      transactions: [],
    };
  });

  const lowestBalance = dataPoints.reduce(
    (lowest, point) => (point.balance < lowest.balance ? point : lowest),
    dataPoints[0] ?? {
      date: dateContext.forecastStartDate,
      balance: runningBalance,
      accountId: TRACKING_BUDGET_FORECAST_ACCOUNT_ID,
      accountName: TRACKING_BUDGET_FORECAST_ACCOUNT_NAME,
      transactions: [],
    },
  );

  return {
    dataPoints,
    lowestBalance: {
      date: lowestBalance.date,
      balance: lowestBalance.balance,
      accountId: lowestBalance.accountId,
      accountName: lowestBalance.accountName,
    },
  };
}
