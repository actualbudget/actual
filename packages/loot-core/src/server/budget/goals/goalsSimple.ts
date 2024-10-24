// @ts-strict-ignore
import { amountToInteger } from '../../../shared/util';

export async function goalsSimple(
  template,
  errors,
  limit,
  to_budget,
  last_month_balance,
) {
  // simple has 'monthly' and/or 'limit' params
  let increment = 0;
  if (template.monthly != null) {
    increment = amountToInteger(template.monthly);
  } else {
    increment = limit - last_month_balance;
  }
  to_budget += increment;
  return { to_budget, errors };
}
