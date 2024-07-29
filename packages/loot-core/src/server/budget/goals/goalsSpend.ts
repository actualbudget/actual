// @ts-strict-ignore
import * as monthUtils from '../../../shared/months';
import { amountToInteger } from '../../../shared/util';
import { getSheetValue } from '../actions';

export async function goalsSpend(
  template,
  last_month_balance,
  current_month,
  to_budget,
  errors,
  category,
  set_budget,
  payDistributeTemplateActive
) {
  // spend has 'amount' and 'from' and 'month' params
  const from_month = `${template.from}-01`;
  const to_month = `${template.month}-01`;
  let already_budgeted = last_month_balance;
  let first_month = true;
  for (
    let m = from_month;
    monthUtils.differenceInCalendarMonths(current_month, m) > 0;
    m = monthUtils.addMonths(m, 1)
  ) {
    const sheetName = monthUtils.sheetForMonth(monthUtils.format(m, 'yyyy-MM'));

    if (first_month) {
      const spent = await getSheetValue(sheetName, `sum-amount-${category.id}`);
      const balance = await getSheetValue(sheetName, `leftover-${category.id}`);
      already_budgeted = balance - spent;
      first_month = false;
    } else {
      const budgeted = await getSheetValue(sheetName, `budget-${category.id}`);
      already_budgeted += budgeted;
    }
  }
  const num_months = monthUtils.differenceInCalendarMonths(
    to_month,
    monthUtils._parse(current_month),
  );
  const target = amountToInteger(template.amount);

  let increment = 0;
  if (num_months < 0) {
    errors.push(`${template.month} is in the past.`);
    return { to_budget, errors, set_budget };
  } else if (num_months === 0) {
    increment = target - already_budgeted;
  } else {
    increment = Math.round((target - already_budgeted) / (num_months + 1));
  }
   //if Pay Distribution isnt active on this category then set the budgeted
   if (!payDistributeTemplateActive) {
    set_budget = increment;
  }
  to_budget = increment;
  return { to_budget, errors, set_budget };
}
