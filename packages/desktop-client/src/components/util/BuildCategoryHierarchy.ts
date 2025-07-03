import memoizeOne from 'memoize-one';
import { CategoryEntity, CategoryGroupEntity } from 'loot-core/types/models';
import { WithRequired } from 'loot-core/types/util';
import { separateGroups } from '../budget/util'; // We need this utility

/**
 * Groups a flat list of categories by their group ID.
 * @param categories - A flat array of CategoryEntity objects.
 * @returns A map (plain object) where keys are group IDs and values are arrays of categories.
 */
function groupCategoriesByGroupId(
  categories: CategoryEntity[],
): Record<string, CategoryEntity[]> {
  return categories.reduce((acc, category) => {
    const groupId = category.group;
    if (groupId) {
      if (!acc[groupId]) {
        acc[groupId] = [];
      }
      acc[groupId].push(category);
    }
    return acc;
  }, {} as Record<string, CategoryEntity[]>);
}

/**
 * Filters and sorts category groups based on a parent ID.
 * This now correctly handles both null and undefined parent_id for top-level groups.
 * @param groups - A flat array of all CategoryGroupEntity objects.
 * @param parentId - The ID of the parent group, or null for top-level groups.
 * @returns An array of filtered and sorted category groups.
 */
function filterAndSortGroups(
  groups: CategoryGroupEntity[],
  parentId: string | null,
): CategoryGroupEntity[] {
  return groups
    // Using == null checks for both null and undefined, which is what we need for top-level groups.
    .filter(group => group.parent_id == parentId)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

/**
 * Attaches categories to a specific category group.
 * @param group - The CategoryGroupEntity to attach categories to.
 * @param categoriesByGroupId - A map of categories grouped by their group ID.
 * @returns The category group with its categories attached.
 */
function attachCategoriesToGroup(
  group: CategoryGroupEntity,
  categoriesByGroupId: Record<string, CategoryEntity[]>,
): CategoryGroupEntity {
  return {
    ...group,
    categories: (categoriesByGroupId[group.id] || []).sort(
      (a, b) => (a.sort_order || 0) - (b.sort_order || 0),
    ),
  };
}

/**
 * Processes a single category group node, attaching its categories and recursively
 * building its children.
 * @param group - The current CategoryGroupEntity to process.
 * @param allGroups - A flat array of all CategoryGroupEntity objects.
 * @param categoriesByGroupId - A map of categories grouped by their group ID.
 * @returns The processed CategoryGroupEntity with its categories and hierarchical children.
 */
function processSingleGroupNode(
  group: CategoryGroupEntity,
  allGroups: CategoryGroupEntity[],
  categoriesByGroupId: Record<string, CategoryEntity[]>,
): CategoryGroupEntity {
  const groupWithCategories = attachCategoriesToGroup(group, categoriesByGroupId);
  return {
    ...groupWithCategories,
    children: buildGroupTree(allGroups, categoriesByGroupId, group.id) as WithRequired<CategoryGroupEntity, 'parent_id'>[],
  };
}

/**
 * Recursively builds the hierarchical structure of category groups.
 * @param allGroups - A flat array of all CategoryGroupEntity objects.
 * @param categoriesByGroupId - A map of categories grouped by their group ID.
 * @param parentId - The ID of the current parent group, or null for top-level.
 * @returns A hierarchical array of CategoryGroupEntity objects.
 */
function buildGroupTree(
  allGroups: CategoryGroupEntity[],
  categoriesByGroupId: Record<string, CategoryEntity[]>,
  parentId: string | null = null,
): CategoryGroupEntity[] {
  const filteredAndSortedGroups = filterAndSortGroups(allGroups, parentId);
  return filteredAndSortedGroups.map(group =>
    processSingleGroupNode(group, allGroups, categoriesByGroupId),
  );
}

/**
 * Builds a hierarchical structure of category groups and categories from flat lists.
 * This function is memoized for performance.
 * @param categoryGroups - A flat array of CategoryGroupEntity objects.
 * @param categories - A flat array of CategoryEntity objects.
 * @returns A hierarchical array of CategoryGroupEntity objects.
 */
export const buildCategoryHierarchy = memoizeOne(
  (
    categoryGroups: CategoryGroupEntity[],
    categories: CategoryEntity[],
  ): CategoryGroupEntity[] => {
    if (!categoryGroups || !categories) {
      return [];
    }

    const categoriesByGroupId = groupCategoriesByGroupId(categories);
    const [expenseGroups, incomeGroup] = separateGroups(categoryGroups);

    const hierarchicalExpenseGroups = buildGroupTree(
      expenseGroups,
      categoriesByGroupId,
      null,
    );

    if (incomeGroup) {
      const hierarchicalIncomeGroup = buildGroupTree(
        [incomeGroup],
        categoriesByGroupId,
        null,
      );
      return [...hierarchicalExpenseGroups, ...hierarchicalIncomeGroup];
    }

    return hierarchicalExpenseGroups;
  },
);
