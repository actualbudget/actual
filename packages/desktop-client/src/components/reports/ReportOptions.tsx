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

let uncatCat = {
  name: 'Uncategorized',
  id: null,
  uncat_id: '1',
  hidden: 0,
  offBudget: false,
  transfer: false,
  category: false,
};
let uncatTransfer = {
  name: 'Transfers',
  id: null,
  uncat_id: '2',
  hidden: 0,
  transfer: true,
  offBudget: false,
  category: false,
};
let uncatOff = {
  name: 'OffBudget',
  id: null,
  uncat_id: '3',
  hidden: 0,
  offBudget: true,
  transfer: false,
  category: true,
};

let uncatGroup = {
  name: 'Uncategorized',
  id: null,
  hidden: 0,
  categories: [uncatCat, uncatTransfer, uncatOff],
};

export const categoryLists = (uncat, categories) => {
  let catList = uncat
    ? [...categories.list, uncatCat, uncatTransfer, uncatOff]
    : categories.list;
  let catGroup = uncat
    ? [...categories.grouped, uncatGroup]
    : categories.grouped;
  return [catList, catGroup];
};

export const groupBySelections = (
  groupBy,
  catList,
  catGroup,
  payees,
  accounts,
) => {
  let groupByList;
  let groupByLabel;
  switch (groupBy) {
    case 'Category':
      groupByList = catList;
      groupByLabel = 'category';
      break;
    case 'Group':
      groupByList = catGroup;
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
      groupByList = catList;
      groupByLabel = 'category';
      break;
    case 'Year':
      groupByList = catList;
      groupByLabel = 'category';
      break;
    default:
  }
  return [groupByList, groupByLabel];
};
