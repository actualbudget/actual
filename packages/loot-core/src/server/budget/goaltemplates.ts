// @ts-strict-ignore
import { Notification } from '../../client/state-types/notifications';
import * as monthUtils from '../../shared/months';
import * as db from '../db';
import { batchMessages } from '../sync';

import { isReflectBudget, getSheetValue, setGoal } from './actions';
import { categoryTemplate } from './categoryTemplate';
import { checkTemplates, storeTemplates } from './template-notes';

export async function applyTemplate({ month }) {
  await storeTemplates();
  const category_templates = await getTemplates(null);
  const ret = await processTemplate(month, false, category_templates, null);
  return ret;
}

export async function overwriteTemplate({ month }) {
  await storeTemplates();
  const category_templates = await getTemplates(null);
  const ret = await processTemplate(month, true, category_templates, null);
  return ret;
}

export async function applySingleCategoryTemplate({ month, category }) {
  const categories = await db.all(`SELECT * FROM v_categories WHERE id = ?`, [
    category,
  ]);
  await storeTemplates();
  const category_templates = await getTemplates(categories[0]);
  const ret = await processTemplate(
    month,
    true,
    category_templates,
    categories,
  );
  return ret;
}

export function runCheckTemplates() {
  return checkTemplates();
}

async function getCategories() {
  return await db.all(
    `
    SELECT categories.* FROM categories
    INNER JOIN category_groups on categories.cat_group = category_groups.id
    WHERE categories.tombstone = 0 AND categories.hidden = 0
    AND category_groups.hidden = 0
    `,
  );
}

async function getTemplates(category) {
  //retrieves template definitions from the database
  const goal_def = await db.all(
    'SELECT * FROM categories WHERE goal_def IS NOT NULL',
  );

  const templates = [];
  for (let ll = 0; ll < goal_def.length; ll++) {
    templates[goal_def[ll].id] = JSON.parse(goal_def[ll].goal_def);
  }
  if (category) {
    const ret = [];
    ret[category.id] = templates[category.id];
    return ret;
  } else {
    const categories = await getCategories();
    const ret = [];
    for (let cc = 0; cc < categories.length; cc++) {
      const id = categories[cc].id;
      if (templates[id]) {
        ret[id] = templates[id];
      }
    }
    return ret;
  }
}

async function processTemplate(
  month,
  force: boolean,
  categoryTemplates,
  categoriesIn?: any[],
) {
  // get all categoryIDs that need processed
  //done?
  // setup objects for each category and catch errors
  let categories = [];
  if (!categoriesIn) {
    const isReflect = isReflectBudget();
    const categories_long = await getCategories();
    categories_long.forEach(c => {
      if (!isReflect && !c.is_income) {
        categories.push(c);
      }
    });
  } else {
    categories = categoriesIn;
  }
  const catObjects: categoryTemplate[] = [];
  let availBudget = await getSheetValue(
    monthUtils.sheetForMonth(month),
    `to-budget`,
  );
  let priorities = [];
  let remainderWeight = 0;
  for (let i = 0; i < categories.length; i++) {
    const id = categories[i].id;
    const sheetName = monthUtils.sheetForMonth(month);
    const templates = categoryTemplates[id];
    //if there is a good way to add these to the class that would be nice,
    // but the async getSheetValue messes things up
    // only the fromLastMonth value is needed inside the class but it
    // would be nice to have everything wrapped up as much as possible
    const budgeted = await getSheetValue(sheetName, `budget-${id}`);
    const fromLastMonth = await getSheetValue(
      monthUtils.sheetForMonth(monthUtils.subMonths(month, 1)),
      `leftover-${id}`,
    );
    const existingGoal = await getSheetValue(sheetName, `goal-${id}`);

    // only run categories that are unbudgeted or if we are forcing it
    if ((budgeted === 0 || force) && templates) {
      // add to available budget
      // gather needed priorities
      // gather remainder weights
      try {
        const obj = new categoryTemplate(templates, id, month, fromLastMonth);
        availBudget += budgeted;
        const p = obj.readPriorities();
        p.forEach(pr => priorities.push(pr));
        remainderWeight += obj.getRemainderWeight();
        catObjects.push(obj);
      } catch (e) {
        console.log(`Got error in ${categories[i].name}: ${e}`);
      }

      // do a reset of the goals that are orphaned
    } else if (existingGoal != null && !templates) {
      await setGoal({ month, category: id, goal: null, long_goal: null });
    }
  }

  // read messages

  //compress to needed, sorted priorities
  priorities = priorities
    .sort((a, b) => {
      return a - b;
    })
    .filter((item, idx, curr) => curr.indexOf(item) === idx);

  // run each priority level
  for (let pi = 0; pi < priorities.length; pi++) {
    for (let i = 0; i < catObjects.length; i++) {
      const ret = await catObjects[i].runTemplatesForPriority(
        priorities[pi],
        availBudget,
      );
      availBudget -= ret;
      if (availBudget <= 0) {
        break;
      }
    }
    if (availBudget <= 0) {
      break;
    }
  }
  // run limits
  catObjects.forEach(o => {
    availBudget += o.applyLimit();
  });
  // run remainder
  if (availBudget > 0 && remainderWeight) {
    const perWeight = availBudget / remainderWeight;
    catObjects.forEach(o => {
      availBudget -= o.runRemainder(availBudget, perWeight);
    });
  }
  // finish
  catObjects.forEach(o => {
    o.runFinish();
  });
}
