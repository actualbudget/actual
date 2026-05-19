import type { RuleConditionEntity } from '@actual-app/core/types/models';
import { describe, expect, it, vi } from 'vitest';

import {
  addNode,
  addPercentageLabels,
  addValueToLink,
  buildSankeyData,
  cleanUpNodes,
  convertToSankeyData,
  createBudgetGraph,
  createTransactionsGraph,
  deleteLink,
  filterCategoryGroups,
  filterGraphByLayers,
  getCategoryGroup,
  getLayer,
  getNodeValue,
  GraphLayers,
  hasChild,
  hasParent,
  isGraphLayer,
  moveNodeToEnd,
  moveNodeToStart,
  nodesInLayer,
  sortGraph,
} from './sankey-spreadsheet';
import type { Graph, NodeData } from './sankey-spreadsheet';

// Mock i18n
vi.mock('i18next', () => ({
  t: (key: string, params?: Record<string, string>) => {
    if (params && params.month) {
      return `translated: ${key} (${params.month})`;
    }
    if (params && params.category) {
      return `translated: ${key} (${params.category})`;
    }
    return `translated: ${key}`;
  },
}));

describe('sankey-spreadsheet', () => {
  describe('isGraphLayer', () => {
    it('returns true for valid graph layers', () => {
      expect(isGraphLayer('payee')).toBe(true);
      expect(isGraphLayer('income_category')).toBe(true);
      expect(isGraphLayer('account')).toBe(true);
      expect(isGraphLayer('budget')).toBe(true);
      expect(isGraphLayer('category_group')).toBe(true);
      expect(isGraphLayer('category')).toBe(true);
    });

    it('returns false for invalid values', () => {
      expect(isGraphLayer('invalid')).toBe(false);
      expect(isGraphLayer('')).toBe(false);
      expect(isGraphLayer(123)).toBe(false);
      expect(isGraphLayer(null)).toBe(false);
      expect(isGraphLayer(undefined)).toBe(false);
    });
  });

  describe('addNode', () => {
    it('adds a new node to the graph', () => {
      const graph: Graph = new Map();
      addNode(graph, 'node1', GraphLayers.Category, 'Category 1');

      expect(graph.has('node1')).toBe(true);
      const node = graph.get('node1');
      expect(node?.type).toBe(GraphLayers.Category);
      expect(node?.name).toBe('Category 1');
      expect(node?.to.size).toBe(0);
    });

    it('does not overwrite existing node', () => {
      const graph: Graph = new Map();
      addNode(graph, 'node1', GraphLayers.Category, 'Category 1');
      addNode(graph, 'node1', GraphLayers.Account, 'Account 1');

      const node = graph.get('node1');
      expect(node?.type).toBe(GraphLayers.Category);
      expect(node?.name).toBe('Category 1');
    });
  });

  describe('addValueToLink', () => {
    it('adds a link between nodes', () => {
      const graph: Graph = new Map();
      addNode(graph, 'source', GraphLayers.Category, 'Source');
      addNode(graph, 'target', GraphLayers.Category, 'Target');
      addValueToLink(graph, 'source', 'target', 100);

      const sourceNode = graph.get('source');
      expect(sourceNode?.to.get('target')).toBe(100);
    });

    it('accumulates values for same link', () => {
      const graph: Graph = new Map();
      addNode(graph, 'source', GraphLayers.Category, 'Source');
      addNode(graph, 'target', GraphLayers.Category, 'Target');
      addValueToLink(graph, 'source', 'target', 100);
      addValueToLink(graph, 'source', 'target', 50);

      const sourceNode = graph.get('source');
      expect(sourceNode?.to.get('target')).toBe(150);
    });

    it('does nothing if source node does not exist', () => {
      const graph: Graph = new Map();
      addValueToLink(graph, 'nonexistent', 'target', 100);

      expect(graph.size).toBe(0);
    });
  });

  describe('getLayer', () => {
    it('returns 0 for root nodes (no parents)', () => {
      const graph: Graph = new Map();
      addNode(graph, 'root', GraphLayers.Account, 'Root');

      expect(getLayer(graph, 'root')).toBe(0);
    });

    it('returns correct layer for nodes with parents', () => {
      const graph: Graph = new Map();
      addNode(graph, 'root', GraphLayers.Account, 'Root');
      addNode(graph, 'child', GraphLayers.Category, 'Child');
      addNode(graph, 'grandchild', GraphLayers.Category, 'Grandchild');
      addValueToLink(graph, 'root', 'child', 100);
      addValueToLink(graph, 'child', 'grandchild', 50);

      expect(getLayer(graph, 'root')).toBe(0);
      expect(getLayer(graph, 'child')).toBe(1);
      expect(getLayer(graph, 'grandchild')).toBe(2);
    });
  });

  describe('nodesInLayer', () => {
    it('returns nodes in the specified layer', () => {
      const graph: Graph = new Map();
      addNode(graph, 'node1', GraphLayers.Category, 'Category 1');
      addNode(graph, 'node2', GraphLayers.Category, 'Category 2');
      addNode(graph, 'node3', GraphLayers.Account, 'Account 1');

      const categoryNodes = nodesInLayer(graph, GraphLayers.Category);
      expect(categoryNodes).toHaveLength(2);
      expect(categoryNodes).toContain('node1');
      expect(categoryNodes).toContain('node2');

      const accountNodes = nodesInLayer(graph, GraphLayers.Account);
      expect(accountNodes).toHaveLength(1);
      expect(accountNodes).toContain('node3');
    });

    it('returns empty array if no nodes in layer', () => {
      const graph: Graph = new Map();
      const result = nodesInLayer(graph, GraphLayers.Category);
      expect(result).toHaveLength(0);
    });
  });

  describe('hasParent', () => {
    it('returns true if node has a parent', () => {
      const graph: Graph = new Map();
      addNode(graph, 'parent', GraphLayers.Account, 'Parent');
      addNode(graph, 'child', GraphLayers.Category, 'Child');
      addValueToLink(graph, 'parent', 'child', 100);

      expect(hasParent(graph, 'child')).toBe(true);
    });

    it('returns false if node has no parent', () => {
      const graph: Graph = new Map();
      addNode(graph, 'orphan', GraphLayers.Category, 'Orphan');

      expect(hasParent(graph, 'orphan')).toBe(false);
    });
  });

  describe('hasChild', () => {
    it('returns true if node has children', () => {
      const node: NodeData = {
        to: new Map([['child1', 100]]),
        type: GraphLayers.Category,
      };

      expect(hasChild(node)).toBe(true);
    });

    it('returns false if node has no children', () => {
      const node: NodeData = {
        to: new Map(),
        type: GraphLayers.Category,
      };

      expect(hasChild(node)).toBe(false);
    });
  });

  describe('getNodeValue', () => {
    it('returns sum of outgoing links for root nodes', () => {
      const graph: Graph = new Map();
      addNode(graph, 'root', GraphLayers.Account, 'Root');
      addValueToLink(graph, 'root', 'child1', 100);
      addValueToLink(graph, 'root', 'child2', 200);

      expect(getNodeValue(graph, 'root')).toBe(300);
    });

    it('returns sum of incoming links for non-root nodes', () => {
      const graph: Graph = new Map();
      addNode(graph, 'root', GraphLayers.Account, 'Root');
      addNode(graph, 'child', GraphLayers.Category, 'Child');
      addValueToLink(graph, 'root', 'child', 150);

      expect(getNodeValue(graph, 'child')).toBe(150);
    });
  });

  describe('getCategoryGroup', () => {
    it('returns the category group for a category', () => {
      const graph: Graph = new Map();
      addNode(graph, 'group1', GraphLayers.CategoryGroup, 'Group 1');
      addNode(graph, 'cat1', GraphLayers.Category, 'Category 1');
      addValueToLink(graph, 'group1', 'cat1', 100);

      const result = getCategoryGroup(graph, 'cat1');
      expect(result).toBeDefined();
      expect(result![0]).toBe('group1');
      expect(result![1].type).toBe(GraphLayers.CategoryGroup);
    });

    it('returns undefined if no category group found', () => {
      const graph: Graph = new Map();
      addNode(graph, 'cat1', GraphLayers.Category, 'Category 1');

      const result = getCategoryGroup(graph, 'cat1');
      expect(result).toBeUndefined();
    });
  });

  describe('deleteLink', () => {
    it('deletes a link between nodes', () => {
      const graph: Graph = new Map();
      addNode(graph, 'source', GraphLayers.Category, 'Source');
      addNode(graph, 'target', GraphLayers.Category, 'Target');
      addValueToLink(graph, 'source', 'target', 100);

      deleteLink(graph, 'source', 'target');

      const sourceNode = graph.get('source');
      expect(sourceNode?.to.has('target')).toBe(false);
    });

    it('does nothing if source node does not exist', () => {
      const graph: Graph = new Map();
      deleteLink(graph, 'nonexistent', 'target');

      expect(graph.size).toBe(0);
    });
  });

  describe('moveNodeToEnd', () => {
    it('moves a node entry to the end of the array', () => {
      const entries: Array<[string, NodeData]> = [
        ['node1', { to: new Map(), type: GraphLayers.Category }],
        ['node2', { to: new Map(), type: GraphLayers.Category }],
        ['node3', { to: new Map(), type: GraphLayers.Category }],
      ];

      moveNodeToEnd(entries, 'node1');

      expect(entries[0][0]).toBe('node2');
      expect(entries[1][0]).toBe('node3');
      expect(entries[2][0]).toBe('node1');
    });

    it('does nothing if node not found', () => {
      const entries: Array<[string, NodeData]> = [
        ['node1', { to: new Map(), type: GraphLayers.Category }],
        ['node2', { to: new Map(), type: GraphLayers.Category }],
      ];

      moveNodeToEnd(entries, 'nonexistent');

      expect(entries[0][0]).toBe('node1');
      expect(entries[1][0]).toBe('node2');
    });
  });

  describe('moveNodeToStart', () => {
    it('moves a node entry to the start of the array', () => {
      const entries: Array<[string, NodeData]> = [
        ['node1', { to: new Map(), type: GraphLayers.Category }],
        ['node2', { to: new Map(), type: GraphLayers.Category }],
        ['node3', { to: new Map(), type: GraphLayers.Category }],
      ];

      moveNodeToStart(entries, 'node3');

      expect(entries[0][0]).toBe('node3');
      expect(entries[1][0]).toBe('node1');
      expect(entries[2][0]).toBe('node2');
    });

    it('does nothing if node not found', () => {
      const entries: Array<[string, NodeData]> = [
        ['node1', { to: new Map(), type: GraphLayers.Category }],
        ['node2', { to: new Map(), type: GraphLayers.Category }],
      ];

      moveNodeToStart(entries, 'nonexistent');

      expect(entries[0][0]).toBe('node1');
      expect(entries[1][0]).toBe('node2');
    });
  });

  describe('filterCategoryGroups', () => {
    const createCategoryGroup = (
      id: string,
      name: string,
      isIncome: boolean,
      categories: Array<{ id: string; name: string }>,
    ) => ({
      id,
      name,
      is_income: isIncome,
      categories: categories.map(c => ({
        ...c,
        spent: 0,
        budgeted: 0,
        balance: 0,
        received: 0,
      })),
    });

    it('returns all groups if no conditions', () => {
      const groups = [
        createCategoryGroup('g1', 'Group 1', false, [
          { id: 'c1', name: 'Cat 1' },
        ]),
        createCategoryGroup('g2', 'Group 2', false, [
          { id: 'c2', name: 'Cat 2' },
        ]),
      ];

      const result = filterCategoryGroups(groups, [], 'and');
      expect(result).toHaveLength(2);
    });

    it('filters by category id with "is" operator', () => {
      const groups = [
        createCategoryGroup('g1', 'Group 1', false, [
          { id: 'c1', name: 'Cat 1' },
          { id: 'c2', name: 'Cat 2' },
        ]),
      ];

      const conditions: RuleConditionEntity[] = [
        { field: 'category', op: 'is', value: 'c1', customName: '' },
      ];

      const result = filterCategoryGroups(groups, conditions, 'and');
      expect(result).toHaveLength(1);
      expect(result[0].categories).toHaveLength(1);
      expect(result[0].categories[0].id).toBe('c1');
    });

    it('filters by category id with "isNot" operator', () => {
      const groups = [
        createCategoryGroup('g1', 'Group 1', false, [
          { id: 'c1', name: 'Cat 1' },
          { id: 'c2', name: 'Cat 2' },
        ]),
      ];

      const conditions: RuleConditionEntity[] = [
        { field: 'category', op: 'isNot', value: 'c1', customName: '' },
      ];

      const result = filterCategoryGroups(groups, conditions, 'and');
      expect(result).toHaveLength(1);
      expect(result[0].categories).toHaveLength(1);
      expect(result[0].categories[0].id).toBe('c2');
    });

    it('filters by category name with "contains" operator', () => {
      const groups = [
        createCategoryGroup('g1', 'Group 1', false, [
          { id: 'c1', name: 'Groceries' },
          { id: 'c2', name: 'Entertainment' },
        ]),
      ];

      const conditions: RuleConditionEntity[] = [
        {
          field: 'category',
          op: 'contains',
          value: 'groceries',
          customName: '',
        },
      ];

      const result = filterCategoryGroups(groups, conditions, 'and');
      expect(result).toHaveLength(1);
      expect(result[0].categories).toHaveLength(1);
      expect(result[0].categories[0].name).toBe('Groceries');
    });

    it('filters by category group with "is" operator', () => {
      const groups = [
        createCategoryGroup('g1', 'Group 1', false, [
          { id: 'c1', name: 'Cat 1' },
        ]),
        createCategoryGroup('g2', 'Group 2', false, [
          { id: 'c2', name: 'Cat 2' },
        ]),
      ];

      const conditions: RuleConditionEntity[] = [
        { field: 'category_group', op: 'is', value: 'g2', customName: '' },
      ];

      const result = filterCategoryGroups(groups, conditions, 'and');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('g2');
    });

    it('returns empty if no categories match', () => {
      const groups = [
        createCategoryGroup('g1', 'Group 1', false, [
          { id: 'c1', name: 'Cat 1' },
        ]),
      ];

      const conditions: RuleConditionEntity[] = [
        { field: 'category', op: 'is', value: 'nonexistent', customName: '' },
      ];

      const result = filterCategoryGroups(groups, conditions, 'and');
      expect(result).toHaveLength(0);
    });

    it('handles "oneOf" operator for category', () => {
      const groups = [
        createCategoryGroup('g1', 'Group 1', false, [
          { id: 'c1', name: 'Cat 1' },
          { id: 'c2', name: 'Cat 2' },
          { id: 'c3', name: 'Cat 3' },
        ]),
      ];

      const conditions: RuleConditionEntity[] = [
        { field: 'category', op: 'oneOf', value: ['c1', 'c3'], customName: '' },
      ];

      const result = filterCategoryGroups(groups, conditions, 'and');
      expect(result).toHaveLength(1);
      expect(result[0].categories).toHaveLength(2);
      expect(result[0].categories.map(c => c.id)).toContain('c1');
      expect(result[0].categories.map(c => c.id)).toContain('c3');
    });
  });

  describe('createBudgetGraph', () => {
    it('creates a graph with income and expense categories', () => {
      const categoryData = [
        {
          categoryGroup: 'Income',
          categoryGroupId: 'g_income',
          category: 'Salary',
          categoryId: 'c_salary',
          value: 5000,
          isIncome: true,
          isNegative: false,
        },
        {
          categoryGroup: 'Food',
          categoryGroupId: 'g_food',
          category: 'Groceries',
          categoryId: 'c_groceries',
          value: 500,
          isIncome: false,
          isNegative: false,
        },
      ];

      const aggregated = {
        toBudget: 1000,
        fromPreviousMonth: 200,
        lastMonthOverspent: 0,
        categoryGroupsMap: new Map(),
        forNextMonth: 300,
        startMonth: '2024-01',
        endMonth: '2024-01',
      };

      const graph = createBudgetGraph(categoryData, aggregated);

      expect(graph.has('c_salary')).toBe(true);
      expect(graph.has('c_groceries')).toBe(true);
      expect(graph.has('budgeted')).toBe(true);
      expect(graph.has('available_income')).toBe(true);
      expect(graph.has('to_budget')).toBe(true);
    });

    it('marks to_budget as overbudgeted when negative', () => {
      const categoryData: Array<{
        categoryGroup: string;
        categoryGroupId: string;
        category: string;
        categoryId: string;
        value: number;
        isIncome: boolean;
        isNegative: false;
      }> = [];

      const aggregated = {
        toBudget: -500,
        fromPreviousMonth: 0,
        lastMonthOverspent: 0,
        categoryGroupsMap: new Map(),
        forNextMonth: 0,
        startMonth: '2024-01',
        endMonth: '2024-01',
      };

      const graph = createBudgetGraph(categoryData, aggregated);
      const toBudgetNode = graph.get('to_budget');

      expect(toBudgetNode?.isNegative).toBe(true);
      expect(toBudgetNode?.labelKey).toBe('Overbudgeted');
    });
  });

  describe('createTransactionsGraph', () => {
    it('creates a graph with account and category nodes', () => {
      const categoryData = [
        {
          categoryGroup: 'Food',
          categoryGroupId: 'g_food',
          category: 'Groceries',
          categoryId: 'c_groceries',
          value: 100,
          isIncome: false,
          isNegative: false,
          accountName: 'Checking',
          accountId: 'a_checking',
        },
        {
          categoryGroup: 'Income',
          categoryGroupId: 'g_income',
          category: 'Salary',
          categoryId: 'c_salary',
          value: 5000,
          isIncome: true,
          isNegative: false,
          accountName: 'Checking',
          accountId: 'a_checking',
          payeeName: 'Employer',
          payeeId: 'p_employer',
        },
      ];

      const graph = createTransactionsGraph(categoryData);

      expect(graph.has('a_checking')).toBe(true);
      expect(graph.has('c_groceries')).toBe(true);
      expect(graph.has('c_salary')).toBe(true);
      expect(graph.has('p_employer')).toBe(true);
    });
  });

  describe('sortGraph', () => {
    it('sorts by global value when mode is global', () => {
      const graph: Graph = new Map();
      addNode(graph, 'node1', GraphLayers.Category, 'Node 1');
      addNode(graph, 'node2', GraphLayers.Category, 'Node 2');
      addNode(graph, 'node3', GraphLayers.Category, 'Node 3');
      addValueToLink(graph, 'node1', 'target', 100);
      addValueToLink(graph, 'node2', 'target', 300);
      addValueToLink(graph, 'node3', 'target', 200);

      const sorted = sortGraph(graph, 'global', []);

      const keys = Array.from(sorted.keys());
      expect(keys[0]).toBe('node2'); // 300
      expect(keys[1]).toBe('node3'); // 200
      expect(keys[2]).toBe('node1'); // 100
    });

    it('sorts by budget order when mode is budget-order', () => {
      const graph: Graph = new Map();
      addNode(graph, 'g1', GraphLayers.CategoryGroup, 'Group 1');
      addNode(graph, 'g2', GraphLayers.CategoryGroup, 'Group 2');
      addNode(graph, 'c1', GraphLayers.Category, 'Cat 1');
      addNode(graph, 'c2', GraphLayers.Category, 'Cat 2');
      addValueToLink(graph, 'g1', 'c1', 100);
      addValueToLink(graph, 'g2', 'c2', 200);

      const sorted = sortGraph(graph, 'budget-order', []);
      const keys = Array.from(sorted.keys());

      // Should follow the order in categories array
      expect(keys.indexOf('g1')).toBeLessThan(keys.indexOf('c1'));
      expect(keys.indexOf('g2')).toBeLessThan(keys.indexOf('c2'));
    });

    it('sorts payees according to income categories in per-group mode', () => {
      const graph: Graph = new Map();
      addNode(graph, 'payee1', GraphLayers.IncomePayee, 'Payee 1');
      addNode(graph, 'payee2', GraphLayers.IncomePayee, 'Payee 2');
      addNode(graph, 'payee3', GraphLayers.IncomePayee, 'Payee 3');
      addNode(graph, 'income1', GraphLayers.IncomeCategory, 'Income 1');
      addNode(graph, 'income2', GraphLayers.IncomeCategory, 'Income 2');
      addNode(graph, 'account1', GraphLayers.Account, 'Account 1');

      addValueToLink(graph, 'payee1', 'income1', 300);
      addValueToLink(graph, 'payee2', 'income2', 200);
      addValueToLink(graph, 'payee3', 'income2', 200);
      addValueToLink(graph, 'income1', 'account1', 300);
      addValueToLink(graph, 'income2', 'account1', 400);

      const sorted = sortGraph(graph, 'per-group', []);
      const keys = Array.from(sorted.keys());

      const payee1Index = keys.indexOf('payee1');
      const payee2Index = keys.indexOf('payee2');
      const payee3Index = keys.indexOf('payee3');

      expect(payee2Index).toBeLessThan(payee1Index);
      expect(payee3Index).toBeLessThan(payee1Index);
    });
  });

  describe('addPercentageLabels', () => {
    it('adds percentage labels to all nodes', () => {
      const graph: Graph = new Map();
      addNode(graph, 'node1', GraphLayers.Category, 'Node 1');
      addNode(graph, 'node2', GraphLayers.Category, 'Node 2');
      addValueToLink(graph, 'node1', 'target', 250);
      addValueToLink(graph, 'node2', 'target', 750);

      addPercentageLabels(graph);

      const node1 = graph.get('node1');
      const node2 = graph.get('node2');

      // Total layer value = 1000, node1 = 25%, node2 = 75%
      expect(node1?.percentageLabel).toBe('25.0%');
      expect(node2?.percentageLabel).toBe('75.0%');
    });

    it('normalizes percentages per GraphLayer, not computed depth', () => {
      const graph: Graph = new Map();

      addNode(graph, 'payee', GraphLayers.IncomePayee, 'Payee');
      addNode(graph, 'income-cat', GraphLayers.IncomeCategory, 'Income Cat');
      addNode(graph, 'account-incoming', GraphLayers.Account, 'Account A');

      addNode(graph, 'account-root', GraphLayers.Account, 'Account B');
      addNode(graph, 'group', GraphLayers.CategoryGroup, 'Group');

      addValueToLink(graph, 'payee', 'income-cat', 300);
      addValueToLink(graph, 'income-cat', 'account-incoming', 300);
      addValueToLink(graph, 'account-root', 'group', 100);

      addPercentageLabels(graph);

      expect(graph.get('account-root')?.percentageLabel).toBe('25.0%');
      expect(graph.get('account-incoming')?.percentageLabel).toBe('75.0%');
    });
  });

  describe('filterGraphByLayers', () => {
    it('keeps only nodes within the specified layer range', () => {
      const graph: Graph = new Map();
      addNode(graph, 'payee1', GraphLayers.IncomePayee, 'Payee 1');
      addNode(graph, 'cat1', GraphLayers.IncomeCategory, 'Income Cat 1');
      addNode(graph, 'acc1', GraphLayers.Account, 'Account 1');
      addNode(graph, 'budget', GraphLayers.Budget, 'Budgeted');
      addNode(graph, 'group1', GraphLayers.CategoryGroup, 'Group 1');
      addNode(graph, 'cat2', GraphLayers.Category, 'Category 2');

      filterGraphByLayers(
        graph,
        GraphLayers.Account,
        GraphLayers.CategoryGroup,
      );

      expect(graph.has('payee1')).toBe(false);
      expect(graph.has('cat1')).toBe(false);
      expect(graph.has('acc1')).toBe(true);
      expect(graph.has('budget')).toBe(true);
      expect(graph.has('group1')).toBe(true);
      expect(graph.has('cat2')).toBe(false);
    });

    it('filters correctly when the from layer is the first layer', () => {
      const graph: Graph = new Map();
      addNode(graph, 'payee1', GraphLayers.IncomePayee, 'Payee 1');
      addNode(graph, 'cat1', GraphLayers.IncomeCategory, 'Income Cat 1');
      addNode(graph, 'acc1', GraphLayers.Account, 'Account 1');
      addNode(graph, 'group1', GraphLayers.CategoryGroup, 'Group 1');
      addNode(graph, 'cat2', GraphLayers.Category, 'Category 2');

      filterGraphByLayers(
        graph,
        GraphLayers.IncomePayee,
        GraphLayers.CategoryGroup,
      );

      expect(graph.has('payee1')).toBe(true);
      expect(graph.has('cat1')).toBe(true);
      expect(graph.has('acc1')).toBe(true);
      expect(graph.has('group1')).toBe(true);
      expect(graph.has('cat2')).toBe(false);
    });
  });

  describe('cleanUpNodes', () => {
    it('removes nodes with no incoming or outgoing links', () => {
      const graph: Graph = new Map();
      addNode(graph, 'used1', GraphLayers.Category, 'Used 1');
      addNode(graph, 'used2', GraphLayers.Category, 'Used 2');
      addNode(graph, 'orphan', GraphLayers.Category, 'Orphan');
      addValueToLink(graph, 'used1', 'used2', 100);

      cleanUpNodes(graph);

      expect(graph.has('used1')).toBe(true);
      expect(graph.has('used2')).toBe(true);
      expect(graph.has('orphan')).toBe(false);
    });

    it('removes zero-value links before cleaning', () => {
      const graph: Graph = new Map();
      addNode(graph, 'node1', GraphLayers.Category, 'Node 1');
      addNode(graph, 'node2', GraphLayers.Category, 'Node 2');
      addValueToLink(graph, 'node1', 'node2', 0);

      cleanUpNodes(graph);

      expect(graph.has('node1')).toBe(false);
      expect(graph.has('node2')).toBe(false);
    });
  });

  describe('addHiddenNodes via buildSankeyData', () => {
    it('adds one hidden child layer for category groups without children', () => {
      const graph: Graph = new Map();

      addNode(graph, 'account', GraphLayers.Account, 'Account');
      addNode(graph, 'group-with-child', GraphLayers.CategoryGroup, 'Group A');
      addNode(graph, 'category', GraphLayers.Category, 'Category A');
      addValueToLink(graph, 'account', 'group-with-child', 100);
      addValueToLink(graph, 'group-with-child', 'category', 100);

      addNode(graph, 'group-no-child', GraphLayers.CategoryGroup, 'Group B');
      addValueToLink(graph, 'account', 'group-no-child', 50);

      const sankeyData = buildSankeyData(
        graph,
        100,
        [],
        'global',
        GraphLayers.Account,
        GraphLayers.Category,
      );

      const nodeKeys = sankeyData.nodes.map(node => node.key);
      expect(nodeKeys).toContain('group-no-child_category__HIDDEN');
      expect(nodeKeys).not.toContain('group-no-child_category_group__HIDDEN');
    });
  });

  describe('convertToSankeyData', () => {
    it('converts graph to sankey data format', () => {
      const graph: Graph = new Map();
      addNode(graph, 'node1', GraphLayers.Category, 'Node 1');
      addNode(graph, 'node2', GraphLayers.Category, 'Node 2');
      addValueToLink(graph, 'node1', 'node2', 100);

      const result = convertToSankeyData(graph, new Map());

      expect(result.nodes).toHaveLength(2);
      expect(result.links).toHaveLength(1);
      expect(result.links[0].source).toBe(0);
      expect(result.links[0].target).toBe(1);
      expect(result.links[0].value).toBe(100);
    });

    it('includes percentage labels in nodes', () => {
      const graph: Graph = new Map();
      addNode(graph, 'node1', GraphLayers.Category, 'Node 1');
      addNode(graph, 'node2', GraphLayers.Category, 'Node 2');
      addValueToLink(graph, 'node1', 'node2', 100);

      const node1 = graph.get('node1');
      if (node1) node1.percentageLabel = '100.0%';

      const result = convertToSankeyData(graph, new Map());

      expect(result.nodes[0].percentageLabel).toBe('100.0%');
    });

    it('translates labelKey nodes', () => {
      const graph: Graph = new Map();
      addNode(graph, 'node1', GraphLayers.Budget, 'Node 1');
      graph.get('node1')!.labelKey = 'Budgeted';

      const result = convertToSankeyData(graph, new Map());

      expect(result.nodes[0].name).toBe('translated: Budgeted');
    });
  });
});
