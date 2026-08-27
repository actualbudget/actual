import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import { getUpcomingDays } from '@actual-app/core/shared/schedules';
import type {
  RuleActionEntity,
  RuleConditionEntity,
  ScheduleEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

export function isFutureTransaction(transaction: TransactionEntity): boolean {
  const today = monthUtils.currentDay();
  return transaction.date > today;
}

export function calculateFutureTransactionInfo(
  transaction: TransactionEntity,
  upcomingLength: string,
) {
  const today = monthUtils.currentDay();
  const upcomingDays = getUpcomingDays(upcomingLength, today);
  const daysUntilTransaction = monthUtils.differenceInCalendarDays(
    transaction.date,
    today,
  );
  const isBeyondWindow = daysUntilTransaction > upcomingDays;

  return { isBeyondWindow, daysUntilTransaction, upcomingDays };
}

export async function createSingleTimeScheduleFromTransaction(
  transaction: TransactionEntity,
): Promise<ScheduleEntity['id']> {
  const conditions: RuleConditionEntity[] = [
    { op: 'is', field: 'date', value: transaction.date },
  ];

  const actions: RuleActionEntity[] = [];

  if (transaction.amount != null) {
    conditions.push({ op: 'is', field: 'amount', value: transaction.amount });
  }
  if (transaction.payee != null && transaction.payee !== '') {
    conditions.push({ op: 'is', field: 'payee', value: transaction.payee });
  }
  if (transaction.account != null && transaction.account !== '') {
    conditions.push({ op: 'is', field: 'account', value: transaction.account });
  }

  if (transaction.is_parent && transaction.subtransactions) {
    if (transaction.notes) {
      actions.push({
        op: 'set',
        field: 'notes',
        value: transaction.notes,
        options: {
          splitIndex: 0,
        },
      });
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
        });
      }

      if (split.category) {
        actions.push({
          op: 'set',
          field: 'category',
          value: split.category,
          options: {
            splitIndex,
          },
        });
      }

      if (split.notes) {
        actions.push({
          op: 'set',
          field: 'notes',
          value: split.notes,
          options: {
            splitIndex,
          },
        });
      }
    });
  } else {
    if (transaction.category) {
      actions.push({
        op: 'set',
        field: 'category',
        value: transaction.category,
      });
    }

    if (transaction.notes) {
      actions.push({
        op: 'set',
        field: 'notes',
        value: transaction.notes,
      });
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
    const schedules = await send(
      'query',
      q('schedules').filter({ id: scheduleId }).select('rule').serialize(),
    );

    const ruleId = schedules?.data?.[0]?.rule;

    if (ruleId) {
      const rule = await send('rule-get', { id: ruleId });

      if (rule) {
        const linkScheduleActions = rule.actions.filter(
          (a: RuleActionEntity) => a.op === 'link-schedule',
        );

        await send('rule-update', {
          ...rule,
          actions: [...linkScheduleActions, ...actions],
        });
      }
    }
  }

  return scheduleId;
}
