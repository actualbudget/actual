import {
  differenceInCalendarMonths,
  addMonths,
  addWeeks,
  addDays,
  format,
} from 'date-fns';

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

async function processTemplate(month, force) {
  let category_templates = await getCategoryTemplates();
  let errors = [];

  let categories = await db.all(
    'SELECT * FROM v_categories WHERE tombstone = 0',
  );

  let num_applied = 0;
  for (let c = 0; c < categories.length; c++) {
    let category = categories[c];

    let budgeted = await getSheetValue(
      monthUtils.sheetForMonth(month),
      `budget-${category.id}`,
    );

    if (budgeted === 0 || force) {
      let template = category_templates[category.id];

      if (template) {
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
          await applyCategoryTemplate(category, template, month, force);
        if (to_budget != null) {
          num_applied++;
          await setBudget({ category: category.id, month, amount: to_budget });
        }
        if (applyErrors != null) {
          errors = errors.concat(
            applyErrors.map(error => `${category.name}: ${error}`),
          );
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
    let applied = `Successfully applied templates to ${num_applied} ${
      num_applied === 1 ? 'category' : 'categories'
    }.`;
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

const TEMPLATE_PREFIX = '#template ';

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

async function applyCategoryTemplate(category, template_lines, month, force) {
  let current_month = new Date(`${month}-01`);
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
        let target_month = new Date(`${template.month}-01`);
        let num_months = differenceInCalendarMonths(
          target_month,
          current_month,
        );
        let repeat = template.annual
          ? (template.repeat || 1) * 12
          : template.repeat;

        let spend_from;
        if (template.type === 'spend') {
          spend_from = new Date(`${template.from}-01`);
        }
        while (num_months < 0 && repeat) {
          target_month = addMonths(target_month, repeat);
          if (spend_from) {
            spend_from = addMonths(spend_from, repeat);
          }
          num_months = differenceInCalendarMonths(target_month, current_month);
        }
        if (num_months < 0) {
          errors.push(`${template.month} is in the past.`);
          return false;
        }
        template.month = format(target_month, 'yyyy-MM');
        if (spend_from) {
          template.from = format(spend_from, 'yyyy-MM');
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
        return differenceInCalendarMonths(
          new Date(`${a.month}-01`),
          new Date(`${b.month}-01`),
        );
      } else {
        return a.type.localeCompare(b.type);
      }
    });
  }

  let to_budget = 0;
  let limit;
  let sheetName = monthUtils.sheetForMonth(month);
  let budgeted = await getSheetValue(sheetName, `budget-${category.id}`);
  let spent = await getSheetValue(sheetName, `sum-amount-${category.id}`);
  let balance = await getSheetValue(sheetName, `leftover-${category.id}`);
  let last_month_balance = balance - spent - budgeted;
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
            limit = amountToInteger(template.limit);
          }
        }
        if (template.monthly != null) {
          let monthly = amountToInteger(template.monthly);
          to_budget += monthly;
        } else {
          to_budget += limit;
        }
        break;
      }
      case 'by': {
        // by has 'amount' and 'month' params
        let target_month = new Date(`${template.month}-01`);
        let target = amountToInteger(template.amount);
        let num_months = differenceInCalendarMonths(
          target_month,
          current_month,
        );
        let repeat =
          template.type === 'by'
            ? template.repeat
            : (template.repeat || 1) * 12;
        while (num_months < 0 && repeat) {
          target_month = addMonths(target_month, repeat);
          num_months = differenceInCalendarMonths(target_month, current_month);
        }
        let diff = target - last_month_balance;
        if (diff >= 0 && num_months > -1) {
          to_budget += Math.round(diff / (num_months + 1));
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
            limit = amountToInteger(template.limit);
          }
        }
        let w = new Date(template.starting);

        let next_month = addMonths(current_month, 1);

        while (w.getTime() < next_month.getTime()) {
          if (w.getTime() >= current_month.getTime()) {
            to_budget += amount;
          }
          w = addWeeks(w, weeks);
        }
        break;
      }
      case 'spend': {
        // spend has 'amount' and 'from' and 'month' params
        let from_month = new Date(`${template.from}-01`);
        let to_month = new Date(`${template.month}-01`);
        let already_budgeted = last_month_balance;
        let first_month = true;
        for (
          let m = from_month;
          differenceInCalendarMonths(current_month, m) > 0;
          m = addMonths(m, 1)
        ) {
          let sheetName = monthUtils.sheetForMonth(format(m, 'yyyy-MM'));

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
        let num_months = differenceInCalendarMonths(to_month, current_month);
        let target = amountToInteger(template.amount);
        if (num_months < 0) {
          errors.push(`${template.month} is in the past.`);
          return { errors };
        } else if (num_months === 0) {
          to_budget = target - already_budgeted;
        } else {
          to_budget = Math.round(
            (target - already_budgeted) / (num_months + 1),
          );
        }
        break;
      }
      case 'percentage': {
        /*
          let income_category = (await actual.getCategories()).filter(c => c.is_income == true && c.name == template.category);
          let func = (getBudgetMonthTestFunc || getBudgetMonth);
          let budget = await func(month);
          for (var g = 0; g < budget.categoryGroups.length; g++) {
            if (income_category.group_id == budget.categoryGroups[g].id) {
              for (var c = 0; c < budget.categoryGroups[g].categories.length; c++)
                if (income_category.id == budget.categoryGroups[g].categories[c].id) {
                  let month_category = budget.categoryGroups[g].categories[c];
                }
            }
          }
          */
        break;
      }
      case 'error':
        return { errors };
      default:
      case 'schedule': {
        let { id: schedule_id } = await db.first(
          'SELECT id FROM schedules WHERE name = ?',
          [template.name],
        );
        let rule = await getRuleForSchedule(schedule_id);
        let conditions = rule.serialize().conditions;
        let { date: dateCond, amount: amountCond } =
          extractScheduleConds(conditions);
        let isRepeating =
          Object(dateCond.value) === dateCond.value &&
          'frequency' in dateCond.value;
        let next_date_string = getNextDate(dateCond, current_month);
        let num_months = differenceInCalendarMonths(
          new Date(next_date_string),
          current_month,
        );
        let target = -getScheduledAmount(amountCond.value);
        let diff = target - balance + budgeted;
        if (num_months < 0) {
          errors.push(
            `Non-repeating schedule ${template.name} was due on ${next_date_string}, which is in the past.`,
          );
          return { errors };
        } else if (num_months > 0) {
          if (diff >= 0 && num_months > -1) {
            to_budget += Math.round(diff / num_months);
          }
        } else {
          let monthly_target = 0;
          let next_month = addMonths(current_month, 1);
          let next_date = new Date(next_date_string);
          if (isRepeating) {
            while (next_date.getTime() < next_month.getTime()) {
              if (next_date.getTime() >= current_month.getTime()) {
                monthly_target += target;
              }
              next_date = addDays(next_date, 1);
              next_date_string = getNextDate(dateCond, next_date);
              next_date = new Date(next_date_string);
            }
          } else {
            monthly_target = target;
          }
          to_budget += monthly_target - balance + budgeted;
        }
        break;
      }
    }
  }

  if (limit != null) {
    if (to_budget + last_month_balance > limit) {
      to_budget = limit - last_month_balance;
    }
  }

  if (
    ((category.budgeted != null && category.budgeted !== 0) ||
      to_budget === 0) &&
    !force
  ) {
    return { errors };
  } else if (category.budgeted === to_budget && force) {
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
