import * as monthUtils from 'loot-core/src/shared/months';
import {
  type CustomReportEntity,
  type AccountEntity,
  type CategoryEntity,
  type CategoryGroupEntity,
  type PayeeEntity,
} from 'loot-core/src/types/models';

const startDate = monthUtils.subMonths(monthUtils.currentMonth(), 5);
const endDate = monthUtils.currentMonth();

export const defaultReport: CustomReportEntity = {
  startDate,
  endDate,
  isDateStatic: false,
  dateRange: 'Last 6 months',
  mode: 'total',
  groupBy: 'Category',
  balanceType: 'Payment',
  showEmpty: false,
  showOffBudget: false,
  showHiddenCategories: false,
  showUncategorized: false,
  graphType: 'BarGraph',
  conditions: [],
  conditionsOp: 'and',
};

const balanceTypeOptions = [
  { description: 'Payment', format: 'totalDebts' as const },
  { description: 'Deposit', format: 'totalAssets' as const },
  { description: 'Net', format: 'totalTotals' as const },
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
export type QueryDataEntity = {
  date: string;
  category: string;
  categoryHidden: boolean;
  categoryGroup: string;
  categoryGroupHidden: boolean;
  account: string;
  accountOffBudget: boolean;
  payee: string;
  transferAccount: string;
  amount: number;
};

export type UncategorizedEntity = Pick<CategoryEntity, 'name' | 'hidden'> & {
  /*
    When looking at uncategorized and hidden transactions we
    need a way to group them. To do this we give them a unique
    uncategorized_id. We also need a way to filter the
    transctions from our query. For this we use the 3 variables
    below.
  */
  uncategorized_id?: string;
  is_off_budget?: boolean;
  is_transfer?: boolean;
  has_category?: boolean;
};

const uncategorizedCategory: UncategorizedEntity = {
  name: 'Uncategorized',
  uncategorized_id: '1',
  hidden: false,
  is_off_budget: false,
  is_transfer: false,
  has_category: false,
};
const transferCategory: UncategorizedEntity = {
  name: 'Transfers',
  uncategorized_id: '2',
  hidden: false,
  is_off_budget: false,
  is_transfer: true,
  has_category: false,
};
const offBudgetCategory: UncategorizedEntity = {
  name: 'Off Budget',
  uncategorized_id: '3',
  hidden: false,
  is_off_budget: true,
  is_transfer: false,
  has_category: true,
};

type UncategorizedGroupEntity = Pick<
  CategoryGroupEntity,
  'name' | 'id' | 'hidden'
> & {
  categories?: UncategorizedEntity[];
};

const uncategorizedGroup: UncategorizedGroupEntity = {
  name: 'Uncategorized & Off Budget',
  id: undefined,
  hidden: false,
  categories: [uncategorizedCategory, transferCategory, offBudgetCategory],
};

export const categoryLists = (categories: {
  list: CategoryEntity[];
  grouped: CategoryGroupEntity[];
}) => {
  const categoryList = [
    ...categories.list,
    uncategorizedCategory,
    offBudgetCategory,
    transferCategory,
  ];

  const categoryGroup = [...categories.grouped, uncategorizedGroup];
  return [categoryList, categoryGroup.filter(group => group !== null)] as const;
};

export const groupBySelections = (
  groupBy: string,
  categoryList: CategoryEntity[],
  categoryGroup: CategoryGroupEntity[],
  payees: PayeeEntity[],
  accounts: AccountEntity[],
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
      throw new Error('Error loading data into the spreadsheet.');
  }
  return [groupByList, groupByLabel];
};
