import { useMemo } from 'react';
import { useLocation } from 'react-router';

import type {
  RuleConditionEntity,
  TransactionFilterEntity,
} from '@actual-app/core/types/models';

import { useSyncedPref } from '#hooks/useSyncedPref';

export type ConditionEntity =
  | Partial<RuleConditionEntity>
  | TransactionFilterEntity;

/**
 * The active transaction-table filters for one view, persisted per account
 * (like the column configuration). Filters passed via navigation state
 * (e.g. from reports) win over the persisted ones.
 */
export function useTransactionFilterConditions(accountId: string | undefined) {
  const location = useLocation();
  const [savedFiltersPref, setSavedFiltersPref] = useSyncedPref(
    `transaction-table-filters-${accountId || 'all-accounts'}`,
  );
  const savedFilters = useMemo(() => {
    if (!savedFiltersPref) {
      return null;
    }
    try {
      const parsed = JSON.parse(savedFiltersPref);
      return Array.isArray(parsed?.conditions) ? parsed : null;
    } catch {
      return null;
    }
  }, [savedFiltersPref]);

  const locationConditions = location?.state?.filterConditions;
  const filterConditions: ConditionEntity[] =
    locationConditions || savedFilters?.conditions || [];
  const filterConditionsOp: 'and' | 'or' =
    !locationConditions && savedFilters?.conditionsOp === 'or' ? 'or' : 'and';

  const onSaveFilterConditions = (
    conditions: ConditionEntity[],
    conditionsOp: 'and' | 'or',
  ) => {
    const serialized =
      conditions.length > 0 ? JSON.stringify({ conditions, conditionsOp }) : '';
    if (serialized !== (savedFiltersPref || '')) {
      setSavedFiltersPref(serialized);
    }
  };

  return { filterConditions, filterConditionsOp, onSaveFilterConditions };
}
