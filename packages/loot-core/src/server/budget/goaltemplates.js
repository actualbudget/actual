import {
  differenceInCalendarMonths,
  addMonths,
  addWeeks,
  format
} from 'date-fns';

import * as monthUtils from '../../shared/months';
import { amountToInteger, integerToAmount } from '../../shared/util';
import * as db from '../db';

import { setBudget, getSheetValue } from './actions';

export async function applyTemplate({ month }) {
  await processTemplate(month, false);
}

export async function overwriteTemplate({ month }) {
  await processTemplate(month, true);
}

async function processTemplate(month, force) {
  let category_templates = await getCategoryTemplates();

  let categories = await db.all(
    'SELECT * FROM v_categories WHERE tombstone = 0'
  );

  let num_applied = 0;
  for (let c = 0; c < categories.length; c++) {
    let category = categories[c];

    let budgeted = await getSheetValue(
      monthUtils.sheetForMonth(month),
      `budget-${category.id}`
    );

    if (budgeted === 0 || force) {
      let template = category_templates[category.id];

      if (template) {
        let to_budget = await applyCategoryTemplate(
          category,
          template,
          month,
          force
        );
        if (to_budget != null) {
          num_applied++;
          await setBudget({ category: category.id, month, amount: to_budget });
        }
      }
    }
  }
  if (num_applied === 0) {
    console.log('All categories were up to date.');
  } else {
    console.log(`${num_applied} categories updated.`);
  }
}

async function getCategoryTemplates() {
  const matches = [
    {
      type: 'simple',
        re: /^#template \$?(\-?\d+(\.\d{2})?)$/im,//eslint-disable-line
      params: ['monthly']
    },
    {
      type: 'simple',
      re: /^#template up to \$?(\d+(\.\d{2})?)$/im,
      params: ['limit']
    },
    {
      type: 'simple',
      re: /^#template \$?(\d+(\.\d{2})?) up to \$?(\d+(\.\d{2})?)$/im,
      params: ['monthly', null, 'limit']
    },
    {
      type: 'by',
        re: /^#template \$?(\d+(\.\d{2})?) by (\d{4}\-\d{2})$/im,//eslint-disable-line
      params: ['amount', null, 'month']
    },
    {
      type: 'by',
        re: /^#template \$?(\d+(\.\d{2})?) by (\d{4}\-\d{2}) repeat every (\d+) months$/im,//eslint-disable-line
      params: ['amount', null, 'month', 'repeat']
    },
    {
      type: 'week',
        re: /^#template \$?(\d+(\.\d{2})?) repeat every week starting (\d{4}\-\d{2}\-\d{2})$/im,//eslint-disable-line
      params: ['amount', null, 'starting']
    },
    {
      type: 'week',
        re: /^#template \$?(\d+(\.\d{2})?) repeat every week starting (\d{4}\-\d{2}\-\d{2}) up to \$?(\d+(\.\d{2})?)$/im,//eslint-disable-line
      params: ['amount', null, 'starting', 'limit']
    },
    {
      type: 'weeks',
        re: /^#template \$?(\d+(\.\d{2})?) repeat every (\d+) weeks starting (\d{4}\-\d{2}\-\d{2})$/im,//eslint-disable-line
      params: ['amount', null, 'weeks', 'starting']
    },
    {
      type: 'weeks',
        re: /^#template \$?(\d+(\.\d{2})?) repeat every (\d+) weeks starting (\d{4}\-\d{2}\-\d{2}) up to \$?(\d+(\.\d{2})?)$/im,//eslint-disable-line
      params: ['amount', null, 'weeks', 'starting', 'limit']
    },
    {
      type: 'by_annual',
        re: /^#template \$?(\d+(\.\d{2})?) by (\d{4}\-\d{2}) repeat every year$/im,//eslint-disable-line
      params: ['amount', null, 'month']
    },
    {
      type: 'by_annual',
        re: /^#template \$?(\d+(\.\d{2})?) by (\d{4}\-\d{2}) repeat every (\d+) years$/im,//eslint-disable-line
      params: ['amount', null, 'month', 'repeat']
    },
    {
      type: 'spend',
        re: /^#template \$?(\d+(\.\d{2})?) by (\d{4}\-\d{2}) spend from (\d{4}\-\d{2})$/im,//eslint-disable-line
      params: ['amount', null, 'month', 'from']
    },
    {
      type: 'spend',
        re: /^#template \$?(\d+(\.\d{2})?) by (\d{4}\-\d{2}) spend from (\d{4}\-\d{2}) repeat every (\d+) months$/im,//eslint-disable-line
      params: ['amount', null, 'month', 'from', 'repeat']
    },
    {
      type: 'spend_annual',
        re: /^#template \$?(\d+(\.\d{2})?) by (\d{4}\-\d{2}) spend from (\d{4}\-\d{2}) repeat every year$/im,//eslint-disable-line
      params: ['amount', null, 'month', 'from']
    },
    {
      type: 'spend_annual',
        re: /^#template \$?(\d+(\.\d{2})?) by (\d{4}\-\d{2}) spend from (\d{4}\-\d{2}) repeat every (\d+) years$/im,//eslint-disable-line
      params: ['amount', null, 'month', 'from', 'repeat']
    },
    {
      type: 'percentage',
      re: /^#template (\d+(\.\d+)?)% of (.*)$/im,
      params: ['percent', null, 'category']
    },
    { type: 'error', re: /^#template .*$/im, params: [] }
  ];

  let templates = {};

  let notes = await db.all(`SELECT * FROM notes WHERE note like '%#template%'`);

  for (let n = 0; n < notes.length; n++) {
    let lines = notes[n].note.split('\n');
    let template_lines = [];
    for (let l = 0; l < lines.length; l++) {
      for (let m = 0; m < matches.length; m++) {
        let arr = matches[m].re.exec(lines[l]);
        if (arr) {
          let matched = {};
          matched.line = arr[0];
          matched.type = matches[m].type;
          for (let p = 0; p < matches[m].params.length; p++) {
            let param_name = matches[m].params[p];
            if (param_name) {
              matched[param_name] = arr[p + 1];
            }
          }
          template_lines.push(matched);
          break;
        }
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

  // remove lines for past dates, calculate repeating dates
  let got_by = false;
  template_lines = template_lines.filter(template => {
    //debugger;

    switch (template.type) {
      case 'by':
      case 'by_annual':
      case 'spend':
      case 'spend_annual':
        let target_month = new Date(`${template.month}-01`);
        let num_months = differenceInCalendarMonths(
          target_month,
          current_month
        );
        let repeat = template.type.includes('annual')
          ? (template.repeat || 1) * 12
          : template.repeat;

        let spend_from;
        if (template.type.includes('spend')) {
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
          console.log(
            `${category.name}: ${`${template.month} is in the past:`} ${
              template.line
            }`
          );
          return null;
        }
        template.month = format(target_month, 'yyyy-MM');
        if (spend_from) {
          template.from = format(spend_from, 'yyyy-MM');
        }
        break;
      default:
    }
    return template;
  });

  if (template_lines.length > 1) {
    template_lines = template_lines
      .sort((a, b) => {
        if (
          a.type.slice(0, 2) === b.type.slice(0, 2) &&
          a.type.slice(0, 2) === 'by'
        ) {
          return differenceInCalendarMonths(
            new Date(`${a.month}-01`),
            new Date(`${b.month}-01`)
          );
        } else {
          return a.type.localeCompare(b.type);
        }
      })
      .filter(el => {
        if (el.type.slice(0, 2) === 'by') {
          if (!got_by) {
            got_by = true;
            return el;
          } else {
            return null;
          }
        } else {
          return el;
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
            console.log(
              `${category.name}: ${`More than one 'up to' limit found.`} ${
                template.line
              }`
            );
            return null;
          } else {
            limit = amountToInteger(template.limit);
          }
        }
        if (template.monthly) {
          let monthly = amountToInteger(template.monthly);
          to_budget += monthly;
        } else {
          to_budget += limit;
        }
        break;
      }
      case 'by':
      case 'by_annual': {
        // by has 'amount' and 'month' params
        let target_month = new Date(`${template.month}-01`);
        let target = amountToInteger(template.amount);
        let num_months = differenceInCalendarMonths(
          target_month,
          current_month
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
      case 'week':
      case 'weeks': {
        // weeks has 'amount', 'starting' and optional 'limit' params
        // weeks has 'amount', 'starting', 'weeks' and optional 'limit' params
        let amount = amountToInteger(template.amount);
        let weeks = template.weeks != null ? Math.round(template.weeks) : 1;
        if (template.limit != null) {
          if (limit != null) {
            console.log(
              `${category.name}: ${`More than one 'up to' limit found.`} ${
                template.line
              }`
            );
            return null;
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
      case 'spend':
      case 'spend_annual': {
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
              `sum-amount-${category.id}`
            );
            let balance = await getSheetValue(
              sheetName,
              `leftover-${category.id}`
            );
            already_budgeted = balance - spent;
            first_month = false;
          } else {
            let budgeted = await getSheetValue(
              sheetName,
              `budget-${category.id}`
            );
            already_budgeted += budgeted;
          }
        }
        let num_months = differenceInCalendarMonths(to_month, current_month);
        let target = amountToInteger(template.amount);
        if (num_months < 0) {
          console.log(
            `${category.name}: ${`${template.to} is in the past:`} ${
              template.line
            }`
          );
          return null;
        } else if (num_months === 0) {
          to_budget = target - already_budgeted;
        } else {
          to_budget = Math.round(
            (target - already_budgeted) / (num_months + 1)
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
        console.log(`${category.name}: ${`Failed to match:`} ${template.line}`);
        return null;
      default:
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
    return null;
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
    return to_budget;
  }
}
