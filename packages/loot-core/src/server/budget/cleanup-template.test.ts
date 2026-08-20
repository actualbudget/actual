import { vi } from 'vitest';

import * as db from '#server/db';
import type { CleanupTemplate } from '#types/models/cleanup-templates';

import * as actions from './actions';
import { cleanupTemplate } from './cleanup-template';

vi.mock('./actions', () => ({
  getSheetValue: vi.fn(),
  setBudget: vi.fn(),
  setGoal: vi.fn(),
}));

vi.mock('#server/db', () => ({
  all: vi.fn(),
  first: vi.fn(),
}));

vi.mock('./cleanup-template-notes', () => ({
  storeNoteCleanups: vi.fn(),
}));

const MONTH = '2026-08';
const GROUP_ID = 'pool-1';

type TestCategory = {
  id: string;
  name: string;
  cleanup_def: CleanupTemplate[];
};

function setup({
  categories,
  sheetValues,
}: {
  categories: TestCategory[];
  sheetValues: Record<string, number>;
}) {
  vi.mocked(db.all).mockImplementation(async (sql: string) => {
    if (sql.includes('cleanup_groups')) {
      return [{ id: GROUP_ID, name: 'Something' }];
    }
    return categories.map(c => ({
      id: c.id,
      name: c.name,
      is_income: 0,
      cleanup_def: JSON.stringify(c.cleanup_def),
    }));
  });
  // No carryover rows, so overspending never rolls over in these tests.
  vi.mocked(db.first).mockResolvedValue(null);
  vi.mocked(actions.getSheetValue).mockImplementation(
    async (_sheet: string, key: string) => sheetValues[key] ?? 0,
  );
}

function budgetedFor(categoryId: string) {
  return vi
    .mocked(actions.setBudget)
    .mock.calls.map(([args]) => args)
    .filter(args => args.category === categoryId);
}

describe('cleanupTemplate - named pool sources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('does not drain a source whose balance is negative', async () => {
    setup({
      categories: [
        {
          id: 'cat-1',
          name: 'Category 1',
          cleanup_def: [{ role: 'sink', groupId: GROUP_ID, weight: 1 }],
        },
        {
          id: 'cat-2',
          name: 'Category 2',
          cleanup_def: [{ role: 'source', groupId: GROUP_ID }],
        },
      ],
      sheetValues: {
        'leftover-cat-1': -1500,
        'budget-cat-1': 6000,
        // Category 2 overspent, so it has nothing to send to the pool.
        'leftover-cat-2': -1000,
        'budget-cat-2': 5000,
        'to-budget': 0,
      },
    });

    await cleanupTemplate({ month: MONTH });

    // Draining the source budgets `budgeted - balance`, which for a negative
    // balance credits the category instead of taking from it (5000 - -1000).
    expect(budgetedFor('cat-2')).not.toContainEqual(
      expect.objectContaining({ amount: 6000 }),
    );
  });

  test('warns that the overspent source has no available funds', async () => {
    setup({
      categories: [
        {
          id: 'cat-1',
          name: 'Category 1',
          cleanup_def: [{ role: 'sink', groupId: GROUP_ID, weight: 1 }],
        },
        {
          id: 'cat-2',
          name: 'Category 2',
          cleanup_def: [{ role: 'source', groupId: GROUP_ID }],
        },
      ],
      sheetValues: {
        'leftover-cat-1': -1500,
        'budget-cat-1': 6000,
        'leftover-cat-2': -1000,
        'budget-cat-2': 5000,
        'to-budget': 0,
      },
    });

    const result = await cleanupTemplate({ month: MONTH });

    expect(result.message).toBe('cleanup-no-funds');
    expect(result.pre ?? '').toContain(
      'Category 2 does not have available funds.',
    );
  });

  test('still drains a source that has positive leftover funds', async () => {
    setup({
      categories: [
        {
          id: 'cat-1',
          name: 'Category 1',
          cleanup_def: [{ role: 'sink', groupId: GROUP_ID, weight: 1 }],
        },
        {
          id: 'cat-2',
          name: 'Category 2',
          cleanup_def: [{ role: 'source', groupId: GROUP_ID }],
        },
      ],
      sheetValues: {
        'leftover-cat-1': 0,
        'budget-cat-1': 6000,
        'leftover-cat-2': 1000,
        'budget-cat-2': 5000,
        'to-budget': 0,
      },
    });

    const result = await cleanupTemplate({ month: MONTH });

    // The source gives up its leftover: 5000 - 1000.
    expect(budgetedFor('cat-2')).toContainEqual(
      expect.objectContaining({ amount: 4000 }),
    );
    expect(result.pre ?? '').not.toContain(
      'Category 2 does not have available funds.',
    );
  });
});
