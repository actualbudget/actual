import * as monthUtils from 'loot-core/src/shared/months';

export function defaultState() {
  const start = monthUtils.subMonths(monthUtils.currentMonth(), 5);
  const end = monthUtils.currentMonth();
  return {
    mode: 'total',
    groupBy: 'Category',
    balanceType: 'Expense',
    empty: false,
    hidden: false,
    uncat: false,
    graphType: 'BarGraph',
    viewLabels: false,
    viewLegend: false,
    viewSummary: false,
    start: start,
    end: end,
  };
}

const balanceTypeOptions = [
  { description: 'Expense', format: 'totalDebts' },
  { description: 'Income', format: 'totalAssets' },
  { description: 'Net', format: 'totalTotals' },
];

const groupByOptions = [
  { description: 'Category' },
  { description: 'Group' },
  { description: 'Payee' },
  { description: 'Account' },
  { description: 'Month' },
  { description: 'Year' },
];

const dateRangeOptions = [
  { description: '1 month', name: 1 },
  { description: '3 months', name: 2 },
  { description: '6 months', name: 5 },
  { description: '1 year', name: 11 },
  { description: 'All time', name: 'allMonths' },
];

export const ReportOptions = {
  groupBy: groupByOptions,
  balanceType: balanceTypeOptions,
  balanceTypeMap: new Map(
    balanceTypeOptions.map(item => [item.description, item.format]),
  ),
  dateRange: dateRangeOptions,
  dateRangeMap: new Map(
    dateRangeOptions.map(item => [item.description, item.name]),
  ),
};

/*
const intervalOptions = [
{ value: 1, description: 'Daily', name: 1,
{ value: 2, description: 'Weekly', name: 2,
{ value: 3, description: 'Fortnightly', name: 3,
{ value: 4, description: 'Monthly', name: 4,
{ value: 5, description: 'Yearly', name: 5,
];
*/
