import type { NavigateFunction } from 'react-router';

import * as monthUtils from '@actual-app/core/shared/months';
import type {
  AccountEntity,
  balanceTypeOpType,
  CategoryEntity,
  CategoryGroupEntity,
  RuleConditionEntity,
} from '@actual-app/core/types/models';

import { ReportOptions } from '#components/reports/ReportOptions';

type showActivityProps = {
  navigate: NavigateFunction;
  categories: { list: CategoryEntity[]; grouped: CategoryGroupEntity[] };
  accounts: AccountEntity[];
  balanceTypeOp: balanceTypeOpType;
  filters: RuleConditionEntity[];
  showHiddenCategories: boolean;
  showOffBudget: boolean;
  type: string;
  startDate: string;
  endDate?: string;
  field?: string;
  id?: string | string[]; // changed: supports array for oneOf
  uncategorized_id?: 'off_budget' | 'transfer' | 'other' | 'all';
  interval?: string;
};

export function showActivity({
  navigate,
  categories,
  accounts,
  balanceTypeOp,
  filters,
  showHiddenCategories,
  showOffBudget,
  type,
  startDate,
  endDate,
  field,
  id,
  uncategorized_id,
  interval = 'Day',
}: showActivityProps) {
  const isOutFlow =
    balanceTypeOp === 'totalDebts' || type === 'debts' ? true : false;
  const hiddenCategories = categories.list.filter(f => f.hidden).map(e => e.id);
  const offBudgetAccounts = accounts.filter(f => f.offbudget).map(e => e.id);
  const fromDate =
    interval === 'Weekly'
      ? 'dayFromDate'
      : (((ReportOptions.intervalMap.get(interval) || 'Day').toLowerCase() +
          'FromDate') as 'dayFromDate' | 'monthFromDate' | 'yearFromDate');
  const isDateOp = interval === 'Weekly' || type !== 'time';

  // Pseudo-category drill-downs: `id` is '' for transfer/off_budget/other groups.
  // Build the correct filter based on uncategorized_id instead of the empty id.
  const pseudoCategoryFilters =
    uncategorized_id === 'transfer'
      ? [{ field: 'transfer', op: 'is', value: true }]
      : uncategorized_id === 'other'
        ? [
            { field: 'category', op: 'is', value: null, type: 'id' },
            { field: 'transfer', op: 'is', value: false },
          ]
        : [];

  const filterConditions = [
    ...filters,
    // Skip the generic id-based category filter for pseudo-categories; their
    // filters are handled by pseudoCategoryFilters above.
    !uncategorized_id &&
      id && {
        // changed: use oneOf when id is an array, is when it's a string
        field,
        op: Array.isArray(id) ? 'oneOf' : 'is',
        value: id,
        type: 'id',
      },
    ...pseudoCategoryFilters,
    {
      field: 'date',
      op: isDateOp ? 'gte' : 'is',
      value: isDateOp ? startDate : monthUtils[fromDate](startDate),
      type: 'date',
    },
    isDateOp && {
      field: 'date',
      op: 'lte',
      value: endDate,
      options: { date: true },
    },
    !(
      ['netAssets', 'netDebts'].includes(balanceTypeOp) ||
      (['totalTotals', 'totalBudgeted'].includes(balanceTypeOp) &&
        (type === 'totals' || type === 'time'))
    ) && {
      field: 'amount',
      op: 'gte',
      value: 0,
      options: {
        type: 'number',
        inflow: !isOutFlow,
        outflow: isOutFlow,
      },
    },
    hiddenCategories.length > 0 &&
      !showHiddenCategories && {
        field: 'category',
        op: 'notOneOf',
        value: hiddenCategories,
        type: 'id',
      },
    offBudgetAccounts.length > 0 &&
      !showOffBudget && {
        field: 'account',
        op: 'notOneOf',
        value: offBudgetAccounts,
        type: 'id',
      },
  ].filter(f => f);

  void navigate(balanceTypeOp === 'totalBudgeted' ? '/budget' : '/accounts', {
    state:
      balanceTypeOp === 'totalBudgeted'
        ? { goBack: true }
        : { goBack: true, filterConditions },
  });
}
