import { WithRequired } from '../../../types/util';
import { categoryGroupModel, categoryModel } from '../../models';
import { batchMessages } from '../../sync';
import { first, insertWithUUID, update, all, delete_, insert } from '../db';
import { SORT_INCREMENT, shoveSortOrders } from '../sort';
import { DbCategoryGroup, DbCategory, DbCategoryMapping } from '../types';

export async function insertCategoryGroup(
  group: WithRequired<Partial<DbCategoryGroup>, 'name'>,
): Promise<DbCategoryGroup['id']> {
  // Don't allow duplicate group
  const existingGroup = await first<
    Pick<DbCategoryGroup, 'id' | 'name' | 'hidden'>
  >(
    `SELECT id, name, hidden FROM category_groups WHERE UPPER(name) = ? and tombstone = 0 LIMIT 1`,
    [group.name.toUpperCase()],
  );
  if (existingGroup) {
    throw new Error(
      `A ${existingGroup.hidden ? 'hidden ' : ''}’${existingGroup.name}’ category group already exists.`,
    );
  }

  const lastGroup = await first<Pick<DbCategoryGroup, 'sort_order'>>(`
    SELECT sort_order FROM category_groups WHERE tombstone = 0 ORDER BY sort_order DESC, id DESC LIMIT 1
  `);
  const sort_order = (lastGroup ? lastGroup.sort_order : 0) + SORT_INCREMENT;

  group = {
    ...categoryGroupModel.validate(group),
    sort_order,
  };
  const id: DbCategoryGroup['id'] = await insertWithUUID(
    'category_groups',
    group,
  );
  return id;
}

export function updateCategoryGroup(
  group: WithRequired<Partial<DbCategoryGroup>, 'name' | 'is_income'>,
) {
  group = categoryGroupModel.validate(group, { update: true });
  return update('category_groups', group);
}

export async function moveCategoryGroup(
  id: DbCategoryGroup['id'],
  targetId: DbCategoryGroup['id'],
) {
  const groups = await all<Pick<DbCategoryGroup, 'id' | 'sort_order'>>(
    `SELECT id, sort_order FROM category_groups WHERE tombstone = 0 ORDER BY sort_order, id`,
  );

  const { updates, sort_order } = shoveSortOrders(groups, targetId);
  for (const info of updates) {
    await update('category_groups', info);
  }
  await update('category_groups', { id, sort_order });
}

export async function deleteCategoryGroup(
  group: Pick<DbCategoryGroup, 'id'>,
  transferId?: DbCategory['id'],
) {
  const categories = await all<DbCategory>(
    'SELECT * FROM categories WHERE cat_group = ?',
    [group.id],
  );

  // Delete all the categories within a group
  await Promise.all(categories.map(cat => deleteCategory(cat, transferId)));
  await delete_('category_groups', group.id);
}

export async function insertCategory(
  category: WithRequired<Partial<DbCategory>, 'name' | 'cat_group'>,
  { atEnd }: { atEnd?: boolean | undefined } = { atEnd: undefined },
): Promise<DbCategory['id'] | undefined> {
  let sort_order;

  let id_: DbCategory['id'] | undefined;
  await batchMessages(async () => {
    // Dont allow duplicated names in groups
    const existingCatInGroup = await first<Pick<DbCategory, 'id'>>(
      `SELECT id FROM categories WHERE cat_group = ? and UPPER(name) = ? and tombstone = 0 LIMIT 1`,
      [category.cat_group, category.name.toUpperCase()],
    );
    if (existingCatInGroup) {
      throw new Error(
        `Category ‘${category.name}’ already exists in group ‘${category.cat_group}’`,
      );
    }

    if (atEnd) {
      const lastCat = await first<Pick<DbCategory, 'sort_order'>>(`
        SELECT sort_order FROM categories WHERE tombstone = 0 ORDER BY sort_order DESC, id DESC LIMIT 1
      `);
      sort_order = (lastCat ? lastCat.sort_order : 0) + SORT_INCREMENT;
    } else {
      // Unfortunately since we insert at the beginning, we need to shove
      // the sort orders to make sure there's room for it
      const categories = await all<Pick<DbCategory, 'id' | 'sort_order'>>(
        `SELECT id, sort_order FROM categories WHERE cat_group = ? AND tombstone = 0 ORDER BY sort_order, id`,
        [category.cat_group],
      );

      const { updates, sort_order: order } = shoveSortOrders(
        categories,
        categories.length > 0 ? categories[0].id : null,
      );
      for (const info of updates) {
        await update('categories', info);
      }
      sort_order = order;
    }

    category = {
      ...categoryModel.validate(category),
      sort_order,
    };

    const id = await insertWithUUID('categories', category);
    // Create an entry in the mapping table that points it to itself
    await insert('category_mapping', { id, transferId: id });
    id_ = id;
  });
  return id_;
}

export function updateCategory(
  category: WithRequired<
    Partial<DbCategory>,
    'name' | 'is_income' | 'cat_group'
  >,
) {
  category = categoryModel.validate(category, { update: true });
  // Change from cat_group to group because category AQL schema named it group.
  // const { cat_group: group, ...rest } = category;
  return update('categories', category);
}

export async function moveCategory(
  id: DbCategory['id'],
  groupId: DbCategoryGroup['id'],
  targetId: DbCategory['id'] | null,
) {
  if (!groupId) {
    throw new Error('moveCategory: groupId is required');
  }

  const categories = await all<Pick<DbCategory, 'id' | 'sort_order'>>(
    `SELECT id, sort_order FROM categories WHERE cat_group = ? AND tombstone = 0 ORDER BY sort_order, id`,
    [groupId],
  );

  const { updates, sort_order } = shoveSortOrders(categories, targetId);
  for (const info of updates) {
    await update('categories', info);
  }
  await update('categories', { id, sort_order, cat_group: groupId });
}

export async function deleteCategory(
  category: Pick<DbCategory, 'id'>,
  transferId?: DbCategory['id'],
) {
  if (transferId) {
    // We need to update all the deleted categories that currently
    // point to the one we're about to delete so they all are
    // "forwarded" to the new transferred category.
    const existingTransfers = await all<DbCategoryMapping>(
      'SELECT * FROM category_mapping WHERE transferId = ?',
      [category.id],
    );
    for (const mapping of existingTransfers) {
      await update('category_mapping', {
        id: mapping.id,
        transferId,
      });
    }

    // Finally, map the category we're about to delete to the new one
    await update('category_mapping', { id: category.id, transferId });
  }

  return delete_('categories', category.id);
}
