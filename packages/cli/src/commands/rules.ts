import * as api from '@actual-app/api';
import type { Command } from 'commander';

import { withConnection } from '#connection';
import { readJsonInput } from '#input';
import { printOutput } from '#output';

export function registerRulesCommand(program: Command) {
  const rules = program
    .command('rules')
    .description('Manage transaction rules');

  rules
    .command('list')
    .description('List all rules')
    .action(async () => {
      const opts = program.opts();
      await withConnection(opts, async () => {
        const result = await api.getRules();
        printOutput(result, opts.format);
      });
    });

  rules
    .command('payee-rules <payeeId>')
    .description('List rules for a specific payee')
    .action(async (payeeId: string) => {
      const opts = program.opts();
      await withConnection(opts, async () => {
        const result = await api.getPayeeRules(payeeId);
        printOutput(result, opts.format);
      });
    });

  rules
    .command('create')
    .description('Create a new rule')
    .option('--data <json>', 'Rule definition as JSON')
    .option('--file <path>', 'Read rule from JSON file (use - for stdin)')
    .action(async cmdOpts => {
      const opts = program.opts();
      await withConnection(opts, async () => {
        const rule = readJsonInput(cmdOpts) as Parameters<
          typeof api.createRule
        >[0];
        const id = await api.createRule(rule);
        printOutput({ id }, opts.format);
      });
    });

  rules
    .command('update')
    .description('Update a rule')
    .option('--data <json>', 'Rule data as JSON (must include id)')
    .option('--file <path>', 'Read rule from JSON file (use - for stdin)')
    .action(async cmdOpts => {
      const opts = program.opts();
      await withConnection(opts, async () => {
        const rule = readJsonInput(cmdOpts) as Parameters<
          typeof api.updateRule
        >[0];
        await api.updateRule(rule);
        printOutput({ success: true }, opts.format);
      });
    });

  rules
    .command('delete <id>')
    .description('Delete a rule')
    .action(async (id: string) => {
      const opts = program.opts();
      await withConnection(opts, async () => {
        await api.deleteRule(id);
        printOutput({ success: true, id }, opts.format);
      });
    });
}
