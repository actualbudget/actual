// @ts-strict-ignore
import * as monthUtils from '../../../shared/months';
import * as db from '../../db';
import { getSheetValue } from '../actions';

export async function goalsPercentage(
  template,
  month,
  available_start,
  sheetName,
  to_budget,
  errors,
  set_budget,
  payDistributeTemplateActive,
) {
  const percent = template.percent;
  let monthlyIncome = 0;

  if (template.category.toLowerCase() === 'all income') {
    if (template.previous) {
      const sheetName_lastmonth = monthUtils.sheetForMonth(
        monthUtils.addMonths(month, -1),
      );
      monthlyIncome = await getSheetValue(sheetName_lastmonth, 'total-income');
    } else {
      monthlyIncome = await getSheetValue(sheetName, `total-income`);
    }
  } else if (template.category.toLowerCase() === 'available funds') {
    monthlyIncome = available_start;
  } else {
    const income_category = (await db.getCategories()).find(
      c =>
        c.is_income && c.name.toLowerCase() === template.category.toLowerCase(),
    );
    if (!income_category) {
      errors.push(`Could not find category “${template.category}”`);
      return { to_budget, errors, set_budget };
    }
    if (template.previous) {
      const sheetName_lastmonth = monthUtils.sheetForMonth(
        monthUtils.addMonths(month, -1),
      );
      monthlyIncome = await getSheetValue(
        sheetName_lastmonth,
        `sum-amount-${income_category.id}`,
      );
    } else {
      monthlyIncome = await getSheetValue(
        sheetName,
        `sum-amount-${income_category.id}`,
      );
    }
  }

  const increment = Math.max(0, Math.round(monthlyIncome * (percent / 100)));

  //if Pay Distribution isnt active on this category then set the budgeted
  if (!payDistributeTemplateActive) {
    set_budget += increment;
  }
  to_budget += increment;
  return { to_budget, errors, set_budget };
}
