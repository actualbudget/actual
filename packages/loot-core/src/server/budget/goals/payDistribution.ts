// @ts-strict-ignore
import { amountToInteger } from '../../../shared/util';

export async function payDistribution(
  template,
  limitCheck,
  errors,
  limit,
  hold,
  to_budget,
  last_month_balance,
  set_budget,
  payToDistribute,
  
) {

  let increment = 0;
  if (template.percent)  {

    increment =  Math.max(0, Math.round(payToDistribute * (template.percent / 100)));
  } else {
    increment =  amountToInteger(template.amount);
  }

  if (increment > payToDistribute) {
    if (payToDistribute != 0) {
      errors.push("not enough funds to distribute only " + payToDistribute + " could be budgeted");

      increment = template.budgeted + payToDistribute;
    } else {

      errors.push("not enough funds to distribute");
      increment = template.budgeted;
    }
  } else {
    increment += template.budgeted;
  }

  set_budget += increment;
  return {
    to_budget,
    errors,
    limit,
    limitCheck,
    hold,
    set_budget,
    payToDistribute
  };
}
