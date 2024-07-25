// @ts-strict-ignore
import { amountToInteger } from '../../../shared/util';
import { SimpleTemplate } from '../template.types';

interface GoalReturnType {
  to_budget: number;
  errors: string[];
  limit: number;
  limitCheck: boolean;
  hold: boolean;
}

export async function goalsSimple(
  template: SimpleTemplate,
  limitCheck: boolean,
  errors: string[],
  limit: number,
  hold: boolean,
  to_budget: number,
  last_month_balance: number,
): Promise<GoalReturnType> {
  // simple has 'monthly' and/or 'limit' params
  if (template.limit != null) {
    if (limitCheck) {
      errors.push(`More than one “up to” limit found.`);
      return { to_budget, errors, limit, limitCheck, hold };
    } else {
      limitCheck = true;
      limit = amountToInteger(template.limit.amount);
      hold = template.limit.hold;
    }
  }
  let increment = 0;
  if (template.monthly != null) {
    const monthly = amountToInteger(template.monthly);
    increment = monthly;
  } else {
    increment = limit - last_month_balance;
  }
  to_budget += increment;
  return { to_budget, errors, limit, limitCheck, hold };
}
