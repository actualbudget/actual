import { t } from 'i18next';

import { extractScheduleConds } from 'loot-core/shared/schedules';
import type { RuleConditionOp, ScheduleEntity } from 'loot-core/types/models';

import type { ScheduleFormFields } from './ScheduleEditForm';

export function updateScheduleConditions(
  schedule: Partial<ScheduleEntity>,
  fields: ScheduleFormFields,
): { error?: string; conditions?: unknown[] } {
  const conds = extractScheduleConds(schedule._conditions);

  const updateCond = (
    cond: ReturnType<typeof extractScheduleConds>[keyof ReturnType<
      typeof extractScheduleConds
    >],
    op: RuleConditionOp,
    field: string,
    value: (typeof fields)[keyof typeof fields],
  ) => {
    if (cond) {
      return { ...cond, value };
    }

    if (value != null || field === 'payee') {
      return { op, field, value };
    }

    return null;
  };

  // Validate
  if (fields.date == null) {
    return { error: t('Date is required'), conditions: [] };
  }

  if (fields.amount == null) {
    return { error: t('A valid amount is required'), conditions: [] };
  }

  return {
    conditions: [
      updateCond(conds.payee, 'is', 'payee', fields.payee),
      updateCond(conds.account, 'is', 'account', fields.account),
      updateCond(conds.date, 'isapprox', 'date', fields.date),
      // We don't use `updateCond` for amount because we want to
      // overwrite it completely
      {
        op: (fields.amountOp || 'isapprox') as RuleConditionOp,
        field: 'amount',
        value: fields.amount,
      },
    ].filter(val => !!val),
  };
}
