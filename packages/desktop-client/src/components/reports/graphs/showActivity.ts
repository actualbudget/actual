import { type NavigateFunction } from 'react-router-dom';

import { type AccountEntity } from 'loot-core/types/models/account';
import { type CategoryEntity } from 'loot-core/types/models/category';
import { type CategoryGroupEntity } from 'loot-core/types/models/category-group';
import { type RuleConditionEntity } from 'loot-core/types/models/rule';

type showActivityProps = {
  navigate: NavigateFunction;
  categories: { list: CategoryEntity[]; grouped: CategoryGroupEntity[] };
  accounts: AccountEntity[];
  balanceTypeOp: string;
  filters: RuleConditionEntity[];
  showHiddenCategories: boolean;
  showOffBudget: boolean;
  type: string;
  startDate: string;
  endDate?: string;
  field?: string;
  id?: string;
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
}: showActivityProps) {
  const amount =
    balanceTypeOp === 'totalDebts' || type === 'debts' ? 'lte' : 'gte';
  const hiddenCategories = categories.list.filter(f => f.hidden).map(e => e.id);
  const offBudgetAccounts = accounts.filter(f => f.offbudget).map(e => e.id);

  const conditions = [
    ...filters,
    id && { field, op: 'is', value: id, type: 'id' },
    {
      field: 'date',
      op: type === 'time' ? 'is' : 'gte',
      value: startDate,
      options: { date: true },
    },
    type !== 'time' && {
      field: 'date',
      op: 'lte',
      value: endDate,
      options: { date: true },
    },
    !(
      balanceTypeOp === 'totalTotals' &&
      (type === 'totals' || type === 'time')
    ) && {
      field: 'amount',
      op: amount,
      value: 0,
      type: 'number',
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
      conditions,
    },
  });
}
