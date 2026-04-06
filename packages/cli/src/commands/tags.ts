import * as api from '@actual-app/api';
import type { Command } from 'commander';

import { withConnection } from '../connection';
import { printOutput } from '../output';

export function registerTagsCommand(program: Command) {
  const tags = program.command('tags').description('Manage tags');

  tags
    .command('list')
    .description('List all tags')
    .action(async () => {
      const opts = program.opts();
      await withConnection(opts, async () => {
        const result = await api.getTags();
        printOutput(result, opts.format);
      });
    });

  tags
    .command('create')
    .description('Create a new tag')
    .requiredOption('--tag <tag>', 'Tag name')
    .option('--color <color>', 'Tag color')
    .option('--description <description>', 'Tag description')
    .action(async cmdOpts => {
      const opts = program.opts();
      await withConnection(opts, async () => {
        const id = await api.createTag({
          tag: cmdOpts.tag,
          color: cmdOpts.color,
          description: cmdOpts.description,
        });
        printOutput({ id }, opts.format);
      });
    });

  tags
    .command('update <id>')
    .description('Update a tag')
    .option('--tag <tag>', 'New tag name')
    .option('--color <color>', 'New tag color')
    .option('--description <description>', 'New tag description')
    .action(async (id: string, cmdOpts) => {
      const fields: Record<string, unknown> = {};
      if (cmdOpts.tag !== undefined) fields.tag = cmdOpts.tag;
      if (cmdOpts.color !== undefined) fields.color = cmdOpts.color;
      if (cmdOpts.description !== undefined) {
        fields.description = cmdOpts.description;
      }
      if (Object.keys(fields).length === 0) {
        throw new Error(
          'At least one of --tag, --color, or --description is required',
        );
      }
      const opts = program.opts();
      await withConnection(opts, async () => {
        await api.updateTag(id, fields);
        printOutput({ success: true, id }, opts.format);
      });
    });

  tags
    .command('delete <id>')
    .description('Delete a tag')
    .action(async (id: string) => {
      const opts = program.opts();
      await withConnection(opts, async () => {
        await api.deleteTag(id);
        printOutput({ success: true, id }, opts.format);
      });
    });
}
