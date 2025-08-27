import { describe, expect, test } from 'vitest';

import type {
  CategoryEntity,
  CategoryGroupEntity,
} from 'loot-core/types/models';

import { buildCategoryHierarchy } from './BuildCategoryHierarchy';

// Test result helper functions
function findGroupByName(groups: CategoryGroupEntity[], name: string): CategoryGroupEntity | undefined {
  return groups.find(g => g.name === name);
}

function flattenAllGroups(groups: CategoryGroupEntity[]): CategoryGroupEntity[] {
  return groups.reduce((acc: CategoryGroupEntity[], group: CategoryGroupEntity) => {
    return [...acc, group, ...flattenAllGroups(group.children || [])];
  }, []);
}

function expectValidHierarchy(result: CategoryGroupEntity[]): void {
  expect(result).toBeDefined();
  expect(Array.isArray(result)).toBe(true);
}

function expectGroupToHaveCategories(group: CategoryGroupEntity | undefined, expectedNames: string[]): void {
  expect(group).toBeDefined();
  expect(group?.categories?.map(c => c.name)).toEqual(expectedNames);
}

// Test data sets for different scenarios
function getBasicTestData() {
  const categories = [
    { id: 'cat1', name: 'Groceries', group: 'group1', sort_order: 1, hidden: false } as CategoryEntity,
    { id: 'cat2', name: 'Restaurants', group: 'group1', sort_order: 2, hidden: false } as CategoryEntity,
    { id: 'cat3', name: 'Salary', group: 'group2', sort_order: 1, hidden: false } as CategoryEntity,
    { id: 'cat4', name: 'Gas', group: 'group3', sort_order: 1, hidden: false } as CategoryEntity,
    { id: 'cat5', name: 'Insurance', group: 'group3', sort_order: 2, hidden: false } as CategoryEntity,
  ];

  const categoryGroups = [
    { id: 'group1', name: 'Food', parent_id: null, sort_order: 1, hidden: false, is_income: false, categories: [] } as CategoryGroupEntity,
    { id: 'group2', name: 'Income', parent_id: null, sort_order: 1, hidden: false, is_income: true, categories: [] } as CategoryGroupEntity,
    { id: 'group3', name: 'Transportation', parent_id: null, sort_order: 2, hidden: false, is_income: false, categories: [] } as CategoryGroupEntity,
    // Child group under Food
    { id: 'group4', name: 'Dining Out', parent_id: 'group1', sort_order: 1, hidden: false, is_income: false, categories: [] } as CategoryGroupEntity,
    // Deep nested group
    { id: 'group5', name: 'Fast Food', parent_id: 'group4', sort_order: 1, hidden: false, is_income: false, categories: [] } as CategoryGroupEntity,
  ];

  return { categories, categoryGroups };
}

function getSortingTestData() {
  return {
    categories: [
      { id: 'cat1', name: 'Third', group: 'group1', sort_order: 3, hidden: false } as CategoryEntity,
      { id: 'cat2', name: 'First', group: 'group1', sort_order: 1, hidden: false } as CategoryEntity,
      { id: 'cat3', name: 'Second', group: 'group1', sort_order: 2, hidden: false } as CategoryEntity,
    ],
    categoryGroups: [
      { id: 'group1', name: 'Test Group', parent_id: null, sort_order: 1, hidden: false, is_income: false, categories: [] } as CategoryGroupEntity,
    ],
  };
}

function getGroupSortingTestData() {
  return {
    categories: [] as CategoryEntity[],
    categoryGroups: [
      { id: 'group1', name: 'Third Group', parent_id: null, sort_order: 3, hidden: false, is_income: false, categories: [] } as CategoryGroupEntity,
      { id: 'group2', name: 'First Group', parent_id: null, sort_order: 1, hidden: false, is_income: false, categories: [] } as CategoryGroupEntity,
      { id: 'group3', name: 'Second Group', parent_id: null, sort_order: 2, hidden: false, is_income: false, categories: [] } as CategoryGroupEntity,
    ],
  };
}

function getIncomeOnlyData() {
  return {
    categories: [
      { id: 'cat1', name: 'Salary', group: 'income1', sort_order: 1, hidden: false } as CategoryEntity,
    ],
    categoryGroups: [
      { id: 'income1', name: 'Income', parent_id: null, sort_order: 1, hidden: false, is_income: true, categories: [] } as CategoryGroupEntity,
    ],
  };
}

function getExpenseOnlyData() {
  return {
    categories: [
      { id: 'cat1', name: 'Food', group: 'expense1', sort_order: 1, hidden: false } as CategoryEntity,
    ],
    categoryGroups: [
      { id: 'expense1', name: 'Expenses', parent_id: null, sort_order: 1, hidden: false, is_income: false, categories: [] } as CategoryGroupEntity,
    ],
  };
}

describe('BuildCategoryHierarchy', () => {
  describe('Core Functionality', () => {
    test('builds flat hierarchy with no parent-child relationships', () => {
      const { categories, categoryGroups } = getBasicTestData();
      // Use only groups without parent_id
      const flatGroups = categoryGroups.filter(g => !g.parent_id);
      const result = buildCategoryHierarchy(flatGroups, categories);

      expectValidHierarchy(result);
      // Should have 2 expense + 1 income groups
      expect(result).toHaveLength(3);

      const foodGroup = findGroupByName(result, 'Food');
      expectGroupToHaveCategories(foodGroup, ['Groceries', 'Restaurants']);

      const incomeGroup = result.find(g => g.is_income);
      expect(incomeGroup?.name).toBe('Income');
      expect(incomeGroup?.categories).toHaveLength(1);
      expect(incomeGroup?.categories?.[0].name).toBe('Salary');
    });

    test('builds 2-level hierarchy (parent → child)', () => {
      const { categories, categoryGroups } = getBasicTestData();
      const result = buildCategoryHierarchy(categoryGroups, categories);

      expectValidHierarchy(result);

      const foodGroup = findGroupByName(result, 'Food');
      expect(foodGroup?.children).toHaveLength(1);

      const diningOutChild = foodGroup?.children?.[0];
      expect(diningOutChild?.name).toBe('Dining Out');
      expect(diningOutChild?.parent_id).toBe('group1');
      expect(diningOutChild?.children).toHaveLength(1);

      // Verify 3-level deep nesting
      const fastFoodChild = diningOutChild?.children?.[0];
      expect(fastFoodChild?.name).toBe('Fast Food');
      expect(fastFoodChild?.parent_id).toBe('group4');

      const transportationGroup = findGroupByName(result, 'Transportation');
      const incomeGroup = findGroupByName(result, 'Income');
      expect(transportationGroup?.children).toEqual([]); // Flat
      expect(incomeGroup?.children).toEqual([]); // Flat
    });

    test('builds deep hierarchy (5+ levels)', () => {
      const deepGroups = [
        { id: 'level1', name: 'Level 1', parent_id: null, sort_order: 1, hidden: false, is_income: false, categories: [] } as CategoryGroupEntity,
        { id: 'level2', name: 'Level 2', parent_id: 'level1', sort_order: 1, hidden: false, is_income: false, categories: [] } as CategoryGroupEntity,
        { id: 'level3', name: 'Level 3', parent_id: 'level2', sort_order: 1, hidden: false, is_income: false, categories: [] } as CategoryGroupEntity,
        { id: 'level4', name: 'Level 4', parent_id: 'level3', sort_order: 1, hidden: false, is_income: false, categories: [] } as CategoryGroupEntity,
        { id: 'level5', name: 'Level 5', parent_id: 'level4', sort_order: 1, hidden: false, is_income: false, categories: [] } as CategoryGroupEntity,
      ];

      const result = buildCategoryHierarchy(deepGroups, []);
      expectValidHierarchy(result);

      // Navigate down the hierarchy
      const level1 = result[0];
      const level2 = level1?.children?.[0];
      const level3 = level2?.children?.[0];
      const level4 = level3?.children?.[0];
      const level5 = level4?.children?.[0];

      expect(level5?.name).toBe('Level 5');
      expect(level5?.parent_id).toBe('level4');
    });


    test('handles empty categoryGroups array', () => {
      const result = buildCategoryHierarchy([], []);
      expect(result).toEqual([]);
    });

    test('handles empty categories array', () => {
      const { categoryGroups } = getBasicTestData();
      const result = buildCategoryHierarchy(categoryGroups, []);

      expectValidHierarchy(result);

      // Groups should exist but have no categories
      const foodGroup = findGroupByName(result, 'Food');
      expect(foodGroup?.categories).toEqual([]);
    });

    test('handles null/undefined inputs gracefully', () => {
      expect(buildCategoryHierarchy(null, null)).toEqual([]);
      expect(buildCategoryHierarchy(undefined, undefined)).toEqual([]);
      expect(buildCategoryHierarchy([], null)).toEqual([]);
    });
  });

  describe('Category Assignment and Sorting', () => {
    test('assigns categories to correct groups', () => {
      const { categories, categoryGroups } = getBasicTestData();
      const result = buildCategoryHierarchy(categoryGroups, categories);

      const transportationGroup = findGroupByName(result, 'Transportation');
      expectGroupToHaveCategories(transportationGroup, ['Gas', 'Insurance']);

      const foodGroup = findGroupByName(result, 'Food');
      expectGroupToHaveCategories(foodGroup, ['Groceries', 'Restaurants']);
    });

    test('sorts categories within groups by sort_order', () => {
      const { categories, categoryGroups } = getSortingTestData();
      const result = buildCategoryHierarchy(categoryGroups, categories);

      const testGroup = findGroupByName(result, 'Test Group');
      expectGroupToHaveCategories(testGroup, ['First', 'Second', 'Third']);
    });

    test('sorts groups by sort_order within hierarchy levels', () => {
      const { categories, categoryGroups } = getGroupSortingTestData();
      const result = buildCategoryHierarchy(categoryGroups, categories);

      expect(result.map(g => g.name)).toEqual(['First Group', 'Second Group', 'Third Group']);
    });

    test('handles duplicate sort_order values', () => {
      const duplicateSortCategories = [
        { id: 'cat1', name: 'First', group: 'group1', sort_order: 1, hidden: false } as CategoryEntity,
        { id: 'cat2', name: 'Second', group: 'group1', sort_order: 1, hidden: false } as CategoryEntity,
        { id: 'cat3', name: 'Third', group: 'group1', sort_order: 1, hidden: false } as CategoryEntity,
      ];
      const testGroups = [
        { id: 'group1', name: 'Test Group', parent_id: null, sort_order: 1, hidden: false, is_income: false, categories: [] } as CategoryGroupEntity,
      ];

      const result = buildCategoryHierarchy(testGroups, duplicateSortCategories);
      const testGroup = findGroupByName(result, 'Test Group');

      expect(testGroup?.categories).toHaveLength(3);
      // Order should be consistent even with duplicate sort_order
      expect(testGroup?.categories?.every(c => c.sort_order === 1)).toBe(true);
    });
  });

  describe('Income vs Expense Group Separation', () => {
    test('separates income and expense groups correctly', () => {
      const { categories, categoryGroups } = getBasicTestData();
      const result = buildCategoryHierarchy(categoryGroups, categories);

      expectValidHierarchy(result);

      // Income group should be last
      const lastGroup = result[result.length - 1];
      expect(lastGroup.is_income).toBe(true);
      expect(lastGroup.name).toBe('Income');

      // All other groups should be expense groups
      const expenseGroups = result.slice(0, -1);
      expenseGroups.forEach(group => {
        expect(group.is_income).toBeFalsy();
      });
    });

    test('handles case with no income groups', () => {
      const { categories, categoryGroups } = getExpenseOnlyData();
      const result = buildCategoryHierarchy(categoryGroups, categories);

      expectValidHierarchy(result);

      // Should have no income groups
      const incomeGroups = result.filter(g => g.is_income);
      expect(incomeGroups).toHaveLength(0);
    });

    test('handles case with only income groups', () => {
      const { categories, categoryGroups } = getIncomeOnlyData();
      const result = buildCategoryHierarchy(categoryGroups, categories);

      expectValidHierarchy(result);
      expect(result).toHaveLength(1);
      expect(result[0].is_income).toBe(true);
    });

    test('handles multiple income and expense groups', () => {
      const mixedGroups = [
        { id: 'expense1', name: 'Food', parent_id: null, sort_order: 1, hidden: false, is_income: false, categories: [] } as CategoryGroupEntity,
        { id: 'income1', name: 'Salary', parent_id: null, sort_order: 1, hidden: false, is_income: true, categories: [] } as CategoryGroupEntity,
        { id: 'expense2', name: 'Transportation', parent_id: null, sort_order: 2, hidden: false, is_income: false, categories: [] } as CategoryGroupEntity,
        { id: 'income2', name: 'Investments', parent_id: null, sort_order: 2, hidden: false, is_income: true, categories: [] } as CategoryGroupEntity,
      ];

      const result = buildCategoryHierarchy(mixedGroups, []);

      expectValidHierarchy(result);

      // Should have expense groups first, then income groups
      const expenseGroups = result.filter(g => !g.is_income);
      const incomeGroups = result.filter(g => g.is_income);

      expect(expenseGroups).toHaveLength(2);
      expect(incomeGroups).toHaveLength(1); // buildCategoryHierarchy combines income groups

      // Verify expense groups come first
      expect(result[0].is_income).toBe(false);
      expect(result[1].is_income).toBe(false);

      // Income group should be last
      const lastGroup = result[result.length - 1];
      expect(lastGroup.is_income).toBe(true);
    });
  });

  describe('Memoization Behavior', () => {
    test('returns same reference for identical inputs', () => {
      const { categories, categoryGroups } = getBasicTestData();
      const result1 = buildCategoryHierarchy(categoryGroups, categories);
      const result2 = buildCategoryHierarchy(categoryGroups, categories);

      // Should return exact same reference due to memoization
      expect(result1).toBe(result2);
    });

    test('returns new reference when inputs change', () => {
      const { categories, categoryGroups } = getBasicTestData();
      const result1 = buildCategoryHierarchy(categoryGroups, categories);

      // Change the input by adding a new category
      const modifiedCategories = [
        ...categories,
        { id: 'new-cat', name: 'New Category', group: 'group1', hidden: false, sort_order: 0 } as CategoryEntity,
      ];

      const result2 = buildCategoryHierarchy(categoryGroups, modifiedCategories);

      // Should return different reference
      expect(result1).not.toBe(result2);
    });

    test('handles complex nested data changes correctly', () => {
      const { categories, categoryGroups } = getBasicTestData();
      const result1 = buildCategoryHierarchy(categoryGroups, categories);

      // Modify a nested property
      const modifiedGroups = categoryGroups.map(group =>
        group.id === 'group1' ? { ...group, name: 'Modified Food' } : group
      );

      const result2 = buildCategoryHierarchy(modifiedGroups, categories);

      expect(result1).not.toBe(result2);

      const modifiedFoodGroup = findGroupByName(result2, 'Modified Food');
      expect(modifiedFoodGroup).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    test('typical budget scenario performance', () => {
      // Simulate a typical user's budget with realistic data
      const budgetGroups = [
        { id: 'housing', name: 'Housing', parent_id: null, sort_order: 1, hidden: false, is_income: false, categories: [] } as CategoryGroupEntity,
        { id: 'food', name: 'Food', parent_id: null, sort_order: 2, hidden: false, is_income: false, categories: [] } as CategoryGroupEntity,
        { id: 'dining', name: 'Dining Out', parent_id: 'food', sort_order: 1, hidden: false, is_income: false, categories: [] } as CategoryGroupEntity,
        { id: 'transportation', name: 'Transportation', parent_id: null, sort_order: 3, hidden: false, is_income: false, categories: [] } as CategoryGroupEntity,
        { id: 'healthcare', name: 'Healthcare', parent_id: null, sort_order: 4, hidden: false, is_income: false, categories: [] } as CategoryGroupEntity,
        { id: 'salary', name: 'Salary', parent_id: null, sort_order: 1, hidden: false, is_income: true, categories: [] } as CategoryGroupEntity,
        { id: 'investments', name: 'Investments', parent_id: null, sort_order: 2, hidden: false, is_income: true, categories: [] } as CategoryGroupEntity,
      ];

      const budgetCategories = [
        { id: 'rent', name: 'Rent/Mortgage', group: 'housing', sort_order: 1, hidden: false } as CategoryEntity,
        { id: 'utilities', name: 'Utilities', group: 'housing', sort_order: 2, hidden: false } as CategoryEntity,
        { id: 'groceries', name: 'Groceries', group: 'food', sort_order: 1, hidden: false } as CategoryEntity,
        { id: 'restaurants', name: 'Restaurants', group: 'dining', sort_order: 1, hidden: false } as CategoryEntity,
        { id: 'gas', name: 'Gas', group: 'transportation', sort_order: 1, hidden: false } as CategoryEntity,
        { id: 'car-insurance', name: 'Car Insurance', group: 'transportation', sort_order: 2, hidden: false } as CategoryEntity,
        { id: 'medical', name: 'Medical', group: 'healthcare', sort_order: 1, hidden: false } as CategoryEntity,
        { id: 'dental', name: 'Dental', group: 'healthcare', sort_order: 2, hidden: false } as CategoryEntity,
        { id: 'main-job', name: 'Main Job', group: 'salary', sort_order: 1, hidden: false } as CategoryEntity,
        { id: 'side-hustle', name: 'Side Hustle', group: 'salary', sort_order: 2, hidden: false } as CategoryEntity,
        { id: 'dividends', name: 'Dividends', group: 'investments', sort_order: 1, hidden: false } as CategoryEntity,
        { id: 'interest', name: 'Interest', group: 'investments', sort_order: 2, hidden: false } as CategoryEntity,
      ];

      const start = performance.now();
      const result = buildCategoryHierarchy(budgetGroups, budgetCategories);
      const executionTime = performance.now() - start;

      // Should be very fast for typical use case
      expect(executionTime).toBeLessThan(10); // 10ms threshold
      expectValidHierarchy(result);

      // Verify structure is correct
      expect(result.length).toBeGreaterThan(0);
      const incomeGroups = result.filter(g => g.is_income);
      expect(incomeGroups.length).toBe(1); // buildCategoryHierarchy combines income groups

      console.log(`Typical budget scenario: ${executionTime.toFixed(2)}ms`);
    });

    test('rapid successive updates scenario', () => {
      // Simulate rapid updates like user typing in search or making quick changes  
      const baseGroups = [{ id: 'group1', name: 'Food', parent_id: null, sort_order: 1, hidden: false, is_income: false, categories: [] } as CategoryGroupEntity];
      const baseCategories = [{ id: 'cat1', name: 'Groceries', group: 'group1', sort_order: 1, hidden: false } as CategoryEntity];
      const times: number[] = [];

      for (let i = 0; i < 50; i++) {
        const modifiedCategories = baseCategories.map(cat =>
          cat.id === 'cat1'
            ? { ...cat, name: `${cat.name} ${i}` }
            : cat
        );

        const start = performance.now();
        buildCategoryHierarchy(baseGroups, modifiedCategories);
        times.push(performance.now() - start);
      }

      const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);

      // Should maintain consistent performance
      expect(averageTime).toBeLessThan(5); // 5ms average
      expect(maxTime).toBeLessThan(20); // 20ms maximum

      console.log(`Rapid updates: avg=${averageTime.toFixed(2)}ms, max=${maxTime.toFixed(2)}ms`);
    });
  });

  describe('Edge Cases', () => {
    test('handles orphaned child groups gracefully', () => {
      const { categories, categoryGroups } = getBasicTestData();
      // Add a child group that references a non-existent parent
      const groupsWithOrphan = [
        ...categoryGroups,
        { id: 'orphan', name: 'Orphaned Group', parent_id: 'non-existent', sort_order: 1, hidden: false, is_income: false, categories: [] } as CategoryGroupEntity,
      ];

      const result = buildCategoryHierarchy(groupsWithOrphan, categories);

      expectValidHierarchy(result);

      // Orphaned group should be excluded from the hierarchy
      const allGroups = flattenAllGroups(result);
      const orphanGroup = allGroups.find(g => g.name === 'Orphaned Group');
      expect(orphanGroup).toBeUndefined();
    });

    test('handles categories pointing to non-existent groups', () => {
      const { categories, categoryGroups } = getBasicTestData();
      const categoriesWithOrphan = [
        ...categories,
        { id: 'orphan-cat', name: 'Orphaned Category', group: 'non-existent-group', sort_order: 1, hidden: false } as CategoryEntity,
      ];

      const result = buildCategoryHierarchy(categoryGroups, categoriesWithOrphan);

      expectValidHierarchy(result);

      // Orphaned category should be excluded from all groups
      const allCategories = result.flatMap(g => g.categories || []);
      const orphanCategory = allCategories.find(c => c.name === 'Orphaned Category');
      expect(orphanCategory).toBeUndefined();
    });

    test('handles groups with missing sort_order', () => {
      const groupsWithMissingSortOrder = [
        { id: 'group1', name: 'First Group', parent_id: null, sort_order: 1, hidden: false, is_income: false, categories: [] } as CategoryGroupEntity,
        { id: 'group2', name: 'No Sort Order', parent_id: null, hidden: false, is_income: false, categories: [] } as CategoryGroupEntity,
        { id: 'group3', name: 'Third Group', parent_id: null, sort_order: 3, hidden: false, is_income: false, categories: [] } as CategoryGroupEntity,
      ];

      const result = buildCategoryHierarchy(groupsWithMissingSortOrder, []);

      expectValidHierarchy(result);
      expect(result).toHaveLength(3);

      // Groups with missing sort_order should default to 0 and appear first
      const groupNames = result.map(g => g.name);
      expect(groupNames).toEqual(['No Sort Order', 'First Group', 'Third Group']);
    });

    test('handles extremely large datasets', () => {
      // Create a realistic dataset - 100 groups, 1000 categories
      const largeGroups = Array.from({ length: 100 }, (_, i) =>
      ({
        id: `group${i}`,
        name: `Group ${i}`,
        parent_id: i % 20 === 0 && i > 0 ? `group${i - 20}` : null,
        sort_order: i,
        hidden: false,
        is_income: false,
        categories: []
      } as CategoryGroupEntity)
      );

      const largeCategories = Array.from({ length: 1000 }, (_, i) =>
      ({
        id: `cat${i}`,
        name: `Category ${i}`,
        group: `group${i % 100}`,
        sort_order: i,
        hidden: false
      } as CategoryEntity)
      );

      const start = performance.now();
      const result = buildCategoryHierarchy(largeGroups, largeCategories);
      const executionTime = performance.now() - start;

      expectValidHierarchy(result);
      expect(result.length).toBeGreaterThan(0);

      // Should complete within reasonable time
      expect(executionTime).toBeLessThan(50); // 50ms threshold

      console.log(`Large dataset (100 groups, 1000 categories): ${executionTime.toFixed(2)}ms`);
    });

    test('handles categories with missing properties', () => {
      const categoriesWithMissingProps = [
        { id: 'cat1', name: 'Valid Category', group: 'group1' } as CategoryEntity,
        { id: 'cat2', group: 'group1', sort_order: 2 } as CategoryEntity, // Missing name
      ];

      const testGroups = [
        { id: 'group1', name: 'Test Group', parent_id: null, sort_order: 1, hidden: false, is_income: false, categories: [] } as CategoryGroupEntity,
      ];

      // Should not crash with malformed data
      expect(() => buildCategoryHierarchy(testGroups, categoriesWithMissingProps)).not.toThrow();
    });
  });
});