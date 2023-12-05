import { Notification } from '../../client/state-types/notifications';
import * as monthUtils from '../../shared/months';
import { integerToAmount } from '../../shared/util';
import * as db from '../db';
import { batchMessages } from '../sync';

import { setBudget, getSheetValue, isReflectBudget, setGoal } from './actions';
import { parse } from './goal-template.pegjs';
import { goalsBy } from './goals/goalsBy';
import { goalsPercentage } from './goals/goalsPercentage';
import { findRemainder, goalsRemainder } from './goals/goalsRemainder';
import { goalsSchedule } from './goals/goalsSchedule';
import { goalsSimple } from './goals/goalsSimple';
import { goalsSpend } from './goals/goalsSpend';
import { goalsWeek } from './goals/goalsWeek';

export async function applyTemplate({ month }) {
  await storeTemplates();
  let category_templates = await getTemplates(null);
  await resetCategoryTargets({ month, category: null });
  return processTemplate(month, false, category_templates);
}

export async function overwriteTemplate({ month }) {
  await storeTemplates();
  let category_templates = await getTemplates(null);
  await resetCategoryTargets({ month, category: null });
  return processTemplate(month, true, category_templates);
}

export async function applySingleCategoryTemplate({ month, category }) {
  let categories = await db.all(`SELECT * FROM v_categories WHERE id = ?`, [
    category,
  ]);
  await storeTemplates();
  let category_templates = await getTemplates(categories[0]);
  await resetCategoryTargets({ month, category: categories });
  return processTemplate(month, true, category_templates);
}

export function runCheckTemplates() {
  return checkTemplates();
}

async function getCategories() {
  return await db.all(
    'SELECT * FROM v_categories WHERE tombstone = 0 AND hidden = 0',
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
      });
    });
  });
}

async function resetCategoryTargets({ month, category }) {
  let categories;
  if (category === null) {
    categories = await getCategories();
  } else {
    categories = category;
  }
  await batchMessages(async () => {
    categories.forEach(element => {
      setGoal({
        category: element.id,
        goal: null,
        month,
      });
    });
  });
}

async function storeTemplates() {
  //stores the template definitions to the database
  let templates = await getCategoryTemplates(null);
  let categories = await getCategories();

  for (let c = 0; c < categories.length; c++) {
    let template = templates[categories[c].id];
    if (template) {
      await db.update('categories', {
        id: categories[c].id,
        goal_def: JSON.stringify(template),
      });
    } else {
      await db.update('categories', {
        id: categories[c].id,
        goal_def: null,
      });
    }
  }
}

async function getTemplates(category) {
  //retrieves template definitions from the database
  const goal_def = await db.all(
    'SELECT * FROM categories WHERE goal_def IS NOT NULL',
  );

  let templates = [];
  for (let ll = 0; ll < goal_def.length; ll++) {
    templates[goal_def[ll].id] = JSON.parse(goal_def[ll].goal_def);
  }
  if (category) {
    let singleCategoryTemplate = {};
    if (templates[category.id] !== undefined) {
      singleCategoryTemplate[category.id] = templates[category.id];
    }
    return singleCategoryTemplate;
  } else {
    return templates;
  }
}

async function processTemplate(
  month,
  force,
  category_templates,
): Promise<Notification> {
  let num_applied = 0;
  let errors = [];
  let originalCategoryBalance = [];
  let idealTemplate = [];
  let setToZero = [];
  let priority_list = [];

  let categories = await getCategories();

  //clears templated categories
  for (let c = 0; c < categories.length; c++) {
    let category = categories[c];
    let budgeted = await getSheetValue(
      monthUtils.sheetForMonth(month),
      `budget-${category.id}`,
    );
    let template = category_templates[category.id];
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
      originalCategoryBalance.push({
        category: category.id,
        amount: budgeted,
        isIncome: category.is_income,
        isTemplate: template ? true : false,
      });
      setToZero.push({
        category: category.id,
        amount: 0,
        isIncome: category.is_income,
        isTemplate: template ? true : false,
      });
    }
  }
  await setGoalBudget({
    month,
    templateBudget: setToZero.filter(f => f.isTemplate === true),
  });

  // sort and filter down to just the requested priorities
  priority_list = priority_list
    .sort()
    .filter((item, index, curr) => curr.indexOf(item) === index);

  let { remainder_found, remainder_priority, remainder_weight_total } =
    findRemainder(priority_list, categories, category_templates);
  if (remainder_found) priority_list.push(remainder_priority);

  let sheetName = monthUtils.sheetForMonth(month);
  let available_start = await getSheetValue(sheetName, `to-budget`);
  let budgetAvailable = isReflectBudget()
    ? await getSheetValue(sheetName, `total-saved`)
    : await getSheetValue(sheetName, `to-budget`);
  for (let ii = 0; ii < priority_list.length; ii++) {
    let priority = priority_list[ii];
    let templateBudget = [];

    // setup scaling for remainder
    let remainder_scale = 1;
    if (priority === remainder_priority && remainder_found) {
      let available_now = await getSheetValue(sheetName, `to-budget`);
      remainder_scale = available_now / remainder_weight_total;
    }

    for (let c = 0; c < categories.length; c++) {
      let category = categories[c];
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
          let { lowPriority, errorNotice } = await checkScheduleTemplates(
            template_lines,
          );
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
            let prev_budgeted = await getSheetValue(
              sheetName,
              `budget-${category.id}`,
            );
            let { amount: to_budget, errors: applyErrors } =
              await applyCategoryTemplate(
                category,
                template_lines,
                month,
                remainder_scale,
                available_start,
                budgetAvailable,
                prev_budgeted,
              );
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
  if (!force) {
    //if overwrite is not preferred, set cell to original value;
    originalCategoryBalance = originalCategoryBalance.filter(
      c => c.isIncome === 0 && c.isTemplate,
    );
    for (let l = 0; l < originalCategoryBalance.length; l++) {
      await setBudget({
        category: originalCategoryBalance[l].category,
        month,
        amount: originalCategoryBalance[l].amount,
      });
      //if overwrite is not preferred, remove template errors for category
      let j = errors.length;
      for (let k = 0; k < j; k++) {
        if (
          errors[k].includes(
            categories.filter(
              c => c.id === originalCategoryBalance[l].category,
            )[0].name,
          )
        ) {
          errors.splice(k, 1);
          j--;
        }
      }
    }
  }
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
    let applied = `Successfully applied ${num_applied} templates.`;
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

const TEMPLATE_PREFIX = '#template';
async function getCategoryTemplates(category) {
  let templates = {};

  let notes = await db.all(
    `SELECT * FROM notes WHERE lower(note) like '%${TEMPLATE_PREFIX}%'`,
  );
  if (category) notes = notes.filter(n => n.id === category.id);

  for (let n = 0; n < notes.length; n++) {
    let lines = notes[n].note.split('\n');
    let template_lines = [];
    for (let l = 0; l < lines.length; l++) {
      let line = lines[l].trim();
      if (!line.toLowerCase().startsWith(TEMPLATE_PREFIX)) continue;
      let expression = line.slice(TEMPLATE_PREFIX.length);
      try {
        let parsed = parse(expression);
        template_lines.push(parsed);
      } catch (e) {
        template_lines.push({ type: 'error', line, error: e });
      }
    }
    if (template_lines.length) {
      templates[notes[n].id] = template_lines;
    }
  }
  return templates;
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
  let current_month = `${month}-01`;
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
        let repeat = template.annual
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
    let template = template_lines[l];
    switch (template.type) {
      case 'simple': {
        let goalsReturn = await goalsSimple(
          template,
          limitCheck,
          errors,
          limit,
          hold,
          to_budget,
        );
        to_budget = goalsReturn.to_budget;
        errors = goalsReturn.errors;
        limit = goalsReturn.limit;
        limitCheck = goalsReturn.limitCheck;
        hold = goalsReturn.hold;
        break;
      }
      case 'by': {
        let goalsReturn = await goalsBy(
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
        let goalsReturn = await goalsWeek(
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
        let goalsReturn = await goalsSpend(
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
        let goalsReturn = await goalsPercentage(
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
        let goalsReturn = await goalsSchedule(
          scheduleFlag,
          template_lines,
          current_month,
          balance,
          remainder,
          last_month_balance,
          to_budget,
          errors,
        );
        to_budget = goalsReturn.to_budget;
        errors = goalsReturn.errors;
        remainder = goalsReturn.remainder;
        scheduleFlag = goalsReturn.scheduleFlag;
        break;
      }
      case 'remainder': {
        let goalsReturn = await goalsRemainder(
          template,
          budgetAvailable,
          remainder_scale,
          to_budget,
        );
        to_budget = goalsReturn.to_budget;
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

async function checkTemplates(): Promise<Notification> {
  let category_templates = await getCategoryTemplates(null);
  let errors = [];

  let categories = await db.all(
    'SELECT * FROM v_categories WHERE tombstone = 0',
  );

  // run through each line and see if its an error
  for (let c = 0; c < categories.length; c++) {
    let category = categories[c];
    let template = category_templates[category.id];
    if (template) {
      for (let l = 0; l < template.length; l++) {
        if (template[l].type === 'error') {
          //return { type: 'message', message: "found a bad one",};
          errors.push(category.name + ': ' + template[l].line);
        }
      }
    }
  }
  if (errors.length) {
    return {
      sticky: true,
      message: `There were errors interpreting some templates:`,
      pre: errors.join('\n\n'),
    };
  } else {
    return {
      type: 'message',
      message: 'All templates passed! 🎉',
    };
  }
}
