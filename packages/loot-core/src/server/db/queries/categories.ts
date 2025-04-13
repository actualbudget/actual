import { all } from "../db";
import { DbCategory, DbCategoryGroup } from "../types";
import { toSqlQueryParameters } from "../util";

export async function getCategories(
  ids?: Array<DbCategory['id']>,
): Promise<DbCategory[]> {
  const whereIn = ids ? `c.id IN (${toSqlQueryParameters(ids)}) AND` : '';
  const query = `SELECT c.* FROM categories c WHERE ${whereIn} c.tombstone = 0 ORDER BY c.sort_order, c.id`;
  return ids
    ? await all<DbCategory>(query, [...ids])
    : await all<DbCategory>(query);
}

export async function getCategoriesGrouped(
  ids?: Array<DbCategoryGroup['id']>,
): Promise<
  Array<
    DbCategoryGroup & {
      categories: DbCategory[];
    }
  >
> {
  const categoryGroupWhereIn = ids
    ? `cg.id IN (${toSqlQueryParameters(ids)}) AND`
    : '';
  const categoryGroupQuery = `SELECT cg.* FROM category_groups cg WHERE ${categoryGroupWhereIn} cg.tombstone = 0
    ORDER BY cg.is_income, cg.sort_order, cg.id`;

  const categoryWhereIn = ids
    ? `c.cat_group IN (${toSqlQueryParameters(ids)}) AND`
    : '';
  const categoryQuery = `SELECT c.* FROM categories c WHERE ${categoryWhereIn} c.tombstone = 0
    ORDER BY c.sort_order, c.id`;

  const groups = ids
    ? await all<DbCategoryGroup>(categoryGroupQuery, [...ids])
    : await all<DbCategoryGroup>(categoryGroupQuery);

  const categories = ids
    ? await all<DbCategory>(categoryQuery, [...ids])
    : await all<DbCategory>(categoryQuery);

  return groups.map(group => ({
    ...group,
    categories: categories.filter(c => c.cat_group === group.id),
  }));
}
