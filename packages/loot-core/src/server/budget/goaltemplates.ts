// @ts-strict-ignore
import { Notification } from '../../client/state-types/notifications';
import * as monthUtils from '../../shared/months';
import { amountToInteger, integerToAmount } from '../../shared/util';
import * as db from '../db';
import { batchMessages } from '../sync';

import { getSheetValue, isReflectBudget, setBudget, setGoal } from './actions';
import { goalsAverage } from './goals/goalsAverage';
import { goalsBy } from './goals/goalsBy';
import { goalsPercentage } from './goals/goalsPercentage';
import { findRemainder, goalsRemainder } from './goals/goalsRemainder';
import { goalsSchedule } from './goals/goalsSchedule';
import { goalsSimple } from './goals/goalsSimple';
import { goalsSpend } from './goals/goalsSpend';
import { goalsWeek } from './goals/goalsWeek';
import { checkTemplates, storeTemplates } from './template-notes';

const TEMPLATE_PREFIX = '#template';

export async function applyTemplate({ month }) {
  await storeTemplates();
  const category_templates = await getTemplates(null, 'template');
  const category_goals = await getTemplates(null, 'goal');
  const ret = await processTemplate(month, false, category_templates);
  await processGoals(category_goals, month);
  return ret;
}

export async function overwriteTemplate({ month }) {
  await storeTemplates();
  const category_templates = await getTemplates(null, 'template');
  const category_goals = await getTemplates(null, 'goal');
  const ret = await processTemplate(month, true, category_templates);
  await processGoals(category_goals, month);
  return ret;
}

export async function applySingleCategoryTemplate({ month, category }) {
  const categories = await db.all(`SELECT * FROM v_categories WHERE id = ?`, [
    category,
  ]);
  await storeTemplates();
  const category_templates = await getTemplates(categories[0], 'template');
  const category_goals = await getTemplates(categories[0], 'goal');
  const ret = await processTemplate(
    month,
    true,
    category_templates,
    categories[0],
  );
  await processGoals(category_goals, month, categories[0]);
  return ret;
}

export function runCheckTemplates() {
  return checkTemplates();
}

async function getCategories() {
  return await db.all(
    `
    SELECT categories.* FROM categories
    INNER JOIN category_groups on categories.cat_group = category_groups.id
    WHERE categories.tombstone = 0 AND categories.hidden = 0
    AND category_groups.hidden = 0
    `,
  );
}

function checkScheduleTemplates(template) {
  let lowPriority = template[0].priority;
  let errorNotice = false;
  for (let l = 1; l < template.length; l++) {
    if (template[l].priority !== lowPriority) {
      lowPriority = Math.min(lowPriority, template[l].priority);
      errorNotice = true;
    }
  }
  return { lowPriority, errorNotice };
}

async function setGoalBudget({ month, templateBudget }) {
  await batchMessages(async () => {
    templateBudget.forEach(element => {
      setBudget({
        category: element.category,
        month,
        amount: element.amount,
      });
    });
  });
}

async function setCategoryTargets({ month, idealTemplate }) {
  await batchMessages(async () => {
    idealTemplate.forEach(element => {
      setGoal({
        category: element.category,
        goal: element.amount,
        month,
        long_goal: 0,
      });
    });
  });
}

async function resetCategoryTargets(month, category) {
  let categories = [];
  if (category === null) {
    categories = await getCategories();
  } else {
    categories = category;
  }
  await batchMessages(async () => {
    for (let i = 0; i < categories.length; i++) {
      setGoal({
        category: categories[i].id,
        goal: null,
        month,
        long_goal: null,
      });
    }
  });
}

async function getTemplates(category, directive: string) {
  //retrieves template definitions from the database
  const goal_def = await db.all(
    'SELECT * FROM categories WHERE goal_def IS NOT NULL',
  );

  const templates = [];
  for (let ll = 0; ll < goal_def.length; ll++) {
    templates[goal_def[ll].id] = JSON.parse(goal_def[ll].goal_def);
  }
  if (category) {
    const singleCategoryTemplate = [];
    if (templates[category.id] !== undefined) {
      singleCategoryTemplate[category.id] = templates[category.id].filter(
        t => t.directive === directive,
      );
      return singleCategoryTemplate;
    }
    singleCategoryTemplate[category.id] = undefined;
    return singleCategoryTemplate;
  } else {
    const categories = await getCategories();
    const ret = [];
    for (let cc = 0; cc < categories.length; cc++) {
      const id = categories[cc].id;
      if (templates[id]) {
        ret[id] = templates[id];
        ret[id] = ret[id].filter(t => t.directive === directive);
      }
    }
    return ret;
  }
}

async function processTemplate(
  month,
  force,
  category_templates,
  category?,
): Promise<Notification> {
  let num_applied = 0;
  let errors = [];
  const idealTemplate = [];
  const setToZero = [];
  let priority_list = [];

  let categories = [];
  const categories_remove = [];
  if (category) {
    categories[0] = category;
  } else {
    categories = await getCategories();
  }

  //clears templated categories
  for (let c = 0; c < categories.length; c++) {
    const category = categories[c];
    const budgeted = await getSheetValue(
      monthUtils.sheetForMonth(month),
      `budget-${category.id}`,
    );
    const template = category_templates[category.id];
    if (template) {
      for (let l = 0; l < template.length; l++) {
        //add each priority we need to a list.  Will sort later
        if (template[l].priority == null) {
          continue;
        }
        priority_list.push(template[l].priority);
      }
    }
    if (budgeted) {
      if (!force) {
        // save index of category to remove
        categories_remove.push(c);
      } else {
        // add all categories with a template to the list to unset budget
        if (template?.length > 0) {
          setToZero.push({
            category: category.id,
          });
        }
      }
    }
  }

  // remove the categories we are skipping
  // Go backwards through the list so the indexes don't change
  // on the categories we need
  for (let i = categories_remove.length - 1; i >= 0; i--) {
    categories.splice(categories_remove[i], 1);
  }

  // zero out budget and goal from categories that need it
  await setGoalBudget({
    month,
    templateBudget: setToZero,
  });
  await resetCategoryTargets(month, categories);

  // sort and filter down to just the requested priorities
  priority_list = priority_list
    .sort(function (a, b) {
      return a - b;
    })
    .filter((item, index, curr) => curr.indexOf(item) === index);

  const { remainder_found, remainder_priority, remainder_weight_total } =
    findRemainder(priority_list, categories, category_templates);
  if (remainder_found) priority_list.push(remainder_priority);

  const sheetName = monthUtils.sheetForMonth(month);
  const available_start = await getSheetValue(sheetName, `to-budget`);
  let budgetAvailable = isReflectBudget()
    ? await getSheetValue(sheetName, `total-saved`)
    : await getSheetValue(sheetName, `to-budget`);
  for (let ii = 0; ii < priority_list.length; ii++) {
    const priority = priority_list[ii];
    const templateBudget = [];

    // setup scaling for remainder
    let remainder_scale = 1;
    if (priority === remainder_priority && remainder_found) {
      const available_now = await getSheetValue(sheetName, `to-budget`);
      remainder_scale = available_now / remainder_weight_total;
    }

    for (let c = 0; c < categories.length; c++) {
      const category = categories[c];
      let template_lines = category_templates[category.id];
      if (template_lines) {
        //check that all schedule and by lines have the same priority level
        let skipSchedule = false;
        let isScheduleOrBy = false;
        let priorityCheck = 0;
        if (
          template_lines.filter(
            t =>
              (t.type === 'schedule' || t.type === 'by') &&
              t.priority === priority,
          ).length > 0
        ) {
          template_lines = template_lines.filter(
            t =>
              (t.priority === priority &&
                (t.type !== 'schedule' || t.type !== 'by')) ||
              t.type === 'schedule' ||
              t.type === 'by',
          );
          const { lowPriority, errorNotice } =
            await checkScheduleTemplates(template_lines);
          priorityCheck = lowPriority;
          skipSchedule = priorityCheck !== priority ? true : false;
          isScheduleOrBy = true;
          if (!skipSchedule && errorNotice) {
            errors.push(
              category.name +
                ': Schedules and By templates should all have the same priority.  Using priority ' +
                priorityCheck,
            );
          }
        }
        if (!skipSchedule) {
          if (!isScheduleOrBy) {
            template_lines = template_lines.filter(
              t => t.priority === priority,
            );
          }
          if (template_lines.length > 0) {
            errors = errors.concat(
              template_lines
                .filter(t => t.type === 'error')
                .map(({ line, error }) =>
                  [
                    category.name + ': ' + error.message,
                    line,
                    ' '.repeat(
                      TEMPLATE_PREFIX.length + error.location.start.offset,
                    ) + '^',
                  ].join('\n'),
                ),
            );
            const prev_budgeted = await getSheetValue(
              sheetName,
              `budget-${category.id}`,
            );
            const { amount: originalToBudget, errors: applyErrors } =
              await applyCategoryTemplate(
                category,
                template_lines,
                month,
                remainder_scale,
                available_start,
                budgetAvailable,
                prev_budgeted,
              );

            let to_budget = originalToBudget;
            if (to_budget != null) {
              num_applied++;
              //only store goals from non remainder templates
              if (priority !== remainder_priority) {
                if (
                  idealTemplate.filter(c => c.category === category.id).length >
                  0
                ) {
                  idealTemplate.filter(
                    c => c.category === category.id,
                  )[0].amount += to_budget;
                } else {
                  idealTemplate.push({
                    category: category.id,
                    amount: to_budget,
                  });
                }
              }
              if (to_budget <= budgetAvailable || !priority) {
                templateBudget.push({
                  category: category.id,
                  amount: to_budget + prev_budgeted,
                });
              } else if (to_budget > budgetAvailable && budgetAvailable >= 0) {
                to_budget = budgetAvailable;
                errors.push(`Insufficient funds.`);
                templateBudget.push({
                  category: category.id,
                  amount: to_budget + prev_budgeted,
                });
              }
              budgetAvailable -= to_budget;
            }
            if (applyErrors != null) {
              errors = errors.concat(
                applyErrors.map(error => `${category.name}: ${error}`),
              );
            }
          }
        }
      }
    }
    await setGoalBudget({ month, templateBudget });
  }
  await setCategoryTargets({ month, idealTemplate });

  if (num_applied === 0) {
    if (errors.length) {
      return {
        type: 'error',
        sticky: true,
        message: `There were errors interpreting some templates:`,
        pre: errors.join('\n\n'),
      };
    } else {
      return { type: 'message', message: 'All categories were up to date.' };
    }
  } else {
    const applied = `Successfully applied ${num_applied} templates.`;
    if (errors.length) {
      return {
        sticky: true,
        message: `${applied} There were errors interpreting some templates:`,
        pre: errors.join('\n\n'),
      };
    } else {
      return {
        type: 'message',
        message: applied,
      };
    }
  }
}

async function processGoals(goals, month, category?) {
  let categories = [];
  if (category) {
    categories[0] = category;
  } else {
    categories = await getCategories();
  }
  for (let c = 0; c < categories.length; c++) {
    const cat_id = categories[c].id;
    const goal_lines = goals[cat_id];
    if (goal_lines?.length > 0) {
      await setGoal({
        month,
        category: cat_id,
        goal: amountToInteger(goal_lines[0].amount),
        long_goal: 1,
      });
    }
  }
}

async function applyCategoryTemplate(
  category,
  template_lines,
  month,
  remainder_scale,
  available_start,
  budgetAvailable,
  prev_budgeted,
) {
  const current_month = `${month}-01`;
  let errors = [];
  let all_schedule_names = await db.all(
    'SELECT name from schedules WHERE name NOT NULL AND tombstone = 0',
  );
  all_schedule_names = all_schedule_names.map(v => v.name);

  let scheduleFlag = false; //only run schedules portion once

  // remove lines for past dates, calculate repeating dates
  template_lines = template_lines.filter(template => {
    switch (template.type) {
      case 'by':
      case 'spend':
        let target_month = `${template.month}-01`;
        let num_months = monthUtils.differenceInCalendarMonths(
          target_month,
          current_month,
        );
        const repeat = template.annual
          ? (template.repeat || 1) * 12
          : template.repeat;

        let spend_from;
        if (template.type === 'spend') {
          spend_from = `${template.from}-01`;
        }
        while (num_months < 0 && repeat) {
          target_month = monthUtils.addMonths(target_month, repeat);
          if (spend_from) {
            spend_from = monthUtils.addMonths(spend_from, repeat);
          }
          num_months = monthUtils.differenceInCalendarMonths(
            target_month,
            current_month,
          );
        }
        if (num_months < 0) {
          errors.push(`${template.month} is in the past.`);
          return false;
        }
        template.month = monthUtils.format(target_month, 'yyyy-MM');
        if (spend_from) {
          template.from = monthUtils.format(spend_from, 'yyyy-MM');
        }
        break;
      case 'schedule':
        if (!all_schedule_names.includes(template.name)) {
          errors.push(`Schedule ${template.name} does not exist`);
          return null;
        }
        break;
      default:
    }
    return true;
  });

  if (template_lines.length > 1) {
    template_lines = template_lines.sort((a, b) => {
      if (a.type === 'by' && !a.annual) {
        return monthUtils.differenceInCalendarMonths(
          `${a.month}-01`,
          `${b.month}-01`,
        );
      } else if (a.type === 'schedule' || b.type === 'schedule') {
        return a.priority - b.priority;
      } else {
        return a.type.localeCompare(b.type);
      }
    });
  }

  const sheetName = monthUtils.sheetForMonth(month);
  const spent = await getSheetValue(sheetName, `sum-amount-${category.id}`);
  const balance = await getSheetValue(sheetName, `leftover-${category.id}`);
  const last_month_balance = balance - spent - prev_budgeted;
  let to_budget = 0;
  let limit = 0;
  let hold = false;
  let limitCheck = false;
  let remainder = 0;

  for (let l = 0; l < template_lines.length; l++) {
    const template = template_lines[l];
    switch (template.type) {
      case 'simple': {
        const goalsReturn = await goalsSimple(
          template,
          limitCheck,
          errors,
          limit,
          hold,
          to_budget,
          last_month_balance,
        );
        to_budget = goalsReturn.to_budget;
        errors = goalsReturn.errors;
        limit = goalsReturn.limit;
        limitCheck = goalsReturn.limitCheck;
        hold = goalsReturn.hold;
        break;
      }
      case 'by': {
        const goalsReturn = await goalsBy(
          template_lines,
          current_month,
          template,
          l,
          remainder,
          last_month_balance,
          to_budget,
          errors,
        );
        to_budget = goalsReturn.to_budget;
        errors = goalsReturn.errors;
        remainder = goalsReturn.remainder;
        break;
      }
      case 'week': {
        const goalsReturn = await goalsWeek(
          template,
          limit,
          limitCheck,
          hold,
          current_month,
          to_budget,
          errors,
        );
        to_budget = goalsReturn.to_budget;
        errors = goalsReturn.errors;
        limit = goalsReturn.limit;
        limitCheck = goalsReturn.limitCheck;
        hold = goalsReturn.hold;
        break;
      }
      case 'spend': {
        const goalsReturn = await goalsSpend(
          template,
          last_month_balance,
          current_month,
          to_budget,
          errors,
          category,
        );
        to_budget = goalsReturn.to_budget;
        errors = goalsReturn.errors;
        break;
      }
      case 'percentage': {
        const goalsReturn = await goalsPercentage(
          template,
          month,
          available_start,
          sheetName,
          to_budget,
          errors,
        );
        to_budget = goalsReturn.to_budget;
        errors = goalsReturn.errors;
        break;
      }
      case 'schedule': {
        const goalsReturn = await goalsSchedule(
          scheduleFlag,
          template_lines,
          current_month,
          balance,
          remainder,
          last_month_balance,
          to_budget,
          errors,
          category,
        );
        to_budget = goalsReturn.to_budget;
        errors = goalsReturn.errors;
        remainder = goalsReturn.remainder;
        scheduleFlag = goalsReturn.scheduleFlag;
        break;
      }
      case 'remainder': {
        const goalsReturn = await goalsRemainder(
          template,
          budgetAvailable,
          remainder_scale,
          to_budget,
        );
        to_budget = goalsReturn.to_budget;
        break;
      }
      case 'average': {
        const goalsReturn = await goalsAverage(
          template,
          current_month,
          category,
          errors,
          to_budget,
        );
        to_budget = goalsReturn.to_budget;
        errors = goalsReturn.errors;
        break;
      }
      case 'error':
        return { errors };
      default:
    }
  }

  if (limitCheck) {
    if (hold && balance > limit) {
      to_budget = 0;
    } else if (to_budget + balance > limit) {
      to_budget = limit - balance;
    }
  }
  // setup notifications
  let str = category.name + ': ' + integerToAmount(last_month_balance);
  str +=
    ' + ' +
    integerToAmount(to_budget) +
    ' = ' +
    integerToAmount(last_month_balance + to_budget);
  str += ' ' + template_lines.map(x => x.line).join('\n');
  console.log(str);
  return { amount: to_budget, errors };
}
