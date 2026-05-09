import * as api from '@actual-app/api';
import { Command } from 'commander';

import { printOutput } from '#output';

import { registerCategoriesCommand } from './categories';
import { registerCategoryGroupsCommand } from './category-groups';

vi.mock('@actual-app/api', () => ({
  getCategories: vi.fn().mockResolvedValue([]),
  createCategory: vi.fn().mockResolvedValue('new-id'),
  updateCategory: vi.fn().mockResolvedValue(undefined),
  deleteCategory: vi.fn().mockResolvedValue(undefined),
  getCategoryGroups: vi.fn().mockResolvedValue([]),
  createCategoryGroup: vi.fn().mockResolvedValue('new-group-id'),
  updateCategoryGroup: vi.fn().mockResolvedValue(undefined),
  deleteCategoryGroup: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('#connection', () => ({
  withConnection: vi.fn((_opts, fn) => fn()),
}));

vi.mock('#output', () => ({
  printOutput: vi.fn(),
}));

function createProgram(): Command {
  const program = new Command();
  program.option('--format <format>');
  program.option('--server-url <url>');
  program.option('--password <pw>');
  program.option('--session-token <token>');
  program.option('--sync-id <id>');
  program.option('--data-dir <dir>');
  program.option('--verbose');
  program.exitOverride();
  registerCategoriesCommand(program);
  registerCategoryGroupsCommand(program);
  return program;
}

async function run(args: string[]) {
  const program = createProgram();
  await program.parseAsync(['node', 'test', ...args]);
}

describe('categories commands', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    stderrSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    stdoutSpy.mockRestore();
  });

  describe('categories list', () => {
    it('filters out hidden categories by default', async () => {
      vi.mocked(api.getCategories).mockResolvedValue([
        { id: '1', name: 'Visible', group_id: 'g1', hidden: false },
        { id: '2', name: 'Hidden', group_id: 'g1', hidden: true },
      ]);

      await run(['categories', 'list']);

      expect(printOutput).toHaveBeenCalledWith(
        [{ id: '1', name: 'Visible', group_id: 'g1', hidden: false }],
        undefined,
      );
    });

    it('includes hidden categories when --include-hidden is passed', async () => {
      vi.mocked(api.getCategories).mockResolvedValue([
        { id: '1', name: 'Visible', group_id: 'g1', hidden: false },
        { id: '2', name: 'Hidden', group_id: 'g1', hidden: true },
      ]);

      await run(['categories', 'list', '--include-hidden']);

      expect(printOutput).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: '2', hidden: true }),
        ]),
        undefined,
      );
    });

    it('passes format option to printOutput', async () => {
      vi.mocked(api.getCategories).mockResolvedValue([]);

      await run(['--format', 'csv', 'categories', 'list']);

      expect(printOutput).toHaveBeenCalledWith([], 'csv');
    });
  });

  describe('category-groups list', () => {
    it('filters out hidden groups and hidden child categories by default', async () => {
      vi.mocked(api.getCategoryGroups).mockResolvedValue([
        {
          id: 'g1',
          name: 'Visible Group',
          is_income: false,
          hidden: false,
          categories: [
            { id: 'c1', name: 'Visible Cat', group_id: 'g1', hidden: false },
            { id: 'c2', name: 'Hidden Cat', group_id: 'g1', hidden: true },
          ],
        },
        {
          id: 'g2',
          name: 'Hidden Group',
          is_income: false,
          hidden: true,
          categories: [],
        },
      ]);

      await run(['category-groups', 'list']);

      expect(printOutput).toHaveBeenCalledWith(
        [
          {
            id: 'g1',
            name: 'Visible Group',
            is_income: false,
            hidden: false,
            categories: [
              { id: 'c1', name: 'Visible Cat', group_id: 'g1', hidden: false },
            ],
          },
        ],
        undefined,
      );
    });

    it('includes hidden groups and categories when --include-hidden is passed', async () => {
      vi.mocked(api.getCategoryGroups).mockResolvedValue([
        {
          id: 'g1',
          name: 'Visible Group',
          is_income: false,
          hidden: false,
          categories: [
            { id: 'c2', name: 'Hidden Cat', group_id: 'g1', hidden: true },
          ],
        },
        {
          id: 'g2',
          name: 'Hidden Group',
          is_income: false,
          hidden: true,
          categories: [],
        },
      ]);

      await run(['category-groups', 'list', '--include-hidden']);

      const output = vi.mocked(printOutput).mock.calls[0][0] as Array<{
        id: string;
      }>;
      expect(output).toHaveLength(2);
      expect(output.map(g => g.id)).toEqual(['g1', 'g2']);
    });
  });
});
