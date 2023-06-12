import * as monthUtils from '../../shared/months';
import * as db from '../db';

import { setBudget, getSheetValue } from './actions';
import { parse } from './cleanup-template.pegjs';

export function cleanupTemplate({ month }) {
  return processCleanup(month);
}

async function processCleanup(month) {
  let num_sources = 0;
  let num_sinks = 0;
  let total_weight = 0;
  let errors = [];
  let sinkCategory = [];

  let category_templates = await getCategoryTemplates();
  let categories = await db.all(
    'SELECT * FROM v_categories WHERE tombstone = 0',
  );
  let sheetName = monthUtils.sheetForMonth(month);
  for (let c = 0; c < categories.length; c++) {
    let category = categories[c];
    let template = category_templates[category.id];
    if (template) {
      if (template.filter(t => t.type === 'source').length > 0) {
        let balance = await getSheetValue(sheetName, `leftover-${category.id}`);
        let budgeted = await getSheetValue(sheetName, `budget-${category.id}`);
        await setBudget({
          category: category.id,
          month,
          amount: budgeted - balance,
        });
        num_sources += 1;
      }
      if (template.filter(t => t.type === 'sink').length > 0) {
        sinkCategory.push({ cat: category, temp: template });
        num_sinks += 1;
        total_weight += template.filter(w => w.type === 'sink')[0].weight;
      }
    }
  }

  //funds all underfunded categories first unless the overspending rollover is checked
  let db_month = parseInt(month.replace('-', ''));
  for (let c = 0; c < categories.length; c++) {
    let category = categories[c];
    let budgetAvailable = await getSheetValue(sheetName, `to-budget`);
    let balance = await getSheetValue(sheetName, `leftover-${category.id}`);
    let budgeted = await getSheetValue(sheetName, `budget-${category.id}`);
    let to_budget = budgeted + Math.abs(balance);
    let categoryId = category.id;
    let carryover = await db.first(
      `SELECT carryover FROM zero_budgets WHERE month = ? and category = ?`,
      [db_month, categoryId],
    );

    if (
      balance < 0 &&
      Math.abs(balance) <= budgetAvailable &&
      !category.is_income &&
      carryover.carryover === 0
    ) {
      await setBudget({
        category: category.id,
        month,
        amount: to_budget,
      });
    }
  }

  let budgetAvailable = await getSheetValue(sheetName, `to-budget`);

  if (budgetAvailable <= 0) {
    errors.push('No funds are available to reallocate.');
  }

  for (let c = 0; c < sinkCategory.length; c++) {
    let budgeted = await getSheetValue(
      sheetName,
      `budget-${sinkCategory[c].cat.id}`,
    );
    let categoryId = sinkCategory[c].cat.id;
    let weight = sinkCategory[c].temp.filter(w => w.type === 'sink')[0].weight;
    let to_budget =
      budgeted + Math.round((weight / total_weight) * budgetAvailable);
    if (c === sinkCategory.length - 1) {
      let currentBudgetAvailable = await getSheetValue(sheetName, `to-budget`);
      if (to_budget > currentBudgetAvailable) {
        to_budget = budgeted + currentBudgetAvailable;
      }
    }
    await setBudget({
      category: categoryId,
      month,
      amount: to_budget,
    });
  }

  if (num_sources === 0) {
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
    let applied = `Successfully returned funds from ${num_sources} ${
      num_sources === 1 ? 'source' : 'sources'
    } and funded ${num_sinks} sinking ${num_sinks === 1 ? 'fund' : 'funds'}.`;
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

const TEMPLATE_PREFIX = '#cleanup ';
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
