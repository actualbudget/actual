import { amountToInteger } from '../../../shared/util';

export async function goalsSimple(
  template,
  limitCheck,
  errors,
  limit,
  hold,
  to_budget,
) {
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
    let monthly = amountToInteger(template.monthly);
    increment = monthly;
  } else {
    increment = limit;
  }
  to_budget += increment;
  return { to_budget, errors, limit, limitCheck, hold };
}
