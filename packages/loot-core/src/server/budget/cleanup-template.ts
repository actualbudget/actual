// @ts-strict-ignore
import { Notification } from '../../client/state-types/notifications';
import * as monthUtils from '../../shared/months';
import * as db from '../db';

import { setBudget, getSheetValue, setGoal } from './actions';
import { parse } from './cleanup-template.pegjs';

export function cleanupTemplate({ month }: { month: string }) {
  return processCleanup(month);
}

async function processCleanup(month: string): Promise<Notification> {
  let num_sources = 0;
  let num_sinks = 0;
  let total_weight = 0;
  const errors = [];
  const warnings = [];
  const sinkCategory = [];
  const sourceWithRollover = [];
  const db_month = parseInt(month.replace('-', ''));

  const category_templates = await getCategoryTemplates();
  const categories = await db.all(
    'SELECT * FROM v_categories WHERE tombstone = 0',
  );
  const sheetName = monthUtils.sheetForMonth(month);
  for (let c = 0; c < categories.length; c++) {
    const category = categories[c];
    const template = category_templates[category.id];
    if (template) {
      if (template.filter(t => t.type === 'source').length > 0) {
        const balance = await getSheetValue(
          sheetName,
          `leftover-${category.id}`,
        );
        const budgeted = await getSheetValue(
          sheetName,
          `budget-${category.id}`,
        );
        if (balance >= 0) {
          const spent = await getSheetValue(
            sheetName,
            `sum-amount-${category.id}`,
          );
          await setBudget({
            category: category.id,
            month,
            amount: budgeted - balance,
          });
          await setGoal({
            category: category.id,
            month,
            goal: -spent,
          });
          num_sources += 1;
        } else {
          warnings.push(category.name + ' does not have available funds.');
        }
        const carryover = await db.first(
          `SELECT carryover FROM zero_budgets WHERE month = ? and category = ?`,
          [db_month, category.id],
        );
        if (carryover !== null) {
          //keep track of source categories with rollover enabled
          if (carryover.carryover === 1) {
            sourceWithRollover.push({ cat: category, temp: template });
          }
        }
      }
      if (template.filter(t => t.type === 'sink').length > 0) {
        sinkCategory.push({ cat: category, temp: template });
        num_sinks += 1;
        total_weight += template.filter(w => w.type === 'sink')[0].weight;
      }
    }
  }

  //funds all underfunded categories first unless the overspending rollover is checked
  for (let c = 0; c < categories.length; c++) {
    const category = categories[c];
    const budgetAvailable = await getSheetValue(sheetName, `to-budget`);
    const balance = await getSheetValue(sheetName, `leftover-${category.id}`);
    const budgeted = await getSheetValue(sheetName, `budget-${category.id}`);
    const to_budget = budgeted + Math.abs(balance);
    const categoryId = category.id;
    let carryover = await db.first(
      `SELECT carryover FROM zero_budgets WHERE month = ? and category = ?`,
      [db_month, categoryId],
    );

    if (carryover === null) {
      carryover = { carryover: 0 };
    }

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
    } else if (
      balance < 0 &&
      !category.is_income &&
      carryover.carryover === 0 &&
      Math.abs(balance) > budgetAvailable
    ) {
      await setBudget({
        category: category.id,
        month,
        amount: budgeted + budgetAvailable,
      });
    }
  }

  const budgetAvailable = await getSheetValue(sheetName, `to-budget`);
  if (budgetAvailable <= 0) {
    warnings.push('No funds are available to reallocate.');
  }

  for (let c = 0; c < sinkCategory.length; c++) {
    const budgeted = await getSheetValue(
      sheetName,
      `budget-${sinkCategory[c].cat.id}`,
    );
    const categoryId = sinkCategory[c].cat.id;
    const weight = sinkCategory[c].temp.filter(w => w.type === 'sink')[0]
      .weight;
    let to_budget =
      budgeted + Math.round((weight / total_weight) * budgetAvailable);
    if (c === sinkCategory.length - 1) {
      const currentBudgetAvailable = await getSheetValue(
        sheetName,
        `to-budget`,
      );
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
    } else if (warnings.length) {
      return {
        type: 'warning',
        message: 'Funds not available:',
        pre: warnings.join('\n\n'),
      };
    } else {
      return {
        type: 'message',
        message: 'All categories were up to date.',
      };
    }
  } else {
    const applied = `Successfully returned funds from ${num_sources} ${
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
  const templates = {};

  const notes = await db.all(
    `SELECT * FROM notes WHERE lower(note) like '%${TEMPLATE_PREFIX}%'`,
  );

  for (let n = 0; n < notes.length; n++) {
    const lines = notes[n].note.split('\n');
    const template_lines = [];
    for (let l = 0; l < lines.length; l++) {
      const line = lines[l].trim();
      if (!line.toLowerCase().startsWith(TEMPLATE_PREFIX)) continue;
      const expression = line.slice(TEMPLATE_PREFIX.length);
      try {
        const parsed = parse(expression);
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
