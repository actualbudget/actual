import { extractScheduleConds } from '@actual-app/core/shared/schedules';
import type {
  RuleConditionEntity,
  RuleConditionOp,
  ScheduleEntity,
} from '@actual-app/core/types/models';
import { t } from 'i18next';

import type { ScheduleFormFields } from './ScheduleEditForm';

export function updateScheduleConditions(
  schedule: Partial<ScheduleEntity>,
  fields: ScheduleFormFields,
  { forMatchSearch = false }: { forMatchSearch?: boolean } = {},
): { error?: string; conditions?: RuleConditionEntity[] } {
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

  const isFormula = fields.amountOp === 'formula';

  if (fields.amount == null) {
    return { error: t('A valid amount is required'), conditions: [] };
  }

  // The match search only needs conditions the DB can evaluate; a formula
  // amount is skipped by the query layer anyway, so an incomplete formula
  // should not block the search. Save-time validation below stays strict.
  if (isFormula && !forMatchSearch) {
    const formula = typeof fields.amount === 'string' ? fields.amount : '';
    if (!formula.startsWith('=') || formula.replace(/^=/, '').trim() === '') {
      return { error: t('Formula must start with ='), conditions: [] };
    }
  }

  return {
    conditions: [
      updateCond(conds.payee, 'is', 'payee', fields.payee),
      updateCond(conds.account, 'is', 'account', fields.account),
      updateCond(conds.date, 'isapprox', 'date', fields.date),
      // We don't use `updateCond` for amount because we want to
      // overwrite it completely
      isFormula && typeof fields.amount === 'string'
        ? {
            op: 'formula',
            field: 'amount',
            value: fields.amount,
            type: 'string',
          }
        : {
            op: (fields.amountOp || 'isapprox') as RuleConditionOp,
            field: 'amount',
            value: fields.amount,
          },
    ].filter((val): val is RuleConditionEntity => val != null),
  };
}
