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
    description: 'This week',
    name: 0,
    type: 'Weeks',
    Daily: true,
    Weekly: true,
    Monthly: false,
    Yearly: false,
  },
  {
    description: 'Last week',
    name: 1,
    type: 'Weeks',
    Daily: true,
    Weekly: true,
    Monthly: false,
    Yearly: false,
  },
  {
    description: 'This month',
    name: 0,
    type: 'Months',
    Daily: true,
    Weekly: true,
    Monthly: true,
    Yearly: false,
  },
  {
    description: 'Last month',
    name: 1,
    type: 'Months',
    Daily: true,
    Weekly: true,
    Monthly: true,
    Yearly: false,
  },
  {
    description: 'Last 3 months',
    name: 2,
    type: 'Months',
    Daily: true,
    Weekly: true,
    Monthly: true,
    Yearly: false,
  },
  {
    description: 'Last 6 months',
    name: 5,
    type: 'Months',
    Daily: false,
    Weekly: false,
    Monthly: true,
    Yearly: false,
  },
  {
    description: 'Last 12 months',
    name: 11,
    type: 'Months',
    Daily: false,
    Weekly: false,
    Monthly: true,
    Yearly: false,
  },
  {
    description: 'Year to date',
    name: 'yearToDate',
    Daily: true,
    Weekly: true,
    Monthly: true,
    Yearly: true,
  },
  {
    description: 'Last year',
    name: 'lastYear',
    Daily: true,
    Weekly: true,
    Monthly: true,
    Yearly: true,
  },
  {
    description: 'All time',
    name: 'allTime',
    Daily: true,
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
    description: 'Daily',
    name: 'Day',
    format: 'yy-MM-dd',
    range: 'dayRangeInclusive',
  },
  {
    description: 'Weekly',
    name: 'Week',
    format: 'yy-MM-dd',
    range: 'weekRangeInclusive',
  },
  //{ value: 3, description: 'Fortnightly', name: 3},
  {
    description: 'Monthly',
    name: 'Month',
    // eslint-disable-next-line rulesdir/typography
    format: "MMM ''yy",
    range: 'rangeInclusive',
  },
  {
    description: 'Yearly',
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
    case 'Interval':
      groupByList = categoryList;
      groupByLabel = 'category';
      break;
    default:
      throw new Error('Error loading data into the spreadsheet.');
  }
  return [groupByList, groupByLabel];
};
