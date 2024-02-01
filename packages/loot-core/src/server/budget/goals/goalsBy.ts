// @ts-strict-ignore
import * as monthUtils from '../../../shared/months';
import { amountToInteger } from '../../../shared/util';
import { isReflectBudget } from '../actions';

export async function goalsBy(
  template_lines,
  current_month,
  template,
  l,
  remainder,
  last_month_balance,
  to_budget,
  errors,
) {
  // by has 'amount' and 'month' params
  if (!isReflectBudget()) {
    let target = 0;
    let target_month = `${template_lines[l].month}-01`;
    let num_months = monthUtils.differenceInCalendarMonths(
      target_month,
      current_month,
    );
    const repeat =
      template.type === 'by' ? template.repeat : (template.repeat || 1) * 12;
    while (num_months < 0 && repeat) {
      target_month = monthUtils.addMonths(target_month, repeat);
      num_months = monthUtils.differenceInCalendarMonths(
        template_lines[l].month,
        current_month,
      );
    }
    if (l === 0) remainder = last_month_balance;
    remainder = amountToInteger(template_lines[l].amount) - remainder;
    if (remainder >= 0) {
      target = remainder;
      remainder = 0;
    } else {
      target = 0;
      remainder = Math.abs(remainder);
    }
    const increment =
      num_months >= 0 ? Math.round(target / (num_months + 1)) : 0;
    to_budget += increment;
  } else {
    errors.push(`by templates are not supported in Report budgets`);
  }
  return { to_budget, errors, remainder };
}
