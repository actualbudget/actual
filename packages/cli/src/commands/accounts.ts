import * as api from '@actual-app/api';
import type { Command } from 'commander';

import { withConnection } from '#connection';
import { printOutput } from '#output';
import { parseBoolFlag, parseIntFlag } from '#utils';

export function registerAccountsCommand(program: Command) {
  const accounts = program.command('accounts').description('Manage accounts');

  accounts
    .command('list')
    .description('List all accounts')
    .option('--include-closed', 'Include closed accounts', false)
    .action(async cmdOpts => {
      const opts = program.opts();
      await withConnection(opts, async () => {
        const allAccounts = await api.getAccounts();
        const accounts = allAccounts.filter(
          a => cmdOpts.includeClosed || !a.closed,
        );
        // Stable sort: on-budget first, off-budget second
        // (preserves API sort_order within each group)
        accounts.sort((a, b) => Number(a.offbudget) - Number(b.offbudget));
        const balances = await Promise.all(
          accounts.map(a => api.getAccountBalance(a.id)),
        );
        const output = accounts.map((a, i) => ({
          id: a.id,
          name: a.name,
          offbudget: a.offbudget,
          closed: a.closed,
          balance: balances[i],
        }));
        printOutput(output, opts.format);
      });
    });

  accounts
    .command('create')
    .description('Create a new account')
    .requiredOption('--name <name>', 'Account name')
    .option('--offbudget', 'Create as off-budget account', false)
    .option(
      '--balance <amount>',
      'Initial balance in cents (e.g. 50000 = 500.00)',
      '0',
    )
    .action(async cmdOpts => {
      const balance = parseIntFlag(cmdOpts.balance, '--balance');
      const opts = program.opts();
      await withConnection(opts, async () => {
        const id = await api.createAccount(
          { name: cmdOpts.name, offbudget: cmdOpts.offbudget },
          balance,
        );
        printOutput({ id }, opts.format);
      });
    });

  accounts
    .command('update <id>')
    .description('Update an account')
    .option('--name <name>', 'New account name')
    .option('--offbudget <bool>', 'Set off-budget status')
    .action(async (id: string, cmdOpts) => {
      const opts = program.opts();
      const fields: Record<string, unknown> = {};
      if (cmdOpts.name !== undefined) {
        const trimmed = cmdOpts.name.trim();
        if (trimmed === '') {
          throw new Error('Invalid --name: must be a non-empty string.');
        }
        fields.name = trimmed;
      }
      if (cmdOpts.offbudget !== undefined) {
        fields.offbudget = parseBoolFlag(cmdOpts.offbudget, '--offbudget');
      }
      if (Object.keys(fields).length === 0) {
        throw new Error(
          'No update fields provided. Use --name or --offbudget.',
        );
      }
      await withConnection(opts, async () => {
        await api.updateAccount(id, fields);
        printOutput({ success: true, id }, opts.format);
      });
    });

  accounts
    .command('close <id>')
    .description('Close an account')
    .option(
      '--transfer-account <id>',
      'Transfer remaining balance to this account',
    )
    .option(
      '--transfer-category <id>',
      'Transfer remaining balance to this category',
    )
    .action(async (id: string, cmdOpts) => {
      const opts = program.opts();
      await withConnection(opts, async () => {
        await api.closeAccount(
          id,
          cmdOpts.transferAccount,
          cmdOpts.transferCategory,
        );
        printOutput({ success: true, id }, opts.format);
      });
    });

  accounts
    .command('reopen <id>')
    .description('Reopen a closed account')
    .action(async (id: string) => {
      const opts = program.opts();
      await withConnection(opts, async () => {
        await api.reopenAccount(id);
        printOutput({ success: true, id }, opts.format);
      });
    });

  accounts
    .command('delete <id>')
    .description('Delete an account')
    .action(async (id: string) => {
      const opts = program.opts();
      await withConnection(opts, async () => {
        await api.deleteAccount(id);
        printOutput({ success: true, id }, opts.format);
      });
    });

  accounts
    .command('balance <id>')
    .description('Get account balance')
    .option('--cutoff <date>', 'Cutoff date (YYYY-MM-DD)')
    .action(async (id: string, cmdOpts) => {
      let cutoff: Date | undefined;
      if (cmdOpts.cutoff) {
        const cutoffDate = new Date(cmdOpts.cutoff);
        if (Number.isNaN(cutoffDate.getTime())) {
          throw new Error(
            'Invalid cutoff date: expected a valid date (e.g. YYYY-MM-DD).',
          );
        }
        cutoff = cutoffDate;
      }
      const opts = program.opts();
      await withConnection(opts, async () => {
        const balance = await api.getAccountBalance(id, cutoff);
        printOutput({ id, balance }, opts.format);
      });
    });
}
