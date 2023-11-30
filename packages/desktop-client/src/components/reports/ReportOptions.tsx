const balanceTypeOptions = [
  { description: 'Payment', format: 'totalDebts' },
  { description: 'Deposit', format: 'totalAssets' },
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
  { description: 'This month', name: 0 },
  { description: 'Last month', name: 1 },
  { description: 'Last 3 months', name: 2 },
  { description: 'Last 6 months', name: 5 },
  { description: 'Last 12 months', name: 11 },
  { description: 'Year to date', name: 'yearToDate' },
  { description: 'Last year', name: 'lastYear' },
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

let uncategorizedCategory = {
  name: 'Uncategorized',
  id: null,
  uncat_id: '1',
  hidden: 0,
  offBudget: false,
  transfer: false,
  category: false,
};
let transferCategory = {
  name: 'Transfers',
  id: null,
  uncat_id: '2',
  hidden: 0,
  transfer: true,
  offBudget: false,
  category: false,
};
let offBudgetCategory = {
  name: 'Off Budget',
  id: null,
  uncat_id: '3',
  hidden: 0,
  offBudget: true,
  transfer: false,
  category: true,
};

let uncategorizedGroup = {
  name: 'Uncategorized & Off Budget',
  id: null,
  hidden: 0,
  categories: [uncategorizedCategory, transferCategory, offBudgetCategory],
};

export const categoryLists = (showUncategorized, categories) => {
  let categoryList = showUncategorized
    ? [
        ...categories.list,
        uncategorizedCategory,
        transferCategory,
        offBudgetCategory,
      ]
    : categories.list;
  let categoryGroup = showUncategorized
    ? [...categories.grouped, uncategorizedGroup]
    : categories.grouped;
  return [categoryList, categoryGroup];
};

export const groupBySelections = (
  groupBy,
  categoryList,
  categoryGroup,
  payees,
  accounts,
) => {
  let groupByList;
  let groupByLabel;
  switch (groupBy) {
    case 'Category':
      groupByList = categoryList;
      groupByLabel = 'category';
      break;
    case 'Group':
      groupByList = categoryGroup;
      groupByLabel = 'categoryGroup';
      break;
    case 'Payee':
      groupByList = payees;
      groupByLabel = 'payee';
      break;
    case 'Account':
      groupByList = accounts;
      groupByLabel = 'account';
      break;
    case 'Month':
      groupByList = categoryList;
      groupByLabel = 'category';
      break;
    case 'Year':
      groupByList = categoryList;
      groupByLabel = 'category';
      break;
    default:
  }
  return [groupByList, groupByLabel];
};
