import { batchMessages } from '../sync';
import { categoryModel, categoryGroupModel } from '../models';
import { shoveSortOrders, SORT_INCREMENT } from './sort';
import { all, delete_, first, insert, insertWithUUID, update } from './db-actions';

export async function getCategories() {
  return all(`
      SELECT c.* FROM categories c
        LEFT JOIN category_groups cg ON c.cat_group = cg.id
        WHERE c.tombstone = 0
        ORDER BY cg.sort_order, cg.id, c.sort_order, c.id
    `);
}

export async function getCategoriesGrouped() {
  const groups = await all(
    'SELECT * FROM category_groups WHERE tombstone = 0 ORDER BY is_income, sort_order, id'
  );
  const rows = await all(`
      SELECT * FROM categories WHERE tombstone = 0
        ORDER BY sort_order, id
    `);

  return groups.map(group => {
    return {
      ...group,
      categories: rows.filter(row => row.cat_group === group.id)
    };
  });
}

export async function insertCategoryGroup(group) {
  const lastGroup = await first(`
      SELECT sort_order FROM category_groups WHERE tombstone = 0 ORDER BY sort_order DESC, id DESC LIMIT 1
    `);
  const sort_order = (lastGroup ? lastGroup.sort_order : 0) + SORT_INCREMENT;

  group = {
    ...categoryGroupModel.validate(group),
    sort_order: sort_order
  };
  return insertWithUUID('category_groups', group);
}

export function updateCategoryGroup(group) {
  group = categoryGroupModel.validate(group, { update: true });
  return update('category_groups', group);
}

export async function moveCategoryGroup(id, targetId) {
  const groups = await all(
    `SELECT id, sort_order FROM category_groups WHERE tombstone = 0 ORDER BY sort_order, id`
  );

  const { updates, sort_order } = shoveSortOrders(groups, targetId);
  for (const info of updates) {
    await update('category_groups', info);
  }
  await update('category_groups', { id, sort_order });
}

export async function deleteCategoryGroup(group, transferId) {
  const categories = await all('SELECT * FROM categories WHERE cat_group = ?', [
    group.id
  ]);

  // Delete all the categories within a group
  await Promise.all(categories.map(cat => deleteCategory(cat, transferId)));
  await delete_('category_groups', group.id);
}

export async function insertCategory(category, { atEnd } = {}) {
  let sort_order;

  let id_;
  await batchMessages(async () => {
    if (atEnd) {
      const lastCat = await first(`
          SELECT sort_order FROM categories WHERE tombstone = 0 ORDER BY sort_order DESC, id DESC LIMIT 1
        `);
      sort_order = (lastCat ? lastCat.sort_order : 0) + SORT_INCREMENT;
    } else {
      // Unfortunately since we insert at the beginning, we need to shove
      // the sort orders to make sure there's room for it
      const categories = await all(
        `SELECT id, sort_order FROM categories WHERE cat_group = ? AND tombstone = 0 ORDER BY sort_order, id`,
        [category.cat_group]
      );

      const { updates, sort_order: order } = shoveSortOrders(
        categories,
        categories.length > 0 ? categories[0].id : null
      );
      for (const info of updates) {
        await update('categories', info);
      }
      sort_order = order;
    }

    category = {
      ...categoryModel.validate(category),
      sort_order: sort_order
    };

    const id = await insertWithUUID('categories', category);
    // Create an entry in the mapping table that points it to itself
    await insert('category_mapping', { id, transferId: id });
    id_ = id;
  });
  return id_;
}

export function updateCategory(category) {
  category = categoryModel.validate(category, { update: true });
  return update('categories', category);
}

export async function moveCategory(id, groupId, targetId) {
  if (!groupId) {
    throw new Error('moveCategory: groupId is required');
  }

  const categories = await all(
    `SELECT id, sort_order FROM categories WHERE cat_group = ? AND tombstone = 0 ORDER BY sort_order, id`,
    [groupId]
  );

  const { updates, sort_order } = shoveSortOrders(categories, targetId);
  for (const info of updates) {
    await update('categories', info);
  }
  await update('categories', { id, sort_order, cat_group: groupId });
}

export async function deleteCategory(category, transferId) {
  if (transferId) {
    // We need to update all the deleted categories that currently
    // point to the one we're about to delete so they all are
    // "forwarded" to the new transferred category.
    const existingTransfers = await all(
      'SELECT * FROM category_mapping WHERE transferId = ?',
      [category.id]
    );
    for (const mapping of existingTransfers) {
      await update('category_mapping', { id: mapping.id, transferId });
    }

    // Finally, map the category we're about to delete to the new one
    await update('category_mapping', { id: category.id, transferId });
  }

  return delete_('categories', category.id);
}
