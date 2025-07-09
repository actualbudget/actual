import { type NavigateFunction } from 'react-router';

import * as monthUtils from 'loot-core/shared/months';
import {
  type AccountEntity,
  type CategoryEntity,
  type CategoryGroupEntity,
  type balanceTypeOpType,
  type RuleConditionEntity,
} from 'loot-core/types/models';

import { ReportOptions } from '@desktop-client/components/reports/ReportOptions';

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
  id?: string;
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

  const filterConditions = [
    ...filters,
    id && { field, op: 'is', value: id, type: 'id' },
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
      (balanceTypeOp === 'totalTotals' &&
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
  navigate('/accounts', {
    state: {
      goBack: true,
      filterConditions,
    },
  });
}
