import { useCallback, useEffect, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import type { TransactionRuleStatus } from '@actual-app/core/server/transactions/transaction-rules';
import type {
  RuleEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

import { createCategoryRuleFromTransaction } from '#components/rules/rule-helpers';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

export type { TransactionRuleStatus };

export function useTransactionRuleStatus(
  transaction: TransactionEntity | null | undefined,
  enabled: boolean = true,
) {
  const dispatch = useDispatch();
  const [ruleStatus, setRuleStatus] = useState<TransactionRuleStatus | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!enabled || !transaction) {
      setRuleStatus(null);
      return;
    }

    // Need at least a payee or imported_payee to match category rules
    if (!transaction.payee && !transaction.imported_payee) {
      setRuleStatus(null);
      return;
    }

    setIsLoading(true);
    try {
      const res = await send('rule-check-transaction', { transaction });
      setRuleStatus(res);
    } catch (e) {
      console.error('Failed to check transaction rules', e);
      setRuleStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, transaction]);

  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  const openEditRule = useCallback(
    (rule: RuleEntity) => {
      dispatch(
        pushModal({
          modal: {
            name: 'edit-rule',
            options: {
              rule,
              onSave: () => {
                void checkStatus();
              },
            },
          },
        }),
      );
    },
    [dispatch, checkStatus],
  );

  const openCreateRule = useCallback(
    (trans: TransactionEntity) => {
      dispatch(
        pushModal({
          modal: {
            name: 'edit-rule',
            options: {
              rule: createCategoryRuleFromTransaction(trans),
              onSave: () => {
                void checkStatus();
              },
            },
          },
        }),
      );
    },
    [dispatch, checkStatus],
  );

  return {
    ruleStatus,
    isLoading,
    refresh: checkStatus,
    openEditRule,
    openCreateRule,
  };
}
