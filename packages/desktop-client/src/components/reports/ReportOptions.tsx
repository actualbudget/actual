import {
  type AccountEntity,
  type CategoryEntity,
  type CategoryGroupEntity,
  type PayeeEntity,
} from 'loot-core/src/types/models';

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
export type QueryDataEntity = {
  date: string;
  category: string;
  categoryGroup: string;
  account: string;
  accountOffBudget: boolean;
  payee: string;
  transferAccount: string;
  amount: number;
};

export type UncategorizedEntity = {
  id?: string;
  name: string;
  hidden?: boolean;
  uncat_id: string;
  offBudget: boolean;
  transfer: boolean;
  category: boolean;
};

export type UncategorizedGroupEntity = {
  id?: string;
  name: string;
  hidden?: boolean;
  categories?: UncategorizedEntity[];
};

let uncategorizedCategory: UncategorizedEntity = {
  name: 'Uncategorized',
  id: null,
  uncat_id: '1',
  hidden: false,
  offBudget: false,
  transfer: false,
  category: false,
};
let transferCategory: UncategorizedEntity = {
  name: 'Transfers',
  id: null,
  uncat_id: '2',
  hidden: false,
  transfer: true,
  offBudget: false,
  category: false,
};
let offBudgetCategory: UncategorizedEntity = {
  name: 'Off Budget',
  id: null,
  uncat_id: '3',
  hidden: false,
  offBudget: true,
  transfer: false,
  category: true,
};

let uncategouncatGrouprizedGroup: UncategorizedGroupEntity = {
  name: 'Uncategorized & Off Budget',
  id: null,
  hidden: false,
  categories: [uncategorizedCategory, transferCategory, offBudgetCategory],
};

type categoryListsProps = {
  hidden: boolean;
  uncat: boolean;
  categories: { list: CategoryEntity[]; grouped: CategoryGroupEntity[] };
};
export const categoryLists = ({
  hidden,
  uncat,
  categories,
}: categoryListsProps) => {
  let categoryList = uncat
    ? [
        ...categories.list,
        uncategorizedCategory,
        transferCategory,
        offBudgetCategory,
      ]
    : categories.list;
  let categoryGroup = uncat
    ? [
        ...categories.grouped.filter(f => hidden || !f.hidden),
        uncategouncatGrouprizedGroup,
      ]
    : categories.grouped;
  return [categoryList, categoryGroup];
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
