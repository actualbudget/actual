// @ts-strict-ignore
import * as monthUtils from '../../shared/months';
import * as db from '../db';

import { setBudget, getSheetValue, setGoal } from './actions';
import { parse } from './cleanup-template.pegjs';

type Notification = {
  type?: 'message' | 'error' | 'warning' | undefined;
  pre?: string | undefined;
  title?: string | undefined;
  message: string;
  sticky?: boolean | undefined;
};

export function cleanupTemplate({ month }: { month: string }) {
  return processCleanup(month);
}

async function applyGroupCleanups(
  month: string,
  sourceGroups,
  sinkGroups,
  generalGroups,
) {
  const sheetName = monthUtils.sheetForMonth(month);
  const warnings = [];
  const db_month = parseInt(month.replace('-', ''));
  let groupLength = sourceGroups.length;
  while (groupLength > 0) {
    //function for each unique group
    const groupName = sourceGroups[0].group;
    const tempSourceGroups = sourceGroups.filter(c => c.group === groupName);
    const sinkGroup = sinkGroups.filter(c => c.group === groupName);
    const generalGroup = generalGroups.filter(c => c.group === groupName);
    let total_weight = 0;
    // We track how mouch amount was produced by all group sinks and only
    // distribute this instead of the "to-budget" amount.
    let available_amount = 0;

    if (sinkGroup.length > 0 || generalGroup.length > 0) {
      //only return group source funds to To Budget if there are corresponding sinking groups or underfunded included groups
      for (let ii = 0; ii < tempSourceGroups.length; ii++) {
        const balance = await getSheetValue(
          sheetName,
          `leftover-${tempSourceGroups[ii].category}`,
        );
        const budgeted = await getSheetValue(
          sheetName,
          `budget-${tempSourceGroups[ii].category}`,
        );
        await setBudget({
          category: tempSourceGroups[ii].category,
          month,
          amount: budgeted - balance,
        });
        available_amount += balance;
      }

      //calculate total weight for sinking funds
      for (let ii = 0; ii < sinkGroup.length; ii++) {
        total_weight += sinkGroup[ii].weight;
      }

      //fill underfunded categories within the group first
      for (let ii = 0; ii < generalGroup.length && available_amount > 0; ii++) {
        const balance = await getSheetValue(
          sheetName,
          `leftover-${generalGroup[ii].category}`,
        );
        const budgeted = await getSheetValue(
          sheetName,
          `budget-${generalGroup[ii].category}`,
        );
        const to_budget = budgeted + Math.abs(balance);
        const categoryId = generalGroup[ii].category;
        let carryover = await db.first<Pick<db.DbZeroBudget, 'carryover'>>(
          `SELECT carryover FROM zero_budgets WHERE month = ? and category = ?`,
          [db_month, categoryId],
        );

        if (carryover === null) {
          carryover = { carryover: 0 };
        }

        if (
          // We have enough to fully cover the overspent.
          balance < 0 &&
          Math.abs(balance) <= available_amount &&
          !generalGroup[ii].category.is_income &&
          carryover.carryover === 0
        ) {
          await setBudget({
            category: generalGroup[ii].category,
            month,
            amount: to_budget,
          });
          available_amount -= Math.abs(balance);
        } else if (
          // We can only cover this category partially.
          balance < 0 &&
          !generalGroup[ii].category.is_income &&
          carryover.carryover === 0 &&
          Math.abs(balance) > available_amount
        ) {
          await setBudget({
            category: generalGroup[ii].category,
            month,
            amount: budgeted + available_amount,
          });
          available_amount = 0;
        }
      }
      for (let ii = 0; ii < sinkGroup.length && available_amount > 0; ii++) {
        const budgeted = await getSheetValue(
          sheetName,
          `budget-${sinkGroup[ii].category}`,
        );
        const to_budget =
          budgeted +
          Math.round((sinkGroup[ii].weight / total_weight) * available_amount);
        await setBudget({
          category: sinkGroup[ii].category,
          month,
          amount: to_budget,
        });
      }
    } else {
      warnings.push(groupName + ' has no matching sink categories.');
    }
    sourceGroups = sourceGroups.filter(c => c.group !== groupName);
    groupLength = sourceGroups.length;
  }
  return warnings;
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
  const categories = await db.all<db.DbViewCategory>(
    'SELECT * FROM v_categories WHERE tombstone = 0',
  );
  const sheetName = monthUtils.sheetForMonth(month);
  const groupSource = [];
  const groupSink = [];
  const groupGeneral = [];

  //filter out category groups
  for (let c = 0; c < categories.length; c++) {
    const category = categories[c];
    const template = category_templates[category.id];

    //filter out source and sink groups for processing
    if (template) {
      if (
        template.filter(t => t.type === 'source' && t.group !== null).length > 0
      ) {
        groupSource.push({
          category: category.id,
          group: template.filter(
            t => t.type === 'source' && t.group !== null,
          )[0].group,
        });
      }
      if (
        template.filter(t => t.type === 'sink' && t.group !== null).length > 0
      ) {
        //only supports 1 sink reference per category.  Need more?
        groupSink.push({
          category: category.id,
          group: template.filter(t => t.type === 'sink' && t.group !== null)[0]
            .group,
          weight: template.filter(t => t.type === 'sink' && t.group !== null)[0]
            .weight,
        });
      }
      if (
        template.filter(t => t.type === null && t.group !== null).length > 0
      ) {
        groupGeneral.push({ category: category.id, group: template[0].group });
      }
    }
  }
  //run category groups
  const newWarnings = await applyGroupCleanups(
    month,
    groupSource,
    groupSink,
    groupGeneral,
  );
  warnings.splice(1, 0, ...newWarnings);

  for (let c = 0; c < categories.length; c++) {
    const category = categories[c];
    const template = category_templates[category.id];
    if (template) {
      if (
        template.filter(t => t.type === 'source' && t.group === null).length > 0
      ) {
        const balance = await getSheetValue(
          sheetName,
          `leftover-${category.id}`,
        );
        const budgeted = await getSheetValue(
          sheetName,
          `budget-${category.id}`,
        );
        if (balance >= 0) {
          // const spent = await getSheetValue(
          //   sheetName,
          //   `sum-amount-${category.id}`,
          // );
          await setBudget({
            category: category.id,
            month,
            amount: budgeted - balance,
          });
          await setGoal({
            category: category.id,
            month,
            goal: budgeted - balance,
            long_goal: 0,
          });
          num_sources += 1;
        } else {
          warnings.push(category.name + ' does not have available funds.');
        }
        const carryover = await db.first<Pick<db.DbZeroBudget, 'carryover'>>(
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
      if (
        template.filter(t => t.type === 'sink' && t.group === null).length > 0
      ) {
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
    let carryover = await db.first<Pick<db.DbZeroBudget, 'carryover'>>(
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
  if (budgetAvailable < 0) {
    warnings.push('Global: No funds are available to reallocate.');
  }

  //fill sinking categories
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
        message: 'There were errors interpreting some templates:',
        pre: errors.join('\n\n'),
      };
    } else if (warnings.length) {
      return {
        type: 'warning',
        message: 'Global: Funds not available:',
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
    } else if (warnings.length) {
      return {
        type: 'warning',
        message: 'Global: Funds not available:',
        pre: warnings.join('\n\n'),
      };
    } else if (budgetAvailable === 0) {
      return {
        type: 'message',
        message: 'All categories were up to date.',
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

  const notes = await db.all<db.DbNote>(
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
