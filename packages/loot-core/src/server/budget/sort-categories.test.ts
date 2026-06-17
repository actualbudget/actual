import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import * as db from '#server/db';

import { sortCategories } from './sort-categories';

describe('sortCategories', () => {
  beforeEach(global.emptyDatabase());
  afterEach(global.emptyDatabase());

  async function setupGroup(groupId: string, categoryNames: string[]) {
    await db.insertCategoryGroup({ id: groupId, name: groupId });
    for (const name of categoryNames) {
      await db.insertCategory({ name, cat_group: groupId });
    }
  }

  async function getCategoryNamesInGroup(groupId: string): Promise<string[]> {
    const groups = await db.getCategoriesGrouped([groupId]);
    return groups[0]?.categories.map(c => c.name) ?? [];
  }

  it('sorts categories ascending (A to Z)', async () => {
    await setupGroup('group1', ['Restaurants', 'Groceries', 'Doctor']);
    await sortCategories({ groupId: 'group1', direction: 'asc' });
    expect(await getCategoryNamesInGroup('group1')).toEqual([
      'Doctor',
      'Groceries',
      'Restaurants',
    ]);
  });

  it('sorts categories descending (Z to A)', async () => {
    await setupGroup('group1', ['Restaurants', 'Groceries', 'Doctor']);
    await sortCategories({ groupId: 'group1', direction: 'desc' });
    expect(await getCategoryNamesInGroup('group1')).toEqual([
      'Restaurants',
      'Groceries',
      'Doctor',
    ]);
  });

  it('does nothing when the group does not exist', async () => {
    await expect(
      sortCategories({ groupId: 'nonexistent', direction: 'asc' }),
    ).resolves.toBeUndefined();
  });

  it('does nothing when the group has no categories', async () => {
    await db.insertCategoryGroup({ id: 'emptyGroup', name: 'emptyGroup' });
    await sortCategories({ groupId: 'emptyGroup', direction: 'asc' });
    expect(await getCategoryNamesInGroup('emptyGroup')).toEqual([]);
  });

  it('only sorts categories within the specified group', async () => {
    await setupGroup('group1', ['Restaurants', 'Groceries']);
    await setupGroup('group2', ['Rent', 'Dentist']);

    const group2Before = await getCategoryNamesInGroup('group2');

    await sortCategories({ groupId: 'group1', direction: 'asc' });

    expect(await getCategoryNamesInGroup('group1')).toEqual([
      'Groceries',
      'Restaurants',
    ]);
    expect(await getCategoryNamesInGroup('group2')).toEqual(group2Before);
  });
});
