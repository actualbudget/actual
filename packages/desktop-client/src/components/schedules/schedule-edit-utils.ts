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
  { excludeFormulaAmount = false }: { excludeFormulaAmount?: boolean } = {},
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

  if (fields.amount == null) {
    return { error: t('A valid amount is required'), conditions: [] };
  }

  const isFormula = fields.amountOp === 'formula';

  // A formula amount can never be evaluated by the DB layer (see
  // `conditionsToAQL`), so it's irrelevant to the transaction match search.
  // Skip validating and including it there — an incomplete formula should not
  // break the match preview, which still matches on payee/account/date.
  if (isFormula && !excludeFormulaAmount) {
    const formula = typeof fields.amount === 'string' ? fields.amount : '';
    if (!formula.startsWith('=') || formula.replace(/^=/, '').trim() === '') {
      return {
        error: t('Formula must start with ='),
        conditions: [],
      };
    }
  }

  return {
    conditions: [
      updateCond(conds.payee, 'is', 'payee', fields.payee),
      updateCond(conds.account, 'is', 'account', fields.account),
      updateCond(conds.date, 'isapprox', 'date', fields.date),
      // We don't use `updateCond` for amount because we want to
      // overwrite it completely. Omit a formula amount from the match search
      // since it can't be applied at the DB layer anyway.
      isFormula && excludeFormulaAmount
        ? null
        : {
            op: (fields.amountOp || 'isapprox') as RuleConditionOp,
            field: 'amount',
            value: fields.amount,
          },
    ].filter((val): val is RuleConditionEntity => val != null),
  };
}
