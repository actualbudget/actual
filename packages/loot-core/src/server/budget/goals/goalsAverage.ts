// @ts-strict-ignore

import * as monthUtils from '../../../shared/months';
import { getSheetValue } from '../actions';
import { AverageTemplate } from '../template.types';

export async function goalsAverage(
  template: AverageTemplate,
  month,
  category,
  errors,
  to_budget,
) {
  // simple has an 'amount' param
  let increment = 0;
  if (template.amount) {
    let sum = 0;
    for (let i = 1; i <= template.amount; i++) {
      // add up other months
      const sheetName = monthUtils.sheetForMonth(
        monthUtils.subMonths(month, i),
      );
      sum += await getSheetValue(sheetName, `sum-amount-${category.id}`);
    }
    increment = sum / template.amount;
  } else {
    errors.push('Number of months to average is not valid');
    return { to_budget, errors };
  }
  to_budget += -Math.round(increment);
  return { to_budget, errors };
}
