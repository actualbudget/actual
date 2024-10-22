// @ts-strict-ignore
import * as monthUtils from '../../../shared/months';
import { amountToInteger } from '../../../shared/util';

export async function goalsWeek(
  template,
  current_month,
  to_budget,
  errors,
) {
  // week has 'amount', 'starting', 'weeks' and optional 'limit' params
  const amount = amountToInteger(template.amount);
  const weeks = template.weeks != null ? Math.round(template.weeks) : 1;
  let w = template.starting;
  const next_month = monthUtils.addMonths(current_month, 1);

  while (w < next_month) {
    if (w >= current_month) {
      to_budget += amount;
    }
    w = monthUtils.addWeeks(w, weeks);
  }
  return { to_budget, errors};
}
