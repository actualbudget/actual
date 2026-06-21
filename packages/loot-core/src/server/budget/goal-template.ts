import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { batchMessages } from '#server/sync';
// @ts-strict-ignore
import * as monthUtils from '#shared/months';
import { q } from '#shared/query';
import type { CategoryEntity, CategoryGroupEntity } from '#types/models';
import type {
  AutomationOverview,
  AutomationOverviewAmounts,
  AutomationOverviewCategoryRow,
  AutomationOverviewGroup,
} from '#types/models/automation-overview';
import type { CleanupTemplate } from '#types/models/cleanup-templates';
import type { Template } from '#types/models/templates';

import {
  getSheetBoolean,
  getSheetValue,
  isTrackingBudget,
  setBudget,
  setGoal,
} from './actions';
import { CategoryTemplateContext } from './category-template-context';
import { tombstoneOrphanCleanupGroups } from './cleanup-groups';
import { checkTemplateNotes, storeNoteTemplates } from './template-notes';

export function distributeRemainder(
  templateContexts: CategoryTemplateContext[],
  availBudget: number,
): number {
  let remainderContexts = templateContexts.filter(c => c.hasRemainder());
  while (availBudget > 0 && remainderContexts.length > 0) {
    let remainderWeight = 0;
    remainderContexts.forEach(
      context => (remainderWeight += context.getRemainderWeight()),
    );
    const perWeight = availBudget / remainderWeight;
    const beforePass = availBudget;
    remainderContexts.forEach(context => {
      availBudget -= context.runRemainder(availBudget, perWeight);
    });
    if (availBudget === beforePass) break;
    remainderContexts = templateContexts.filter(c => c.hasRemainder());
  }
  return availBudget;
}

type Notification = {
  type?: 'message' | 'error' | 'warning' | undefined;
  pre?: string | undefined;
  title?: string | undefined;
  message: string;
  sticky?: boolean | undefined;
};

export async function storeTemplates({
  categoriesWithTemplates,
  source,
}: {
  categoriesWithTemplates: {
    id: string;
    templates: Template[];
    cleanup?: CleanupTemplate[];
  }[];
  source: 'notes' | 'ui';
}): Promise<void> {
  let touchedCleanup = false;
  await batchMessages(async () => {
    for (const { id, templates, cleanup } of categoriesWithTemplates) {
      const goalDefs = templates.length > 0 ? JSON.stringify(templates) : null;
      const update: Record<string, unknown> = {
        id,
        goal_def: goalDefs,
        template_settings: { source },
      };
      if (cleanup !== undefined) {
        update.cleanup_def =
          cleanup.length > 0 ? JSON.stringify(cleanup) : null;
        touchedCleanup = true;
      }
      await db.updateWithSchema('categories', update);
    }
  });
  if (touchedCleanup) {
    await tombstoneOrphanCleanupGroups();
  }
}

export async function applyTemplate({
  month,
}: {
  month: string;
}): Promise<Notification> {
  await storeNoteTemplates();
  const categoryTemplates = await getTemplates();
  const ret = await processTemplate(month, false, categoryTemplates, []);
  return ret;
}

export async function overwriteTemplate({
  month,
}: {
  month: string;
}): Promise<Notification> {
  await storeNoteTemplates();
  const categoryTemplates = await getTemplates();
  const ret = await processTemplate(month, true, categoryTemplates, []);
  return ret;
}

export async function applyMultipleCategoryTemplates({
  month,
  categoryIds,
}: {
  month: string;
  categoryIds: Array<CategoryEntity['id']>;
}) {
  const { data: categoryData }: { data: CategoryEntity[] } = await aqlQuery(
    q('categories')
      .filter({ id: { $oneof: categoryIds } })
      .select('*'),
  );
  await storeNoteTemplates();
  const categoryTemplates = await getTemplates(c => categoryIds.includes(c.id));
  const ret = await processTemplate(
    month,
    true,
    categoryTemplates,
    categoryData,
  );
  return ret;
}

export async function applySingleCategoryTemplate({
  month,
  category,
}: {
  month: string;
  category: CategoryEntity['id'];
}) {
  const { data: categoryData }: { data: CategoryEntity[] } = await aqlQuery(
    q('categories').filter({ id: category }).select('*'),
  );
  await storeNoteTemplates();
  const categoryTemplates = await getTemplates(c => c.id === category);
  const ret = await processTemplate(
    month,
    true,
    categoryTemplates,
    categoryData,
  );
  return ret;
}

export function runCheckTemplates() {
  return checkTemplateNotes();
}

async function getCategories(): Promise<CategoryEntity[]> {
  const { data: categoryGroups }: { data: CategoryGroupEntity[] } =
    await aqlQuery(q('category_groups').filter({ hidden: false }).select('*'));

  return categoryGroups.flatMap(g => g.categories || []).filter(c => !c.hidden);
}

async function getTemplates(
  filter: (category: CategoryEntity) => boolean = () => true,
): Promise<Record<CategoryEntity['id'], Template[]>> {
  //retrieves template definitions from the database
  const { data: categoriesWithGoalDef }: { data: CategoryEntity[] } =
    await aqlQuery(
      q('categories')
        .filter({ goal_def: { $ne: null } })
        .select('*'),
    );

  const categoryTemplates: Record<CategoryEntity['id'], Template[]> = {};
  for (const categoryWithGoalDef of categoriesWithGoalDef.filter(filter)) {
    if (!categoryWithGoalDef.goal_def) continue;
    categoryTemplates[categoryWithGoalDef.id] = JSON.parse(
      categoryWithGoalDef.goal_def,
    );
  }
  return categoryTemplates;
}

export async function getTemplatesForCategory(
  categoryId: CategoryEntity['id'],
): Promise<Record<CategoryEntity['id'], Template[]>> {
  return getTemplates(c => c.id === categoryId);
}

type TemplateBudget = {
  category: CategoryEntity['id'];
  budgeted: number;
};

async function setBudgets(month: string, templateBudget: TemplateBudget[]) {
  await batchMessages(async () => {
    templateBudget.forEach(element => {
      void setBudget({
        category: element.category,
        month,
        amount: element.budgeted,
      });
    });
  });
}

type TemplateGoal = {
  category: CategoryEntity['id'];
  goal: number | null;
  longGoal: number | null;
};

async function setGoals(month: string, templateGoal: TemplateGoal[]) {
  await batchMessages(async () => {
    templateGoal.forEach(element => {
      void setGoal({
        month,
        category: element.category,
        goal: element.goal,
        long_goal: element.longGoal,
      });
    });
  });
}

type ComputedTemplates = {
  contexts: CategoryTemplateContext[];
  errors: string[];
  orphanGoals: TemplateGoal[];
};

async function computeTemplates(
  month: string,
  force: boolean,
  categoryTemplates: Record<CategoryEntity['id'], Template[]>,
  categories: CategoryEntity[] = [],
  skipAvailableClamp: boolean = false,
): Promise<ComputedTemplates> {
  // setup categories
  const isTracking = isTrackingBudget();
  if (!categories.length) {
    categories = (await getCategories()).filter(
      c => isTracking || !c.is_income,
    );
  }

  // setup categories to process
  const templateContexts: CategoryTemplateContext[] = [];
  let availBudget = await getSheetValue(
    monthUtils.sheetForMonth(month),
    `to-budget`,
  );
  const prioritiesSet = new Set<number>();
  const errors: string[] = [];
  const orphanGoals: TemplateGoal[] = [];
  for (const category of categories) {
    const { id } = category;
    const sheetName = monthUtils.sheetForMonth(month);
    const templates = categoryTemplates[id];
    const budgeted = await getSheetValue(sheetName, `budget-${id}`);
    const existingGoal = await getSheetValue(sheetName, `goal-${id}`);

    // only run categories that are unbudgeted or if we are forcing it
    if ((budgeted === 0 || force) && templates) {
      try {
        const templateContext = await CategoryTemplateContext.init(
          templates,
          category,
          month,
          budgeted,
          skipAvailableClamp,
        );
        // don't use the funds that are not from templates
        if (!templateContext.isGoalOnly()) {
          availBudget += budgeted;
        }
        availBudget += templateContext.getLimitExcess();
        templateContext.getPriorities().forEach(p => prioritiesSet.add(p));
        templateContexts.push(templateContext);
      } catch (e) {
        errors.push(`${category.name}: ${e.message}`);
      }

      // do a reset of the goals that are orphaned
    } else if (existingGoal !== null && !templates) {
      orphanGoals.push({
        category: id,
        goal: null,
        longGoal: null,
      });
    }
  }

  if (errors.length > 0) {
    return { contexts: templateContexts, errors, orphanGoals };
  }

  const priorities = new Int32Array([...prioritiesSet]).sort((a, b) => a - b);
  // run each priority level
  for (const priority of priorities) {
    const availStart = availBudget;
    for (const templateContext of templateContexts) {
      const budget = await templateContext.runTemplatesForPriority(
        priority,
        availBudget,
        availStart,
      );
      availBudget -= budget;
    }
  }

  distributeRemainder(templateContexts, availBudget);

  return { contexts: templateContexts, errors, orphanGoals };
}

async function processTemplate(
  month: string,
  force: boolean,
  categoryTemplates: Record<CategoryEntity['id'], Template[]>,
  categories: CategoryEntity[] = [],
): Promise<Notification> {
  const { contexts, errors, orphanGoals } = await computeTemplates(
    month,
    force,
    categoryTemplates,
    categories,
  );

  if (contexts.length === 0 && errors.length === 0) {
    if (orphanGoals.length > 0) {
      await setGoals(month, orphanGoals);
    }
    return {
      type: 'message',
      message: 'Everything is up to date',
    };
  }
  if (errors.length > 0) {
    return {
      sticky: true,
      message: 'There were errors interpreting some templates:',
      pre: errors.join(`\n\n`),
    };
  }

  const budgetList: TemplateBudget[] = [];
  const goalList: TemplateGoal[] = [...orphanGoals];
  contexts.forEach(context => {
    const values = context.getValues();
    budgetList.push({
      category: context.category.id,
      budgeted: values.budgeted,
    });
    goalList.push({
      category: context.category.id,
      goal: values.goal,
      longGoal: values.longGoal ? 1 : null,
    });
  });
  await setBudgets(month, budgetList);
  await setGoals(month, goalList);

  return {
    type: 'message',
    message: `Successfully applied templates to ${contexts.length} categories`,
  };
}

export type {
  AutomationOverview,
  AutomationOverviewAmounts,
  AutomationOverviewCategoryRow,
  AutomationOverviewGroup,
};

function categoryHasAutomations(templates: Template[]): boolean {
  return templates.some(template => template.directive === 'template');
}

function categoryHasRemainder(templates: Template[]): boolean {
  return templates.some(
    template =>
      template.directive === 'template' && template.type === 'remainder',
  );
}

function computeProjectedNeeded(
  context: CategoryTemplateContext,
  templates: Template[],
): number {
  const values = context.getValues();
  let remainderContribution = 0;
  for (const template of templates) {
    if (template.type === 'remainder') {
      remainderContribution +=
        values.perTemplateContribution.get(template) ?? 0;
    }
  }
  return Math.max(0, values.budgeted - remainderContribution);
}

function normalizeBudgeted(budgeted: number, templates: Template[]): number {
  if (categoryHasRemainder(templates)) {
    return Math.max(0, budgeted);
  }
  return budgeted;
}

async function getCarriedOver(
  category: CategoryEntity,
  month: string,
): Promise<number> {
  const lastMonth = monthUtils.subMonths(month, 1);
  const lastMonthSheet = monthUtils.sheetForMonth(lastMonth);
  const fromLastMonth = await getSheetValue(
    lastMonthSheet,
    `leftover-${category.id}`,
  );
  const carryover = await getSheetBoolean(
    lastMonthSheet,
    `carryover-${category.id}`,
  );

  if (
    (fromLastMonth < 0 && !carryover) ||
    category.is_income ||
    (isTrackingBudget() && !carryover)
  ) {
    return 0;
  }

  return fromLastMonth;
}

type MonthCategoryAmounts = {
  carriedOver: number;
  needed: number;
  budgeted: number;
  remaining: number;
  overfunded: number;
};

function sumMonthlyAmounts(
  rows: MonthCategoryAmounts[],
): AutomationOverviewAmounts {
  const totals = rows.reduce(
    (acc, row) => ({
      carriedOver: acc.carriedOver + row.carriedOver,
      needed: acc.needed + row.needed,
      budgeted: acc.budgeted + row.budgeted,
      remaining: acc.remaining + row.remaining,
      overfunded: acc.overfunded + row.overfunded,
    }),
    { carriedOver: 0, needed: 0, budgeted: 0, remaining: 0, overfunded: 0 },
  );

  if (rows.length <= 1) {
    return totals;
  }

  const count = rows.length;
  return {
    ...totals,
    averageCarriedOver: Math.round(totals.carriedOver / count),
    averageNeeded: Math.round(totals.needed / count),
    averageBudgeted: Math.round(totals.budgeted / count),
    averageRemaining: Math.round(totals.remaining / count),
    averageOverfunded: Math.round(totals.overfunded / count),
  };
}

function sumPeriodAmounts(
  rows: AutomationOverviewAmounts[],
  monthCount: number,
): AutomationOverviewAmounts {
  const totals = rows.reduce(
    (acc, row) => ({
      carriedOver: acc.carriedOver + row.carriedOver,
      needed: acc.needed + row.needed,
      budgeted: acc.budgeted + row.budgeted,
      remaining: acc.remaining + row.remaining,
      overfunded: acc.overfunded + row.overfunded,
    }),
    { carriedOver: 0, needed: 0, budgeted: 0, remaining: 0, overfunded: 0 },
  );

  if (monthCount <= 1) {
    return totals;
  }

  return {
    ...totals,
    averageCarriedOver: Math.round(totals.carriedOver / monthCount),
    averageNeeded: Math.round(totals.needed / monthCount),
    averageBudgeted: Math.round(totals.budgeted / monthCount),
    averageRemaining: Math.round(totals.remaining / monthCount),
    averageOverfunded: Math.round(totals.overfunded / monthCount),
  };
}

async function getAutomationOverviewForMonth(
  month: string,
  categoryTemplates: Record<CategoryEntity['id'], Template[]>,
  automationCategoryIds: CategoryEntity['id'][],
  categoryData: CategoryEntity[],
): Promise<Map<CategoryEntity['id'], MonthCategoryAmounts>> {
  const filteredTemplates: Record<CategoryEntity['id'], Template[]> = {};
  for (const id of automationCategoryIds) {
    filteredTemplates[id] = categoryTemplates[id];
  }

  const { contexts } = await computeTemplates(
    month,
    true,
    filteredTemplates,
    categoryData,
    true,
  );

  const contextByCategoryId = new Map(
    contexts.map(context => [context.category.id, context]),
  );
  const sheetName = monthUtils.sheetForMonth(month);
  const result = new Map<CategoryEntity['id'], MonthCategoryAmounts>();

  for (const category of categoryData) {
    const templates = categoryTemplates[category.id];
    if (!templates || !categoryHasAutomations(templates)) {
      continue;
    }

    const context = contextByCategoryId.get(category.id);
    const needed = context ? computeProjectedNeeded(context, templates) : 0;
    const budgeted = normalizeBudgeted(
      await getSheetValue(sheetName, `budget-${category.id}`),
      templates,
    );
    const carriedOver = await getCarriedOver(category, month);
    const remaining = Math.max(0, needed - budgeted);
    const overfunded = Math.max(0, budgeted - needed);

    result.set(category.id, {
      carriedOver,
      needed,
      budgeted,
      remaining,
      overfunded,
    });
  }

  return result;
}

export async function getAutomationOverview({
  startMonth,
  endMonth,
}: {
  startMonth: string;
  endMonth: string;
}): Promise<AutomationOverview> {
  await storeNoteTemplates();
  const categoryTemplates = await getTemplates();
  const automationCategoryIds = Object.keys(categoryTemplates).filter(id =>
    categoryHasAutomations(categoryTemplates[id]),
  );

  const monthCount =
    monthUtils.differenceInCalendarMonths(endMonth, startMonth) + 1;

  if (automationCategoryIds.length === 0) {
    return {
      startMonth,
      endMonth,
      monthCount,
      totals: {
        carriedOver: 0,
        needed: 0,
        budgeted: 0,
        remaining: 0,
        overfunded: 0,
      },
      groups: [],
    };
  }

  const { data: categoryData }: { data: CategoryEntity[] } = await aqlQuery(
    q('categories')
      .filter({ id: { $oneof: automationCategoryIds } })
      .select('*'),
  );

  const months = monthUtils.rangeInclusive(startMonth, endMonth);
  const monthlyByCategory = new Map<
    CategoryEntity['id'],
    MonthCategoryAmounts[]
  >();

  for (const month of months) {
    const monthAmounts = await getAutomationOverviewForMonth(
      month,
      categoryTemplates,
      automationCategoryIds,
      categoryData,
    );
    for (const [categoryId, amounts] of monthAmounts) {
      const existing = monthlyByCategory.get(categoryId) ?? [];
      existing.push(amounts);
      monthlyByCategory.set(categoryId, existing);
    }
  }

  const categoryById = new Map(
    categoryData.map(category => [category.id, category]),
  );
  const categoryRows = new Map<
    CategoryEntity['id'],
    AutomationOverviewCategoryRow
  >();

  for (const categoryId of automationCategoryIds) {
    const category = categoryById.get(categoryId);
    const monthlyAmounts = monthlyByCategory.get(categoryId);
    if (!category || !monthlyAmounts || monthlyAmounts.length === 0) {
      continue;
    }

    const amounts = sumMonthlyAmounts(monthlyAmounts);
    categoryRows.set(categoryId, {
      categoryId,
      categoryName: category.name,
      ...amounts,
    });
  }

  const groupedCategories = await db.getCategoriesGrouped();
  const groups: AutomationOverviewGroup[] = [];

  for (const group of groupedCategories) {
    const categories: AutomationOverviewCategoryRow[] = [];
    for (const category of group.categories ?? []) {
      const row = categoryRows.get(category.id);
      if (row) {
        categories.push(row);
      }
    }

    if (categories.length === 0) {
      continue;
    }

    groups.push({
      groupId: group.id,
      groupName: group.name,
      categories,
      subtotal: sumPeriodAmounts(categories, monthCount),
    });
  }

  const allRows = groups.flatMap(group => group.categories);
  const totals = sumPeriodAmounts(allRows, monthCount);

  return {
    startMonth,
    endMonth,
    monthCount,
    totals,
    groups,
  };
}

export type DryRunCategoryResult = {
  budgeted: number;
  perTemplate: number[];
};

export async function dryRunCategoryTemplate({
  month,
  categoryId,
  templates,
}: {
  month: string;
  categoryId: CategoryEntity['id'];
  templates: Template[];
}): Promise<DryRunCategoryResult> {
  // The projection answers "how much do these templates demand" — it
  // skips the priority clamp so future months (where To Budget is empty)
  // still show the templates' intended amount instead of 0.
  const { data: categoryData }: { data: CategoryEntity[] } = await aqlQuery(
    q('categories').filter({ id: categoryId }).select('*'),
  );
  if (categoryData.length === 0) {
    return { budgeted: 0, perTemplate: templates.map(() => 0) };
  }
  const { contexts } = await computeTemplates(
    month,
    true,
    { [categoryId]: templates },
    categoryData,
    true,
  );
  const ctx = contexts.find(c => c.category.id === categoryId);
  if (!ctx) return { budgeted: 0, perTemplate: templates.map(() => 0) };
  const values = ctx.getValues();
  return {
    budgeted: values.budgeted,
    perTemplate: templates.map(t => values.perTemplateContribution.get(t) ?? 0),
  };
}
