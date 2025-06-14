// @ts-strict-ignore
import * as monthUtils from '../../shared/months';
import { q } from '../../shared/query';
import { CategoryEntity, CategoryGroupEntity } from '../../types/models';
import { aqlQuery } from '../aql';
import { batchMessages } from '../sync';

import { isReflectBudget, getSheetValue, setGoal, setBudget } from './actions';
import { CategoryTemplateContext } from './category-template-context';
import { checkTemplates, storeTemplates } from './template-notes';
import { Template } from './types/templates';

type Notification = {
  type?: 'message' | 'error' | 'warning' | undefined;
  pre?: string | undefined;
  title?: string | undefined;
  message: string;
  sticky?: boolean | undefined;
};

export async function applyTemplate({
  month,
  currencyCode,
}: {
  month: string;
  currencyCode: string;
}): Promise<Notification> {
  await storeTemplates();
  const categoryTemplates = await getTemplates();
  const ret = await processTemplate(
    month,
    false,
    categoryTemplates,
    [],
    currencyCode,
  );
  return ret;
}

export async function overwriteTemplate({
  month,
  currencyCode,
}: {
  month: string;
  currencyCode: string;
}): Promise<Notification> {
  await storeTemplates();
  const categoryTemplates = await getTemplates();
  const ret = await processTemplate(
    month,
    true,
    categoryTemplates,
    [],
    currencyCode,
  );
  return ret;
}

export async function applyMultipleCategoryTemplates({
  month,
  categoryIds,
  currencyCode,
}: {
  month: string;
  categoryIds: Array<CategoryEntity['id']>;
  currencyCode: string;
}) {
  const { data: categoryData }: { data: CategoryEntity[] } = await aqlQuery(
    q('categories')
      .filter({ id: { $oneof: categoryIds } })
      .select('*'),
  );
  await storeTemplates();
  const categoryTemplates = await getTemplates(c => categoryIds.includes(c.id));
  const ret = await processTemplate(
    month,
    true,
    categoryTemplates,
    categoryData,
    currencyCode,
  );
  return ret;
}

export async function applySingleCategoryTemplate({
  month,
  category,
  currencyCode,
}: {
  month: string;
  category: CategoryEntity['id'];
  currencyCode: string;
}) {
  const { data: categoryData }: { data: CategoryEntity[] } = await aqlQuery(
    q('categories').filter({ id: category }).select('*'),
  );
  await storeTemplates();
  const categoryTemplates = await getTemplates(c => c.id === category);
  const ret = await processTemplate(
    month,
    true,
    categoryTemplates,
    categoryData,
    currencyCode,
  );
  return ret;
}

export function runCheckTemplates() {
  return checkTemplates();
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
    categoryTemplates[categoryWithGoalDef.id] = JSON.parse(
      categoryWithGoalDef.goal_def,
    );
  }
  return categoryTemplates;
}

type TemplateBudget = {
  category: CategoryEntity['id'];
  budgeted: number;
};

async function setBudgets(month: string, templateBudget: TemplateBudget[]) {
  await batchMessages(async () => {
    templateBudget.forEach(element => {
      setBudget({
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
      setGoal({
        month,
        category: element.category,
        goal: element.goal,
        long_goal: element.longGoal,
      });
    });
  });
}

async function processTemplate(
  month: string,
  force: boolean,
  categoryTemplates: Record<CategoryEntity['id'], Template[]>,
  categories: CategoryEntity[] = [],
  currencyCode: string,
): Promise<Notification> {
  // setup categories
  if (!categories.length) {
    const isReflect = isReflectBudget();
    categories = (await getCategories()).filter(c => isReflect || !c.is_income);
  }

  // setup categories to process
  const templateContexts: CategoryTemplateContext[] = [];
  let availBudget = await getSheetValue(
    monthUtils.sheetForMonth(month),
    `to-budget`,
  );
  let priorities: number[] = [];
  let remainderWeight = 0;
  const errors: string[] = [];
  const budgetList: TemplateBudget[] = [];
  const goalList: TemplateGoal[] = [];
  for (const category of categories) {
    const { id } = category;
    const sheetName = monthUtils.sheetForMonth(month);
    const templates = categoryTemplates[id];
    const budgeted = await getSheetValue(sheetName, `budget-${id}`);
    const existingGoal = await getSheetValue(sheetName, `goal-${id}`);

    // only run categories that are unbudgeted or if we are forcing it
    if ((budgeted === 0 || force) && templates) {
      // add to available budget
      // gather needed priorities
      // gather remainder weights
      try {
        const templateContext = await CategoryTemplateContext.init(
          templates,
          category,
          month,
          budgeted,
          currencyCode,
        );
        // don't use the funds that are not from templates
        if (!templateContext.isGoalOnly()) {
          availBudget += budgeted;
        }
        availBudget += templateContext.getLimitExcess();
        priorities = [...priorities, ...templateContext.getPriorities()];
        remainderWeight += templateContext.getRemainderWeight();
        templateContexts.push(templateContext);
      } catch (e) {
        errors.push(`${category.name}: ${e.message}`);
      }

      // do a reset of the goals that are orphaned
    } else if (existingGoal !== null && !templates) {
      goalList.push({
        category: id,
        goal: null,
        longGoal: null,
      });
    }
  }

  //break early if nothing to do, or there are errors
  if (templateContexts.length === 0 && errors.length === 0) {
    if (goalList.length > 0) {
      setGoals(month, goalList);
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

  //compress to needed, sorted priorities
  priorities = priorities
    .sort((a, b) => {
      return a - b;
    })
    .filter((item, idx, curr) => curr.indexOf(item) === idx);

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
  // run remainder
  if (availBudget > 0 && remainderWeight) {
    const perWeight = availBudget / remainderWeight;
    templateContexts.forEach(context => {
      availBudget -= context.runRemainder(availBudget, perWeight);
    });
  }
  // finish
  templateContexts.forEach(context => {
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
    message: `Successfully applied templates to ${templateContexts.length} categories`,
  };
}
