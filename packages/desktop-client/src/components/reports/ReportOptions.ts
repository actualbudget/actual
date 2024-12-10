import { t } from 'i18next';

import * as monthUtils from 'loot-core/src/shared/months';
import {
  type CustomReportEntity,
  type AccountEntity,
  type CategoryEntity,
  type CategoryGroupEntity,
  type PayeeEntity,
} from 'loot-core/src/types/models';

const startDate = monthUtils.subMonths(monthUtils.currentMonth(), 5) + '-01';
const endDate = monthUtils.currentDay();

export const defaultReport: CustomReportEntity = {
  id: '',
  name: '',
  startDate,
  endDate,
  isDateStatic: false,
  dateRange: 'Last 6 months',
  mode: 'total',
  groupBy: 'Category',
  interval: 'Monthly',
  balanceType: 'Payment',
  showEmpty: false,
  showOffBudget: false,
  showHiddenCategories: false,
  includeCurrentInterval: true,
  showUncategorized: false,
  graphType: 'BarGraph',
  conditions: [],
  conditionsOp: 'and',
};

const balanceTypeOptions = [
  { description: t('Payment'), format: 'totalDebts' as const },
  { description: t('Deposit'), format: 'totalAssets' as const },
  { description: t('Net'), format: 'totalTotals' as const },
  { description: t('Net Payment'), format: 'netDebts' as const },
  { description: t('Net Deposit'), format: 'netAssets' as const },
];

const groupByOptions = [
  { description: 'Category' },
  { description: 'Group' },
  { description: 'Payee' },
  { description: 'Account' },
  { description: 'Interval' },
];

export type dateRangeProps = {
  description: string;
  name: number | string;
  type?: string;
  Daily: boolean;
  Weekly: boolean;
  Monthly: boolean;
  Yearly: boolean;
};

const dateRangeOptions: dateRangeProps[] = [
  {
    description: t('This week'),
    name: 0,
    type: 'Week',
    Daily: true,
    Weekly: true,
    Monthly: false,
    Yearly: false,
  },
  {
    description: t('Last week'),
    name: 1,
    type: 'Week',
    Daily: true,
    Weekly: true,
    Monthly: false,
    Yearly: false,
  },
  {
    description: t('This month'),
    name: 0,
    type: 'Month',
    Daily: true,
    Weekly: true,
    Monthly: true,
    Yearly: false,
  },
  {
    description: t('Last month'),
    name: 1,
    type: 'Month',
    Daily: true,
    Weekly: true,
    Monthly: true,
    Yearly: false,
  },
  {
    description: t('Last 3 months'),
    name: 3,
    type: 'Month',
    Daily: true,
    Weekly: true,
    Monthly: true,
    Yearly: false,
  },
  {
    description: t('Last 6 months'),
    name: 6,
    type: 'Month',
    Daily: false,
    Weekly: false,
    Monthly: true,
    Yearly: false,
  },
  {
    description: t('Last 12 months'),
    name: 12,
    type: 'Month',
    Daily: false,
    Weekly: false,
    Monthly: true,
    Yearly: false,
  },
  {
    description: t('Year to date'),
    name: 'yearToDate',
    type: 'Month',
    Daily: false,
    Weekly: true,
    Monthly: true,
    Yearly: true,
  },
  {
    description: t('Last year'),
    name: 'lastYear',
    type: 'Month',
    Daily: false,
    Weekly: true,
    Monthly: true,
    Yearly: true,
  },
  {
    description: t('All time'),
    name: 'allTime',
    type: 'Month',
    Daily: false,
    Weekly: true,
    Monthly: true,
    Yearly: true,
  },
];

type intervalOptionsProps = {
  description: string;
  name: 'Day' | 'Week' | 'Month' | 'Year';
  format: string;
  range:
    | 'dayRangeInclusive'
    | 'weekRangeInclusive'
    | 'rangeInclusive'
    | 'yearRangeInclusive';
};

const intervalOptions: intervalOptionsProps[] = [
  {
    description: t('Daily'),
    name: 'Day',
    format: 'yy-MM-dd',
    range: 'dayRangeInclusive',
  },
  {
    description: t('Weekly'),
    name: 'Week',
    format: 'yy-MM-dd',
    range: 'weekRangeInclusive',
  },
  //{ value: 3, description: 'Fortnightly', name: 3},
  {
    description: t('Monthly'),
    name: 'Month',
    // eslint-disable-next-line rulesdir/typography
    format: "MMM ''yy",
    range: 'rangeInclusive',
  },
  {
    description: t('Yearly'),
    name: 'Year',
    format: 'yyyy',
    range: 'yearRangeInclusive',
  },
];

export const ReportOptions = {
  groupBy: groupByOptions.map(item => item.description),
  balanceType: balanceTypeOptions,
  balanceTypeMap: new Map(
    balanceTypeOptions.map(item => [item.description, item.format]),
  ),
  dateRange: dateRangeOptions,
  dateRangeMap: new Map(
    dateRangeOptions.map(item => [item.description, item.name]),
  ),
  dateRangeType: new Map(
    dateRangeOptions.map(item => [item.description, item.type]),
  ),
  interval: intervalOptions,
  intervalMap: new Map<string, 'Day' | 'Week' | 'Month' | 'Year'>(
    intervalOptions.map(item => [item.description, item.name]),
  ),
  intervalFormat: new Map(
    intervalOptions.map(item => [item.description, item.format]),
  ),
  intervalRange: new Map<
    string,
    | 'dayRangeInclusive'
    | 'weekRangeInclusive'
    | 'rangeInclusive'
    | 'yearRangeInclusive'
  >(intervalOptions.map(item => [item.description, item.range])),
};

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

type UncategorizedId = 'off_budget' | 'transfer' | 'other' | 'all';

export type UncategorizedEntity = Pick<
  CategoryEntity,
  'id' | 'name' | 'hidden' | 'cat_group'
> & {
  uncategorized_id?: UncategorizedId;
};

const uncategorizedCategory: UncategorizedEntity = {
  id: '',
  name: t('Uncategorized'),
  uncategorized_id: 'other',
  hidden: false,
};
const transferCategory: UncategorizedEntity = {
  id: '',
  name: t('Transfers'),
  uncategorized_id: 'transfer',
  hidden: false,
};
const offBudgetCategory: UncategorizedEntity = {
  id: '',
  name: t('Off budget'),
  uncategorized_id: 'off_budget',
  hidden: false,
};

type UncategorizedGroupEntity = Pick<
  CategoryGroupEntity,
  'name' | 'id' | 'hidden'
> & {
  categories?: UncategorizedEntity[];
  uncategorized_id?: UncategorizedId;
};

const uncategorizedGroup: UncategorizedGroupEntity = {
  name: t('Uncategorized & Off budget'),
  id: 'uncategorized',
  hidden: false,
  uncategorized_id: 'all',
  categories: [uncategorizedCategory, transferCategory, offBudgetCategory],
};

export const categoryLists = (categories: {
  list: CategoryEntity[];
  grouped: CategoryGroupEntity[];
}) => {
  const categoryList: UncategorizedEntity[] = [
    ...categories.list.sort((a, b) => {
      //The point of this sorting is to make the graphs match the "budget" page
      const catGroupA = categories.grouped.find(f => f.id === a.cat_group);
      const catGroupB = categories.grouped.find(f => f.id === b.cat_group);
      //initial check that both a and b have a sort_order and category group
      return a.sort_order && b.sort_order && catGroupA && catGroupB
        ? /*sorting by "is_income" because sort_order for this group is
        separate from other groups*/
          Number(catGroupA.is_income) - Number(catGroupB.is_income) ||
            //Next, sorting by group sort_order
            (catGroupA.sort_order ?? 0) - (catGroupB.sort_order ?? 0) ||
            //Finally, sorting by category within each group
            a.sort_order - b.sort_order
        : 0;
    }),
    uncategorizedCategory,
    offBudgetCategory,
    transferCategory,
  ];

  const categoryGroup: UncategorizedGroupEntity[] = [
    ...categories.grouped,
    uncategorizedGroup,
  ];
  return [categoryList, categoryGroup.filter(group => group !== null)] as const;
};

export const groupBySelections = (
  groupBy: string,
  categoryList: UncategorizedEntity[],
  categoryGroup: CategoryGroupEntity[],
  payees: PayeeEntity[],
  accounts: AccountEntity[],
): [
  UncategorizedEntity[],
  'category' | 'categoryGroup' | 'payee' | 'account',
] => {
  let groupByList: UncategorizedEntity[];
  let groupByLabel: 'category' | 'categoryGroup' | 'payee' | 'account';
  switch (groupBy) {
    case 'Category':
      groupByList = categoryList;
      groupByLabel = 'category';
      break;
    case 'Group':
      groupByList = categoryGroup.map(group => {
        return {
          ...group,
          id: group.id,
          name: group.name,
          hidden: group.hidden,
        };
      });
      groupByLabel = 'categoryGroup';
      break;
    case 'Payee':
      groupByList = payees.map(payee => {
        return { id: payee.id, name: payee.name, hidden: false };
      });
      groupByLabel = 'payee';
      break;
    case 'Account':
      groupByList = accounts.map(account => {
        return { id: account.id, name: account.name, hidden: false };
      });
      groupByLabel = 'account';
      break;
    case 'Interval':
      groupByList = categoryList;
      groupByLabel = 'category';
      break;
    default:
      throw new Error('Error loading data into the spreadsheet.');
  }
  return [groupByList, groupByLabel];
};
