import { useTranslation } from 'react-i18next';

import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import type {
  NewRuleEntity,
  PayeeEntity,
  RuleActionEntity,
  RuleConditionEntity,
  RuleEntity,
  ScheduleEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';

import { useRules } from '#hooks/useRules';
import { addNotification } from '#notifications/notificationsSlice';
import { aqlQuery } from '#queries/aqlQuery';
import { useDispatch } from '#redux';
import type { AppDispatch } from '#redux/store';

import { ruleQueries } from './queries';

function invalidateQueries(queryClient: QueryClient, queryKey?: QueryKey) {
  void queryClient.invalidateQueries({
    queryKey: queryKey ?? ruleQueries.lists(),
  });
}

function dispatchErrorNotification(
  dispatch: AppDispatch,
  message: string,
  error?: Error,
) {
  dispatch(
    addNotification({
      notification: {
        id: uuidv4(),
        type: 'error',
        message,
        pre: error?.cause ? JSON.stringify(error.cause) : error?.message,
      },
    }),
  );
}

type AddRulePayload = {
  rule: Omit<RuleEntity, 'id'>;
};

export function useAddRuleMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ rule }: AddRulePayload) => {
      return await send('rule-add', rule);
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error creating rule:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error creating the rule. Please try again.'),
        error,
      );
    },
  });
}

type UpdateRulePayload = {
  rule: RuleEntity;
};

export function useUpdateRuleMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ rule }: UpdateRulePayload) => {
      return await send('rule-update', rule);
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error updating rule:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error updating the rule. Please try again.'),
        error,
      );
    },
  });
}

type SaveRulePayload = {
  rule: RuleEntity | NewRuleEntity;
};

export function useSaveRuleMutation() {
  const { mutateAsync: updateRuleAsync } = useUpdateRuleMutation();
  const { mutateAsync: addRuleAsync } = useAddRuleMutation();

  return useMutation({
    mutationFn: async ({ rule }: SaveRulePayload) => {
      if ('id' in rule && rule.id) {
        return await updateRuleAsync({ rule });
      } else {
        return await addRuleAsync({ rule });
      }
    },
  });
}

type DeleteRulePayload = {
  id: RuleEntity['id'];
};

export function useDeleteRuleMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id }: DeleteRulePayload) => {
      return await send('rule-delete', id);
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error deleting rule:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error deleting the rule. Please try again.'),
        error,
      );
    },
  });
}

type DeleteAllRulesPayload = {
  ids: Array<RuleEntity['id']>;
};

export function useBatchDeleteRulesMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ ids }: DeleteAllRulesPayload) => {
      return await send('rule-delete-all', ids);
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error deleting rules:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error deleting rules. Please try again.'),
        error,
      );
    },
  });
}

type ApplyRuleActionsPayload = {
  transactions: TransactionEntity[];
  ruleActions: RuleActionEntity[];
};

export function useApplyRuleActionsMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      transactions,
      ruleActions,
    }: ApplyRuleActionsPayload) => {
      const result = await send('rule-apply-actions', {
        transactions,
        actions: ruleActions,
      });
      if (result && result.errors && result.errors.length > 0) {
        throw new Error('Error applying rule actions.', {
          cause: result.errors,
        });
      }
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error applying rule actions:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error applying the rule actions. Please try again.'),
        error,
      );
    },
  });
}

type AddPayeeRenameRulePayload = {
  fromNames: Array<PayeeEntity['name']>;
  to: PayeeEntity['id'];
};

export function useAddPayeeRenameRuleMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ fromNames, to }: AddPayeeRenameRulePayload) => {
      return await send('rule-add-payee-rename', {
        fromNames,
        to,
      });
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error adding payee rename rule:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error adding the payee rename rule. Please try again.'),
        error,
      );
    },
  });
}

type RunRulesPayload = {
  transaction: TransactionEntity;
};

export function useRunRulesMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ transaction }: RunRulesPayload) => {
      return await send('rules-run', { transaction });
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error running rules for transaction:', error);
      dispatchErrorNotification(
        dispatch,
        t(
          'There was an error running the rules for transaction. Please try again.',
        ),
        error,
      );
    },
  });
}

// TODO: Move to schedules mutations file once we have schedule-related mutations
export function useCreateSingleTimeScheduleFromTransaction() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { data: allRules = [] } = useRules();
  const { mutateAsync: updateRule } = useUpdateRuleMutation();

  return useMutation({
    mutationFn: async ({
      transaction,
    }: {
      transaction: TransactionEntity;
    }): Promise<ScheduleEntity['id']> => {
      const conditions: RuleConditionEntity[] = [
        { op: 'is', field: 'date', value: transaction.date },
      ];

      const actions: RuleActionEntity[] = [];

      const conditionFields = ['amount', 'payee', 'account'] as const;

      conditionFields.forEach(field => {
        const value = transaction[field];
        if (value != null && value !== '') {
          conditions.push({
            op: 'is',
            field,
            value,
          } as RuleConditionEntity);
        }
      });

      if (transaction.is_parent && transaction.subtransactions) {
        if (transaction.notes) {
          actions.push({
            op: 'set',
            field: 'notes',
            value: transaction.notes,
            options: {
              splitIndex: 0,
            },
          } as RuleActionEntity);
        }

        transaction.subtransactions.forEach((split, index) => {
          const splitIndex = index + 1;

          if (split.amount != null) {
            actions.push({
              op: 'set-split-amount',
              value: split.amount,
              options: {
                splitIndex,
                method: 'fixed-amount',
              },
            } as RuleActionEntity);
          }

          if (split.category) {
            actions.push({
              op: 'set',
              field: 'category',
              value: split.category,
              options: {
                splitIndex,
              },
            } as RuleActionEntity);
          }

          if (split.notes) {
            actions.push({
              op: 'set',
              field: 'notes',
              value: split.notes,
              options: {
                splitIndex,
              },
            } as RuleActionEntity);
          }
        });
      } else {
        if (transaction.category) {
          actions.push({
            op: 'set',
            field: 'category',
            value: transaction.category,
          } as RuleActionEntity);
        }

        if (transaction.notes) {
          actions.push({
            op: 'set',
            field: 'notes',
            value: transaction.notes,
          } as RuleActionEntity);
        }
      }

      const formattedDate = monthUtils.format(transaction.date, 'MMM dd, yyyy');
      const timestamp = Date.now();
      const scheduleName = `Auto-created future transaction (${formattedDate}) - ${timestamp}`;

      const scheduleId = await send('schedule/create', {
        conditions,
        schedule: {
          posts_transaction: true,
          name: scheduleName,
        },
      });

      if (actions.length > 0) {
        const schedules = await aqlQuery(
          q('schedules').filter({ id: scheduleId }).select('rule'),
        );

        const ruleId = schedules?.data?.[0]?.rule;

        if (ruleId) {
          const rule = allRules.find(r => r.id === ruleId);

          if (rule) {
            const linkScheduleActions = rule.actions.filter(
              a => a.op === 'link-schedule',
            );

            updateRule({
              rule: {
                ...rule,
                actions: [...linkScheduleActions, ...actions],
              },
            });
          }
        }
      }

      return scheduleId;
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error creating schedule from transaction:', error);
      dispatchErrorNotification(
        dispatch,
        t(
          'There was an error creating the schedule from the transaction. Please try again.',
        ),
        error,
      );
    },
  });
}
