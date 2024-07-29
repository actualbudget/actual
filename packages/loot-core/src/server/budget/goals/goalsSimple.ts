// @ts-strict-ignore
import { ToBudget } from '../../../../../desktop-client/src/components/budget/rollover/budgetsummary/ToBudget';
import { amountToInteger } from '../../../shared/util';


export async function goalsSimple(
  template,
  limitCheck,
  errors,
  limit,
  hold,
  to_budget,
  last_month_balance,
  set_budget,
  payDistributeTemplateActive
) {
  // simple has 'monthly' and/or 'limit' params
  if (template.limit != null) {
    if (limitCheck) {
      return { to_budget, errors, limit, limitCheck, hold, set_budget };
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
  //if Pay Distribution isnt active on this category then set the budgeted
  if (!payDistributeTemplateActive) {
    set_budget += increment;
  }
  return {
    to_budget,
    errors,
    limit,
    limitCheck,
    hold,
    set_budget,
  };
}
