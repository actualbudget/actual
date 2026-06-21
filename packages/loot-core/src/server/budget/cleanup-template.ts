import * as db from '#server/db';
// @ts-strict-ignore
import * as monthUtils from '#shared/months';
import type { CleanupTemplate } from '#types/models/cleanup-templates';

import { getSheetValue, setBudget, setGoal } from './actions';
import { storeNoteCleanups } from './cleanup-template-notes';

type Notification = {
  type?: 'message' | 'error' | 'warning' | undefined;
  pre?: string | undefined;
  title?: string | undefined;
  message: string;
  sticky?: boolean | undefined;
};

export async function cleanupTemplate({ month }: { month: string }) {
  await storeNoteCleanups();
  return processCleanup(month);
}

type GroupSourceRow = { category: string; groupId: string };
type GroupSinkRow = { category: string; groupId: string; weight: number };
type GroupOverspendRow = { category: string; groupId: string };

async function applyGroupCleanups(
  month: string,
  sourceGroups: GroupSourceRow[],
  sinkGroups: GroupSinkRow[],
  overspendGroups: GroupOverspendRow[],
  groupNamesById: Map<string, string>,
) {
  const sheetName = monthUtils.sheetForMonth(month);
  const warnings = [];
  const db_month = parseInt(month.replace('-', ''));
  let groupLength = sourceGroups.length;
  while (groupLength > 0) {
    //function for each unique group
    const groupId = sourceGroups[0].groupId;
    const tempSourceGroups = sourceGroups.filter(c => c.groupId === groupId);
    const sinkGroup = sinkGroups.filter(c => c.groupId === groupId);
    const overspendGroup = overspendGroups.filter(c => c.groupId === groupId);
    let total_weight = 0;
    // We track how mouch amount was produced by all group sinks and only
    // distribute this instead of the "to-budget" amount.
    let available_amount = 0;

    if (sinkGroup.length > 0 || overspendGroup.length > 0) {
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
      for (
        let ii = 0;
        ii < overspendGroup.length && available_amount > 0;
        ii++
      ) {
        const balance = await getSheetValue(
          sheetName,
          `leftover-${overspendGroup[ii].category}`,
        );
        const budgeted = await getSheetValue(
          sheetName,
          `budget-${overspendGroup[ii].category}`,
        );
        const to_budget = budgeted + Math.abs(balance);
        const categoryId = overspendGroup[ii].category;
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
          carryover.carryover === 0
        ) {
          await setBudget({
            category: categoryId,
            month,
            amount: to_budget,
          });
          available_amount -= Math.abs(balance);
        } else if (
          // We can only cover this category partially.
          balance < 0 &&
          carryover.carryover === 0 &&
          Math.abs(balance) > available_amount
        ) {
          await setBudget({
            category: categoryId,
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
      const groupName = groupNamesById.get(groupId) ?? groupId;
      warnings.push(
        `Cleanup group "${groupName}" has no matching sink categories.`,
      );
    }
    sourceGroups = sourceGroups.filter(c => c.groupId !== groupId);
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
  type SinkCategoryRow = {
    cat: db.DbViewCategory;
    weight: number;
  };
  const sinkCategory: SinkCategoryRow[] = [];
  const db_month = parseInt(month.replace('-', ''));

  const categories = await db.all<db.DbViewCategory>(
    'SELECT * FROM v_categories WHERE tombstone = 0',
  );
  const sheetName = monthUtils.sheetForMonth(month);
  const groupSource: GroupSourceRow[] = [];
  const groupSink: GroupSinkRow[] = [];
  const groupOverspend: GroupOverspendRow[] = [];

  for (const category of categories) {
    const def = parseCleanupDef(category.cleanup_def);
    if (!def) continue;

    for (const row of def) {
      if (row.role === 'source' && row.groupId !== null) {
        groupSource.push({ category: category.id, groupId: row.groupId });
      } else if (row.role === 'sink' && row.groupId !== null) {
        groupSink.push({
          category: category.id,
          groupId: row.groupId,
          weight: row.weight,
        });
      } else if (row.role === 'overspend') {
        groupOverspend.push({ category: category.id, groupId: row.groupId });
      }
    }
  }

  const groupRows = await db.all<{ id: string; name: string }>(
    'SELECT id, name FROM cleanup_groups WHERE tombstone = 0',
  );
  const groupNamesById = new Map(groupRows.map(g => [g.id, g.name]));

  //run category groups
  const newWarnings = await applyGroupCleanups(
    month,
    groupSource,
    groupSink,
    groupOverspend,
    groupNamesById,
  );
  warnings.splice(1, 0, ...newWarnings);

  for (const category of categories) {
    const def = parseCleanupDef(category.cleanup_def);
    if (!def) continue;

    const globalSource = def.find(
      r => r.role === 'source' && r.groupId === null,
    );
    if (globalSource) {
      const balance = await getSheetValue(sheetName, `leftover-${category.id}`);
      const budgeted = await getSheetValue(sheetName, `budget-${category.id}`);
      if (balance >= 0) {
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
    }

    const globalSink = def.find(r => r.role === 'sink' && r.groupId === null);
    if (globalSink && globalSink.role === 'sink') {
      sinkCategory.push({ cat: category, weight: globalSink.weight });
      num_sinks += 1;
      total_weight += globalSink.weight;
    }
  }

  //funds all underfunded categories first unless the overspending rollover is checked
  for (const category of categories) {
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
    const { cat, weight } = sinkCategory[c];
    const budgeted = await getSheetValue(sheetName, `budget-${cat.id}`);
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
      category: cat.id,
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

function parseCleanupDef(
  raw: string | null | undefined,
): CleanupTemplate[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CleanupTemplate[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}
