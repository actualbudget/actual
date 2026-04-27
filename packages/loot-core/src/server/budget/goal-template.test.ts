import { vi } from 'vitest';

import * as aql from '#server/aql';
import * as db from '#server/db';
import type { DbCategory } from '#server/db';
import type { CategoryEntity } from '#types/models';
import type { Template } from '#types/models/templates';

import * as actions from './actions';
import { applyMultipleCategoryTemplates, applyTemplate } from './goal-template';
import * as statements from './statements';

vi.mock('./actions', () => ({
  getSheetValue: vi.fn(),
  getSheetBoolean: vi.fn(),
  isTrackingBudget: vi.fn(),
  setBudget: vi.fn(),
  setGoal: vi.fn(),
}));

vi.mock('#server/db', () => ({
  getCategories: vi.fn(),
  first: vi.fn(),
}));

vi.mock('#server/aql', () => ({
  aqlQuery: vi.fn(),
}));

vi.mock('#server/sync', () => ({
  batchMessages: (fn: () => Promise<void>) => fn(),
}));

vi.mock('./statements', () => ({
  getActiveSchedules: vi.fn(),
}));

vi.mock('./template-notes', () => ({
  checkTemplateNotes: vi.fn(),
  storeNoteTemplates: vi.fn(),
}));

function setupSheetMock(values: Record<string, number>) {
  vi.mocked(actions.getSheetValue).mockImplementation(
    async (_sheet: string, key: string) => values[key] ?? 0,
  );
  vi.mocked(actions.getSheetBoolean).mockResolvedValue(false);
  vi.mocked(actions.isTrackingBudget).mockReturnValue(false);
}
function setupAqlForWideScope(
  savedTemplatesByCategory: Array<{
    category: CategoryEntity;
    templates: Template[];
  }>,
  categoriesInGroup: CategoryEntity[],
) {
  vi.mocked(aql.aqlQuery).mockImplementation(async (query: unknown) => {
    const queryStr = JSON.stringify(query);
    if (queryStr.includes('hideFraction')) {
      return { data: [{ value: 'false' }], dependencies: [] };
    }
    if (queryStr.includes('defaultCurrencyCode')) {
      return { data: [{ value: 'USD' }], dependencies: [] };
    }
    if (queryStr.includes('goal_def')) {
      return {
        data: savedTemplatesByCategory.map(({ category, templates }) => ({
          ...category,
          goal_def: JSON.stringify(templates),
        })),
        dependencies: [],
      };
    }
    if (queryStr.includes('category_groups')) {
      return {
        data: [{ id: 'g1', hidden: false, categories: categoriesInGroup }],
        dependencies: [],
      };
    }
    return { data: [], dependencies: [] };
  });
}
describe('applyMultipleCategoryTemplates', () => {
  const cat1: CategoryEntity = {
    id: 'cat-1',
    name: 'Groceries',
    group: 'g1',
    is_income: false,
  };
  const cat2: CategoryEntity = {
    id: 'cat-2',
    name: 'Rent',
    group: 'g1',
    is_income: false,
  };

  function setupAqlMultiCategory(
    cats: CategoryEntity[],
    templatesById: Record<string, Template[]>,
  ) {
    vi.mocked(aql.aqlQuery).mockImplementation(async (query: unknown) => {
      const queryStr = JSON.stringify(query);
      if (queryStr.includes('hideFraction')) {
        return { data: [{ value: 'false' }], dependencies: [] };
      }
      if (queryStr.includes('defaultCurrencyCode')) {
        return { data: [{ value: 'USD' }], dependencies: [] };
      }
      if (queryStr.includes('goal_def')) {
        return {
          data: cats
            .filter(c => templatesById[c.id])
            .map(c => ({
              ...c,
              goal_def: JSON.stringify(templatesById[c.id]),
            })),
          dependencies: [],
        };
      }
      if (queryStr.includes('categories')) {
        return { data: cats, dependencies: [] };
      }
      return { data: [], dependencies: [] };
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(statements.getActiveSchedules).mockResolvedValue(
      [] as Awaited<ReturnType<typeof statements.getActiveSchedules>>,
    );
    vi.mocked(db.getCategories).mockResolvedValue([] as DbCategory[]);
  });

  it('writes per-category budgets and returns a success notification', async () => {
    setupSheetMock({ 'to-budget': 100000 });
    setupAqlMultiCategory([cat1, cat2], {
      [cat1.id]: [
        {
          type: 'periodic',
          amount: 100,
          period: { period: 'month', amount: 1 },
          starting: '2024-01-01',
          directive: 'template',
          priority: 1,
        },
      ],
      [cat2.id]: [
        {
          type: 'periodic',
          amount: 200,
          period: { period: 'month', amount: 1 },
          starting: '2024-01-01',
          directive: 'template',
          priority: 1,
        },
      ],
    });

    const result = await applyMultipleCategoryTemplates({
      month: '2024-01',
      categoryIds: [cat1.id, cat2.id],
    });

    expect(result.message).toMatch(/Successfully applied/);
    expect(actions.setBudget).toHaveBeenCalledTimes(2);
    const budgetCalls = vi
      .mocked(actions.setBudget)
      .mock.calls.map(call => call[0]);
    const cat1Budget = budgetCalls.find(c => c.category === cat1.id);
    const cat2Budget = budgetCalls.find(c => c.category === cat2.id);
    expect(cat1Budget?.amount).toBe(10000);
    expect(cat2Budget?.amount).toBe(20000);
  });

  it('clamps lower-priority categories when funds run out', async () => {
    // Only $150 available; cat1 (p1) wants $100, cat2 (p2) wants $100.
    // p1 fully funded, p2 gets the remaining $50.
    setupSheetMock({ 'to-budget': 15000 });
    setupAqlMultiCategory([cat1, cat2], {
      [cat1.id]: [
        {
          type: 'periodic',
          amount: 100,
          period: { period: 'month', amount: 1 },
          starting: '2024-01-01',
          directive: 'template',
          priority: 1,
        },
      ],
      [cat2.id]: [
        {
          type: 'periodic',
          amount: 100,
          period: { period: 'month', amount: 1 },
          starting: '2024-01-01',
          directive: 'template',
          priority: 2,
        },
      ],
    });

    await applyMultipleCategoryTemplates({
      month: '2024-01',
      categoryIds: [cat1.id, cat2.id],
    });

    const budgetCalls = vi
      .mocked(actions.setBudget)
      .mock.calls.map(call => call[0]);
    const cat1Amount = Number(
      budgetCalls.find(c => c.category === cat1.id)?.amount ?? 0,
    );
    const cat2Amount = Number(
      budgetCalls.find(c => c.category === cat2.id)?.amount ?? 0,
    );
    expect(cat1Amount).toBe(10000);
    expect(cat2Amount).toBe(5000);
    expect(cat1Amount + cat2Amount).toBe(15000);
  });

  it('returns an error notification when a template fails validation', async () => {
    setupSheetMock({ 'to-budget': 100000 });
    setupAqlMultiCategory([cat1], {
      [cat1.id]: [
        {
          type: 'by',
          amount: 1200,
          month: '2023-12',
          annual: false,
          directive: 'template',
          priority: 1,
        },
      ],
    });

    const result = await applyMultipleCategoryTemplates({
      month: '2024-06',
      categoryIds: [cat1.id],
    });

    expect(result.message).toMatch(/There were errors/);
    expect(result.pre).toMatch(/Target month has passed/);
    expect(actions.setBudget).not.toHaveBeenCalled();
  });

  it('resets goal_def for orphan categories whose templates were removed', async () => {
    // Category had a stored goal but no current template — the goal must
    // be cleared so the sidebar marker disappears.
    setupSheetMock({
      'to-budget': 0,
      'budget-cat-1': 5000,
      'goal-cat-1': 12345,
    });
    setupAqlMultiCategory([cat1], {});

    const result = await applyMultipleCategoryTemplates({
      month: '2024-01',
      categoryIds: [cat1.id],
    });

    expect(result.message).toBe('Everything is up to date');
    const goalCalls = vi.mocked(actions.setGoal).mock.calls.map(c => c[0]);
    expect(goalCalls).toContainEqual(
      expect.objectContaining({ category: cat1.id, goal: null }),
    );
  });

  it('distributes remainder funds across categories by weight', async () => {
    // Weights 3 and 1; $200 split 75% / 25%.
    setupSheetMock({ 'to-budget': 20000 });
    setupAqlMultiCategory([cat1, cat2], {
      [cat1.id]: [
        {
          type: 'remainder',
          weight: 3,
          directive: 'template',
          priority: null,
        },
      ],
      [cat2.id]: [
        {
          type: 'remainder',
          weight: 1,
          directive: 'template',
          priority: null,
        },
      ],
    });

    await applyMultipleCategoryTemplates({
      month: '2024-01',
      categoryIds: [cat1.id, cat2.id],
    });

    const budgetCalls = vi
      .mocked(actions.setBudget)
      .mock.calls.map(call => call[0]);
    const cat1Amount = Number(
      budgetCalls.find(c => c.category === cat1.id)?.amount ?? 0,
    );
    const cat2Amount = Number(
      budgetCalls.find(c => c.category === cat2.id)?.amount ?? 0,
    );
    expect(cat1Amount).toBe(15000);
    expect(cat2Amount).toBe(5000);
    expect(cat1Amount + cat2Amount).toBe(20000);
  });
});

describe('applyTemplate (force=false)', () => {
  const cat1: CategoryEntity = {
    id: 'cat-1',
    name: 'Groceries',
    group: 'g1',
    is_income: false,
  };
  const cat2: CategoryEntity = {
    id: 'cat-2',
    name: 'Rent',
    group: 'g1',
    is_income: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(statements.getActiveSchedules).mockResolvedValue(
      [] as Awaited<ReturnType<typeof statements.getActiveSchedules>>,
    );
    vi.mocked(db.getCategories).mockResolvedValue([] as DbCategory[]);
  });

  it('skips categories that already have a non-zero budget', async () => {
    // cat1 starts unbudgeted → gets templated. cat2 already has $50
    // budgeted → must be left alone, since force=false is the
    // "fill in the blanks" semantic.
    setupSheetMock({
      'to-budget': 100000,
      'budget-cat-1': 0,
      'budget-cat-2': 5000,
    });
    setupAqlForWideScope(
      [
        {
          category: cat1,
          templates: [
            {
              type: 'periodic',
              amount: 100,
              period: { period: 'month', amount: 1 },
              starting: '2024-01-01',
              directive: 'template',
              priority: 1,
            },
          ],
        },
        {
          category: cat2,
          templates: [
            {
              type: 'periodic',
              amount: 200,
              period: { period: 'month', amount: 1 },
              starting: '2024-01-01',
              directive: 'template',
              priority: 1,
            },
          ],
        },
      ],
      [cat1, cat2],
    );

    await applyTemplate({ month: '2024-01' });

    const budgetCalls = vi
      .mocked(actions.setBudget)
      .mock.calls.map(call => call[0]);
    expect(budgetCalls.map(c => c.category)).toEqual([cat1.id]);
    expect(budgetCalls[0].amount).toBe(10000);
  });
});
