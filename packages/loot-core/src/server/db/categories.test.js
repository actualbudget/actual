import { getCategories, insertCategory, insertCategoryGroup } from "./categories";

beforeEach(global.emptyDatabase());

describe('Database', () => {
  test('inserting a category works', async () => {
    await insertCategoryGroup({ id: 'group1', name: 'group1' });
    await insertCategory({
      name: 'foo',
      cat_group: 'group1'
    });
    expect((await getCategories()).length).toBe(1);
  });
});
