// @ts-strict-ignore
import * as monthUtils from '../../../shared/months';
import { getSheetValue } from '../actions';

export async function goalsCopy(template, month, category, errors, to_budget) {
  // simple has 'monthly' and/or 'limit' params
  let increment = 0;
  if (template.lookBack) {
    const sheetName = monthUtils.sheetForMonth(
      monthUtils.subMonths(month, template.lookBack),
    );
    increment = await getSheetValue(sheetName, `budget-${category.id}`);
  } else {
    errors.push('Missing number of months to look back');
  }
  to_budget += increment;
  return { to_budget, errors };
}
