import { Notification } from '../../client/state-types/notifications';
import * as monthUtils from '../../shared/months';
import { extractScheduleConds } from '../../shared/schedules';
import { amountToInteger, integerToAmount } from '../../shared/util';
import * as db from '../db';
import { getRuleForSchedule, getNextDate } from '../schedules/app';
import { batchMessages } from '../sync';

import { setBudget, getSheetValue, isReflectBudget } from './actions';
import { parse } from './goal-template.pegjs';

export async function applyTemplate({ month }) {
  let category_templates = await getCategoryTemplates(null);
  return processTemplate({ month, force: false, category_templates });
}

export async function overwriteTemplate({ month }) {
  let category_templates = await getCategoryTemplates(null);
  return processTemplate({ month, force: true, category_templates });
}

export async function applySingleCategoryTemplate({ month, category }) {
  let categories = await db.all(`SELECT * FROM v_categories WHERE id = ?`, [
    category,
  ]);
  let category_templates = await getCategoryTemplates(categories[0]);
  await setBudget({
    category: category,
    month,
    amount: 0,
  });
  return processTemplate({ month, force: false, category_templates });
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

type processTemplateProps = {
  month: string;
  force: boolean;
  category_templates: any;
};
async function processTemplate({
  month,
  force,
  category_templates,
}: processTemplateProps): Promise<Notification> {
  let templateBudget = [];
  let num_applied = 0;
  let errors = [];
  let lowestPriority = 0;
  let originalCategoryBalance = [];
  let setToZero = [];

  let categories = await db.all(
    'SELECT * FROM v_categories WHERE tombstone = 0 AND hidden = 0',
  );

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
        lowestPriority =
          template[l].priority > lowestPriority
            ? template[l].priority
            : lowestPriority;
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
    templateBudget: setToZero.filter(
      f => f.isTemplate === true && f.isIncome === 0,
    ),
  });

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
  // so the remainders don't get skipped
  if (remainder_found) lowestPriority = remainder_priority;

  let sheetName = monthUtils.sheetForMonth(month);
  let available_start = await getSheetValue(sheetName, `to-budget`);
  let available_remaining = isReflectBudget()
    ? await getSheetValue(sheetName, `total-saved`)
    : await getSheetValue(sheetName, `to-budget`);
  for (let priority = 0; priority <= lowestPriority; priority++) {
    // setup scaling for remainder
    let remainder_scale = 1;
    if (priority === lowestPriority) {
      let available_now = await getSheetValue(sheetName, `to-budget`);
      remainder_scale = available_now / remainder_weight_total;
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
          template.filter(
            t =>
              (t.type === 'schedule' || t.type === 'by') &&
              t.priority === priority,
          ).length > 0
        ) {
          template = template.filter(
            t =>
              (t.priority === priority &&
                (t.type !== 'schedule' || t.type !== 'by')) ||
              t.type === 'schedule' ||
              t.type === 'by',
          );
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
            let prev_budgeted = await getSheetValue(
              sheetName,
              `budget-${category.id}`,
            );
            let { amount: to_budget, errors: applyErrors } =
              await applyCategoryTemplate({
                category,
                template_lines: template,
                month,
                priority,
                remainder_scale,
                available_start,
                budgetAvailable: available_remaining,
                budgeted: prev_budgeted,
                force,
              });
            if (to_budget != null) {
              num_applied++;
              templateBudget.push({
                category: category.id,
                amount: to_budget + prev_budgeted,
              });
              available_remaining -= to_budget;
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

type applyCategoryTemplateProps = {
  category: any;
  template_lines: any;
  month: string;
  priority: number;
  remainder_scale: number;
  available_start: number;
  budgetAvailable: number;
  budgeted: number;
  force: boolean;
};
async function applyCategoryTemplate({
  category,
  template_lines,
  month,
  priority,
  remainder_scale,
  available_start,
  budgetAvailable,
  budgeted,
  force,
}: applyCategoryTemplateProps) {
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
  let sheetName = monthUtils.sheetForMonth(month);
  let spent = await getSheetValue(sheetName, `sum-amount-${category.id}`);
  let balance = await getSheetValue(sheetName, `leftover-${category.id}`);
  let to_budget = 0;
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
        if (!isReflectBudget()) {
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
          let diff =
            num_months >= 0 ? Math.round(target / (num_months + 1)) : 0;
          if (diff >= 0) {
            if (to_budget + diff < budgetAvailable || !priority) {
              to_budget += diff;
            } else {
              if (budgetAvailable > 0) to_budget += budgetAvailable;
              errors.push(`Insufficient funds.`);
            }
          }
        } else {
          errors.push(`by templates are not supported in Report budgets`);
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
          if (template.previous) {
            let sheetName_lastmonth = monthUtils.sheetForMonth(
              monthUtils.addMonths(month, -1),
            );
            monthlyIncome = await getSheetValue(
              sheetName_lastmonth,
              'total-income',
            );
          } else {
            monthlyIncome = await getSheetValue(sheetName, `total-income`);
          }
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
          if (template.previous) {
            let sheetName_lastmonth = monthUtils.sheetForMonth(
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
        if (!scheduleFlag) {
          scheduleFlag = true;
          let template = template_lines.filter(t => t.type === 'schedule');
          //in the case of multiple templates per category, schedules may have wrong priority level
          let t = [];
          let totalScheduledGoal = 0;

          for (let ll = 0; ll < template.length; ll++) {
            let { id: sid, completed: complete } = await db.first(
              'SELECT * FROM schedules WHERE name = ?',
              [template[ll].name],
            );
            console.log(complete);
            let rule = await getRuleForSchedule(sid);
            let conditions = rule.serialize().conditions;
            let { date: dateConditions, amount: amountCondition } =
              extractScheduleConds(conditions);
            let target = -amountCondition.value;
            let next_date_string = getNextDate(
              dateConditions,
              monthUtils._parse(current_month),
            );
            let target_interval = dateConditions.value.interval
              ? dateConditions.value.interval
              : 1;
            let target_frequency = dateConditions.value.frequency;
            let isRepeating =
              Object(dateConditions.value) === dateConditions.value &&
              'frequency' in dateConditions.value;
            let num_months = monthUtils.differenceInCalendarMonths(
              next_date_string,
              current_month,
            );
            t.push({
              template: template[ll],
              target: target,
              next_date_string: next_date_string,
              target_interval: target_interval,
              target_frequency: target_frequency,
              num_months: num_months,
              completed: complete,
            });
            if (!complete) {
              if (isRepeating) {
                let monthlyTarget = 0;
                let next_month = monthUtils.addMonths(
                  current_month,
                  t[ll].num_months + 1,
                );
                let next_date = getNextDate(
                  dateConditions,
                  monthUtils._parse(current_month),
                );
                while (next_date < next_month) {
                  monthlyTarget += amountCondition.value;
                  next_date = monthUtils.addDays(next_date, 1);
                  next_date = getNextDate(
                    dateConditions,
                    monthUtils._parse(next_date),
                  );
                }
                t[ll].target = -monthlyTarget;
                totalScheduledGoal += target;
              }
            } else {
              errors.push(
                `Schedule ${t[ll].template.name} is a completed schedule.`,
              );
            }
          }

          t = t.filter(t => t.completed === 0);
          t = t.sort((a, b) => b.target - a.target);

          let diff = 0;
          if (balance >= totalScheduledGoal) {
            for (let ll = 0; ll < t.length; ll++) {
              if (t[ll].num_months < 0) {
                errors.push(
                  `Non-repeating schedule ${t[ll].template.name} was due on ${t[ll].next_date_string}, which is in the past.`,
                );
                break;
              }
              if (
                (t[ll].template.full && t[ll].num_months === 0) ||
                t[ll].target_frequency === 'weekly' ||
                t[ll].target_frequency === 'daily'
              ) {
                diff += t[ll].target;
              } else if (t[ll].template.full && t[ll].num_months > 0) {
                diff += 0;
              } else {
                diff += t[ll].target / t[ll].target_interval;
              }
            }
          } else if (balance < totalScheduledGoal) {
            for (let ll = 0; ll < t.length; ll++) {
              if (isReflectBudget()) {
                if (!t[ll].template.full) {
                  errors.push(
                    `Report budgets require the full option for Schedules.`,
                  );
                  break;
                }
                if (t[ll].template.full && t[ll].num_months === 0) {
                  to_budget += t[ll].target;
                }
              }
              if (!isReflectBudget()) {
                if (t[ll].num_months < 0) {
                  errors.push(
                    `Non-repeating schedule ${t[ll].template.name} was due on ${t[ll].next_date_string}, which is in the past.`,
                  );
                  break;
                }
                if (t[ll].template.full && t[ll].num_months > 0) {
                  remainder = 0;
                } else if (ll === 0 && !t[ll].template.full) {
                  remainder = t[ll].target - last_month_balance;
                } else {
                  remainder = t[ll].target - remainder;
                }
                let tg = 0;
                if (remainder >= 0) {
                  tg = remainder;
                  remainder = 0;
                } else {
                  tg = 0;
                  remainder = Math.abs(remainder);
                }
                if (
                  t[ll].template.full ||
                  t[ll].num_months === 0 ||
                  t[ll].target_frequency === 'weekly' ||
                  t[ll].target_frequency === 'daily'
                ) {
                  diff += tg;
                } else if (t[ll].template.full && t[ll].num_months > 0) {
                  diff += 0;
                } else {
                  diff += tg / (t[ll].num_months + 1);
                }
              }
            }
          }
          diff = Math.round(diff);
          if ((diff > 0 && to_budget + diff <= budgetAvailable) || !priority) {
            to_budget += diff;
          } else if (
            to_budget + diff > budgetAvailable &&
            budgetAvailable >= 0
          ) {
            to_budget = budgetAvailable;
            errors.push(`Insufficient funds.`);
          }
        }
        break;
      }
      case 'remainder': {
        if (remainder_scale >= 0) {
          to_budget +=
            remainder_scale === 0
              ? Math.round(template.weight)
              : Math.round(remainder_scale * template.weight);
          // can over budget with the rounding, so checking that
          if (to_budget >= budgetAvailable) {
            to_budget = budgetAvailable;
            // check if there is 1 cent leftover from rounding
          } else if (budgetAvailable - to_budget === 1) {
            to_budget = to_budget + 1;
          }
        }
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
    } else if (to_budget + balance > limit) {
      to_budget = limit - balance;
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
