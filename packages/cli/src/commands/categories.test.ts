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
    it('asks the API to exclude hidden categories by default', async () => {
      await run(['categories', 'list']);

      expect(api.getCategories).toHaveBeenCalledWith({ hidden: false });
    });

    it('asks the API for all categories when --include-hidden is passed', async () => {
      await run(['categories', 'list', '--include-hidden']);

      expect(api.getCategories).toHaveBeenCalledWith({});
    });

    it('prints whatever the API returns', async () => {
      const visible = {
        id: '1',
        name: 'Visible',
        group_id: 'g1',
        hidden: false,
      };
      vi.mocked(api.getCategories).mockResolvedValue([visible]);

      await run(['categories', 'list']);

      expect(printOutput).toHaveBeenCalledWith([visible], undefined);
    });

    it('passes format option to printOutput', async () => {
      vi.mocked(api.getCategories).mockResolvedValue([]);

      await run(['--format', 'csv', 'categories', 'list']);

      expect(printOutput).toHaveBeenCalledWith([], 'csv');
    });
  });

  describe('category-groups list', () => {
    it('asks the API to exclude hidden groups by default', async () => {
      await run(['category-groups', 'list']);

      expect(api.getCategoryGroups).toHaveBeenCalledWith({ hidden: false });
    });

    it('asks the API for all groups when --include-hidden is passed', async () => {
      await run(['category-groups', 'list', '--include-hidden']);

      expect(api.getCategoryGroups).toHaveBeenCalledWith({});
    });

    it('prints whatever the API returns', async () => {
      const group = {
        id: 'g1',
        name: 'Group',
        is_income: false,
        hidden: false,
        categories: [{ id: 'c1', name: 'Cat', group_id: 'g1', hidden: false }],
      };
      vi.mocked(api.getCategoryGroups).mockResolvedValue([group]);

      await run(['category-groups', 'list']);

      expect(printOutput).toHaveBeenCalledWith([group], undefined);
    });
  });
});
