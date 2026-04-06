import * as api from '@actual-app/api';
import type { Command } from 'commander';

import { withConnection } from '../connection';
import { printOutput } from '../output';
import { parseBoolFlag } from '../utils';

export function registerCategoriesCommand(program: Command) {
  const categories = program
    .command('categories')
    .description('Manage categories');

  categories
    .command('list')
    .description('List all categories')
    .action(async () => {
      const opts = program.opts();
      await withConnection(opts, async () => {
        const result = await api.getCategories();
        printOutput(result, opts.format);
      });
    });

  categories
    .command('create')
    .description('Create a new category')
    .requiredOption('--name <name>', 'Category name')
    .requiredOption('--group-id <id>', 'Category group ID')
    .option('--is-income', 'Mark as income category', false)
    .action(async cmdOpts => {
      const opts = program.opts();
      await withConnection(opts, async () => {
        const id = await api.createCategory({
          name: cmdOpts.name,
          group_id: cmdOpts.groupId,
          is_income: cmdOpts.isIncome,
          hidden: false,
        });
        printOutput({ id }, opts.format);
      });
    });

  categories
    .command('update <id>')
    .description('Update a category')
    .option('--name <name>', 'New category name')
    .option('--hidden <bool>', 'Set hidden status')
    .action(async (id: string, cmdOpts) => {
      const fields: Record<string, unknown> = {};
      if (cmdOpts.name !== undefined) fields.name = cmdOpts.name;
      if (cmdOpts.hidden !== undefined) {
        fields.hidden = parseBoolFlag(cmdOpts.hidden, '--hidden');
      }
      if (Object.keys(fields).length === 0) {
        throw new Error('No update fields provided. Use --name or --hidden.');
      }
      const opts = program.opts();
      await withConnection(opts, async () => {
        await api.updateCategory(id, fields);
        printOutput({ success: true, id }, opts.format);
      });
    });

  categories
    .command('delete <id>')
    .description('Delete a category')
    .option('--transfer-to <id>', 'Transfer transactions to this category')
    .action(async (id: string, cmdOpts) => {
      const opts = program.opts();
      await withConnection(opts, async () => {
        await api.deleteCategory(id, cmdOpts.transferTo);
        printOutput({ success: true, id }, opts.format);
      });
    });
}
