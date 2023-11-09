import * as monthUtils from '../../../shared/months';
import { amountToInteger } from '../../../shared/util';

export async function goalsWeek(
  template,
  limit,
  limitCheck,
  hold,
  current_month,
  to_budget,
  errors,
) {
  // week has 'amount', 'starting', 'weeks' and optional 'limit' params
  let amount = amountToInteger(template.amount);
  let weeks = template.weeks != null ? Math.round(template.weeks) : 1;
  if (template.limit != null) {
    if (limit > 0) {
      errors.push(`More than one “up to” limit found.`);
      return { to_budget, errors, limit, limitCheck, hold };
    } else {
      limitCheck = true;
      limit = amountToInteger(template.limit.amount);
      hold = template.limit.hold;
    }
  }
  let w = template.starting;
  let next_month = monthUtils.addMonths(current_month, 1);

  while (w < next_month) {
    if (w >= current_month) {
      to_budget += amount;
    }
    w = monthUtils.addWeeks(w, weeks);
  }
  return { to_budget, errors, limit, limitCheck, hold };
}
