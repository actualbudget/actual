import * as monthUtils from '../../shared/months';
import {
  extractScheduleConds,
  getScheduledAmount,
} from '../../shared/schedules';
import { amountToInteger, integerToAmount } from '../../shared/util';
import * as db from '../db';
import { getRuleForSchedule, getNextDate } from '../schedules/app';

import { setBudget, getSheetValue } from './actions';
import { parse } from './goal-template.pegjs';

export function applyTemplate({ month }) {
  return processTemplate(month, false);
}

export function overwriteTemplate({ month }) {
  return processTemplate(month, true);
}

export function runCheckTemplates() {
  return checkTemplates();
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

async function processTemplate(month, force) {
  let num_applied = 0;
  let errors = [];
  let category_templates = await getCategoryTemplates();
  let lowestPriority = 0;
  let originalCategoryBalance = [];

  let categories = await db.all(
    'SELECT * FROM v_categories WHERE tombstone = 0',
  );

  //clears templated categories
  for (let c = 0; c < categories.length; c++) {
    let category = categories[c];
    let budgeted = await getSheetValue(
      monthUtils.sheetForMonth(month),
      `budget-${category.id}`,
    );
    if (budgeted) {
      originalCategoryBalance.push({ cat: category, amount: budgeted });
    }
    let template = category_templates[category.id];
    if (template) {
      for (let l = 0; l < template.length; l++) {
        lowestPriority =
          template[l].priority > lowestPriority
            ? template[l].priority
            : lowestPriority;
      }
      await setBudget({
        category: category.id,
        month,
        amount: 0,
      });
    }
  }
  // find all remainder templates, place them after all other templates
  let remainder_found;
  let remainder_priority = lowestPriority + 1;
  let remainder_weight_total = 0;
  for (let c = 0; c < categories.length; c++) {
    let category = categories[c];
    let templates = category_templates[category.id];
    if (templates) {
      for (let i = 0; i < templates.length; i++) {
        if (templates[i].type === 'remainder') {
          templates[i].priority = remainder_priority;
          remainder_weight_total += templates[i].weight;
          remainder_found = true;
        }
      }
    }
  }
  // so the remainders don't get skiped
  if (remainder_found) lowestPriority = remainder_priority;

  let sheetName = monthUtils.sheetForMonth(month);
  let available_start = await getSheetValue(sheetName, `to-budget`);
  for (let priority = 0; priority <= lowestPriority; priority++) {
    // setup scaling for remainder
    let remainder_scale = 1;
    if (priority === lowestPriority) {
      let available_now = await getSheetValue(sheetName, `to-budget`);
      remainder_scale = Math.round(available_now / remainder_weight_total);
    }

    for (let c = 0; c < categories.length; c++) {
      let category = categories[c];
      let template = category_templates[category.id];
      if (template) {
        //check that all schedule and by lines have the same priority level
        let skipSchedule = false;
        let isScheduleOrBy = false;
        let priorityCheck = 0;
        if (
          template.filter(t => t.type === 'schedule' || t.type === 'by')
            .length > 0
        ) {
          let { lowPriority, errorNotice } = await checkScheduleTemplates(
            template,
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
            template = template.filter(t => t.priority === priority);
          }
          if (template.length > 0) {
            errors = errors.concat(
              template
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
            let { amount: to_budget, errors: applyErrors } =
              await applyCategoryTemplate(
                category,
                template,
                month,
                priority,
                remainder_scale,
                available_start,
                force,
              );
            if (to_budget != null) {
              num_applied++;
              await setBudget({
                category: category.id,
                month,
                amount: to_budget,
              });
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
  }
  if (!force) {
    //if overwrite is not preferred, set cell to original value
    for (let l = 0; l < originalCategoryBalance.length; l++) {
      await setBudget({
        category: originalCategoryBalance[l].cat.id,
        month,
        amount: originalCategoryBalance[l].amount,
      });
      //if overwrite is not preferred, remove template errors for category
      let j = errors.length;
      for (let k = 0; k < j; k++) {
        if (errors[k].includes(originalCategoryBalance[l].cat.name)) {
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
async function getCategoryTemplates() {
  let templates = {};

  let notes = await db.all(
    `SELECT * FROM notes WHERE lower(note) like '%${TEMPLATE_PREFIX}%'`,
  );

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
  priority,
  remainder_scale,
  available_start,
  force,
) {
  let current_month = `${month}-01`;
  let errors = [];
  let all_schedule_names = await db.all(
    'SELECT name from schedules WHERE name NOT NULL AND tombstone = 0',
  );
  all_schedule_names = all_schedule_names.map(v => v.name);

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
      } else {
        return a.type.localeCompare(b.type);
      }
    });
  }

  let sheetName = monthUtils.sheetForMonth(month);
  let budgeted = await getSheetValue(sheetName, `budget-${category.id}`);
  let spent = await getSheetValue(sheetName, `sum-amount-${category.id}`);
  let balance = await getSheetValue(sheetName, `leftover-${category.id}`);
  let budgetAvailable = await getSheetValue(sheetName, `to-budget`);
  let to_budget = budgeted;
  let limit;
  let hold;
  let last_month_balance = balance - spent - budgeted;
  let remainder = 0;
  for (let l = 0; l < template_lines.length; l++) {
    let template = template_lines[l];
    switch (template.type) {
      case 'simple': {
        // simple has 'monthly' and/or 'limit' params
        if (template.limit != null) {
          if (limit != null) {
            errors.push(`More than one “up to” limit found.`);
            return { errors };
          } else {
            limit = amountToInteger(template.limit.amount);
            hold = template.limit.hold;
          }
        }
        let increment = 0;
        if (template.monthly != null) {
          let monthly = amountToInteger(template.monthly);
          increment = monthly;
        } else {
          increment = limit;
        }
        if (to_budget + increment < budgetAvailable || !priority) {
          to_budget += increment;
        } else {
          if (budgetAvailable > 0) to_budget += budgetAvailable;
          errors.push(`Insufficient funds.`);
        }
        break;
      }
      case 'by': {
        // by has 'amount' and 'month' params
        let target = 0;
        let target_month = `${template_lines[l].month}-01`;
        let num_months = monthUtils.differenceInCalendarMonths(
          target_month,
          current_month,
        );
        let repeat =
          template.type === 'by'
            ? template.repeat
            : (template.repeat || 1) * 12;
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
        let diff = num_months >= 0 ? Math.round(target / (num_months + 1)) : 0;
        if (diff >= 0) {
          if (to_budget + diff < budgetAvailable || !priority) {
            to_budget += diff;
          } else {
            if (budgetAvailable > 0) to_budget += budgetAvailable;
            errors.push(`Insufficient funds.`);
          }
        }
        break;
      }
      case 'week': {
        // week has 'amount', 'starting', 'weeks' and optional 'limit' params
        let amount = amountToInteger(template.amount);
        let weeks = template.weeks != null ? Math.round(template.weeks) : 1;
        if (template.limit != null) {
          if (limit != null) {
            errors.push(`More than one “up to” limit found.`);
            return { errors };
          } else {
            limit = amountToInteger(template.limit.amount);
            hold = template.limit.hold;
          }
        }
        let w = template.starting;
        let next_month = monthUtils.addMonths(current_month, 1);

        while (w < next_month) {
          if (w >= current_month) {
            if (to_budget + amount < budgetAvailable || !priority) {
              to_budget += amount;
            } else {
              if (budgetAvailable > 0) to_budget += budgetAvailable;
              errors.push(`Insufficient funds.`);
            }
          }
          w = monthUtils.addWeeks(w, weeks);
        }
        break;
      }
      case 'spend': {
        // spend has 'amount' and 'from' and 'month' params
        let from_month = `${template.from}-01`;
        let to_month = `${template.month}-01`;
        let already_budgeted = last_month_balance;
        let first_month = true;
        for (
          let m = from_month;
          monthUtils.differenceInCalendarMonths(current_month, m) > 0;
          m = monthUtils.addMonths(m, 1)
        ) {
          let sheetName = monthUtils.sheetForMonth(
            monthUtils.format(m, 'yyyy-MM'),
          );

          if (first_month) {
            let spent = await getSheetValue(
              sheetName,
              `sum-amount-${category.id}`,
            );
            let balance = await getSheetValue(
              sheetName,
              `leftover-${category.id}`,
            );
            already_budgeted = balance - spent;
            first_month = false;
          } else {
            let budgeted = await getSheetValue(
              sheetName,
              `budget-${category.id}`,
            );
            already_budgeted += budgeted;
          }
        }
        let num_months = monthUtils.differenceInCalendarMonths(
          to_month,
          monthUtils._parse(current_month),
        );
        let target = amountToInteger(template.amount);

        let increment = 0;
        if (num_months < 0) {
          errors.push(`${template.month} is in the past.`);
          return { errors };
        } else if (num_months === 0) {
          increment = target - already_budgeted;
        } else {
          increment = Math.round(
            (target - already_budgeted) / (num_months + 1),
          );
        }
        if (increment < budgetAvailable || !priority) {
          to_budget = increment;
        } else {
          if (budgetAvailable > 0) to_budget = budgetAvailable;
          errors.push(`Insufficient funds.`);
        }
        break;
      }
      case 'percentage': {
        let percent = template.percent;
        let monthlyIncome = 0;
        if (template.category.toLowerCase() === 'all income') {
          monthlyIncome = await getSheetValue(sheetName, `total-income`);
        } else if (template.category.toLowerCase() === 'available funds') {
          monthlyIncome = available_start;
        } else {
          let income_category = (await db.getCategories()).find(
            c =>
              c.is_income &&
              c.name.toLowerCase() === template.category.toLowerCase(),
          );
          if (!income_category) {
            errors.push(`Could not find category “${template.category}”`);
            return { errors };
          }
          monthlyIncome = await getSheetValue(
            sheetName,
            `sum-amount-${income_category.id}`,
          );
        }
        let increment = Math.max(
          0,
          Math.round(monthlyIncome * (percent / 100)),
        );
        if (increment < budgetAvailable || !priority) {
          to_budget = increment;
        } else {
          if (budgetAvailable > 0) to_budget = budgetAvailable;
          errors.push(`Insufficient funds.`);
        }
        break;
      }
      case 'schedule': {
        let { id: schedule_id } = await db.first(
          'SELECT id FROM schedules WHERE name = ?',
          [template.name],
        );
        let rule = await getRuleForSchedule(schedule_id);
        let conditions = rule.serialize().conditions;
        let { date: dateCond, amount: amountCond } =
          extractScheduleConds(conditions);
        let next_date_string = getNextDate(
          dateCond,
          monthUtils._parse(current_month),
        );

        let isRepeating =
          Object(dateCond.value) === dateCond.value &&
          'frequency' in dateCond.value;

        let num_months = monthUtils.differenceInCalendarMonths(
          next_date_string,
          current_month,
        );

        if (isRepeating) {
          let monthlyTarget = 0;
          let next_month = monthUtils.addMonths(current_month, num_months + 1);
          let next_date = getNextDate(
            dateCond,
            monthUtils._parse(current_month),
          );
          while (next_date < next_month) {
            monthlyTarget += amountCond.value;
            next_date = monthUtils.addDays(next_date, 1);
            next_date = getNextDate(dateCond, monthUtils._parse(next_date));
          }
          amountCond.value = monthlyTarget;
        }

        if (template.full === true) {
          if (num_months === 1) {
            to_budget = -getScheduledAmount(amountCond.value);
          }
          break;
        }

        if (l === 0) remainder = last_month_balance;
        remainder = -getScheduledAmount(amountCond.value) - remainder;
        let target = 0;
        if (remainder >= 0) {
          target = remainder;
          remainder = 0;
        } else {
          target = 0;
          remainder = Math.abs(remainder);
        }
        let diff = num_months >= 0 ? Math.round(target / (num_months + 1)) : 0;
        if (num_months < 0) {
          errors.push(
            `Non-repeating schedule ${template.name} was due on ${next_date_string}, which is in the past.`,
          );
          return { errors };
        } else if (num_months >= 0) {
          if (
            (diff >= 0 &&
              num_months >= 0 &&
              to_budget + diff < budgetAvailable) ||
            !priority
          ) {
            to_budget += diff;
            if (l === template_lines.length - 1) to_budget -= spent;
          } else {
            if (budgetAvailable > 0) to_budget = budgetAvailable;
            errors.push(`Insufficient funds.`);
          }
        }
        break;
      }
      case 'remainder': {
        to_budget = Math.round(remainder_scale * template.weight);
        // can over budget with the rounding, so checking that
        if (to_budget > budgetAvailable) to_budget = budgetAvailable;
        break;
      }
      case 'error':
        return { errors };
      default:
    }
  }

  if (limit != null) {
    if (hold && balance > limit) {
      to_budget = 0;
    } else if (to_budget + last_month_balance > limit) {
      to_budget = limit - last_month_balance;
    }
  }
  if (
    ((category.budgeted != null && category.budgeted !== 0) ||
      to_budget === 0) &&
    !force
  ) {
    return { errors };
  } else if (category.budgeted === to_budget) {
    return null;
  } else {
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
}

async function checkTemplates() {
  let category_templates = await getCategoryTemplates();
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
