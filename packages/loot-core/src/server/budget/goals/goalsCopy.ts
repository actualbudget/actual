// @ts-strict-ignore
import * as monthUtils from '../../../shared/months';
import { getSheetValue } from '../actions';

import { amountToInteger } from '../../../shared/util';

export async function goalsCopy(
  template,
  month,
  category,
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
  if (template.lookBack) {
    const sheetName = monthUtils.sheetForMonth(
      monthUtils.subMonths(month,template.lookBack)
    );
    increment = await getSheetValue(sheetName, `budget-${category.id}`);
  } else {
    errors.push('Missing number of months to look back');
  }
  to_budget += increment;
  return { to_budget, errors, limit, limitCheck, hold };
}
