// @ts-strict-ignore
import { Notification } from '../../client/state-types/notifications';
import * as db from '../db';
import { batchMessages } from '../sync';

import { isReflectBudget } from './actions';
import { categoryTemplate } from './categoryTemplate';
import { checkTemplates, storeTemplates } from './template-notes';

export async function applyTemplate({ month }) {
  //await storeTemplates();
  //const category_templates = await getTemplates(null, 'template');
  //const category_goals = await getTemplates(null, 'goal');
  //const ret = await processTemplate(month, false, category_templates);
  //await processGoals(category_goals, month);
  //return ret;
  return overwriteTemplate({ month });
}

export async function overwriteTemplate({ month }) {
  await storeTemplates();
  const category_templates = await getTemplates(null);
  const ret = await processTemplate(month, true, category_templates);
  //await processGoals(category_goals, month);
  return ret;
}

export async function applySingleCategoryTemplate({ month, category }) {
  //const categories = await db.all(`SELECT * FROM v_categories WHERE id = ?`, [
  //  category,
  //]);
  //await storeTemplates();
  //const category_templates = await getTemplates(categories[0], 'template');
  //const category_goals = await getTemplates(categories[0], 'goal');
  //const ret = await processTemplate(
  //  month,
  //  true,
  //  category_templates,
  //  categories[0],
  //);
  //await processGoals(category_goals, month, categories[0]);
  //return ret;
  return overwriteTemplate({ month });
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
    const singleCategoryTemplate = [];
    if (templates[category.id] !== undefined) {
      return singleCategoryTemplate;
    }
    singleCategoryTemplate[category.id] = undefined;
    return singleCategoryTemplate;
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

async function processTemplate(month, force, category_templates, category?) {
  // get all categoryIDs that need processed
  //done?
  // setup objects for each category and catch errors
  let categories = [];
  if (!category) {
    const isReflect = isReflectBudget();
    const categories_long = await getCategories();
    categories_long.forEach(c => {
      if (!isReflect && !c.is_income) {
        categories.push(c.id);
      }
    });
  } else {
    categories = category.id;
  }
  const catObjects = [];
  let availBudget = 10000;
  let priorities = [];
  let remainderWeight = 0;
  categories.forEach(c => {
    let obj;
    //try {
    obj = new categoryTemplate(category_templates[c], c, month);
    //} catch (error) {
    //  console.error(error);
    //}
    catObjects.push(obj);
  });

  // read messages

  // get available starting balance figured out by reading originalBudget and toBudget
  // gather needed priorities
  // gather remainder weights
  catObjects.forEach(o => {
    availBudget += o.getOriginalBudget();
    const p = o.readPriorities();
    p.forEach(pr => priorities.push(pr));
    remainderWeight += o.getRemainderWeight();
  });

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
        force,
      );
      availBudget -= ret;
    }
  }
  // run limits
  catObjects.forEach(o => {
    o.applyLimit();
  });
  // run remainder
  catObjects.forEach(o => {
    o.runRemainder();
  });
  // finish
  catObjects.forEach(o => {
    o.runFinish();
  });
}
