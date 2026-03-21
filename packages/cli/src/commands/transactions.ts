import * as api from '@actual-app/api';
import type { Command } from 'commander';

import { withConnection } from '../connection';
import { readJsonInput } from '../input';
import { printOutput } from '../output';

export function registerTransactionsCommand(program: Command) {
  const transactions = program
    .command('transactions')
    .description('Manage transactions');

  transactions
    .command('list')
    .description('List transactions for an account')
    .requiredOption('--account <id>', 'Account ID')
    .requiredOption('--start <date>', 'Start date (YYYY-MM-DD)')
    .requiredOption('--end <date>', 'End date (YYYY-MM-DD)')
    .action(async cmdOpts => {
      const opts = program.opts();
      await withConnection(opts, async () => {
        const result = await api.getTransactions(
          cmdOpts.account,
          cmdOpts.start,
          cmdOpts.end,
        );
        printOutput(result, opts.format);
      });
    });

  transactions
    .command('add')
    .description('Add transactions to an account')
    .requiredOption('--account <id>', 'Account ID')
    .option('--data <json>', 'Transaction data as JSON array')
    .option(
      '--file <path>',
      'Read transaction data from JSON file (use - for stdin)',
    )
    .option('--learn-categories', 'Learn category assignments', false)
    .option('--run-transfers', 'Process transfers', false)
    .action(async cmdOpts => {
      const opts = program.opts();
      await withConnection(opts, async () => {
        const transactions = readJsonInput(cmdOpts) as Parameters<
          typeof api.addTransactions
        >[1];
        const result = await api.addTransactions(
          cmdOpts.account,
          transactions,
          {
            learnCategories: cmdOpts.learnCategories,
            runTransfers: cmdOpts.runTransfers,
          },
        );
        printOutput(result, opts.format);
      });
    });

  transactions
    .command('import')
    .description('Import transactions to an account')
    .requiredOption('--account <id>', 'Account ID')
    .option('--data <json>', 'Transaction data as JSON array')
    .option(
      '--file <path>',
      'Read transaction data from JSON file (use - for stdin)',
    )
    .option('--dry-run', 'Preview without importing', false)
    .action(async cmdOpts => {
      const opts = program.opts();
      await withConnection(opts, async () => {
        const transactions = readJsonInput(cmdOpts) as Parameters<
          typeof api.importTransactions
        >[1];
        const result = await api.importTransactions(
          cmdOpts.account,
          transactions,
          {
            defaultCleared: true,
            dryRun: cmdOpts.dryRun,
          },
        );
        printOutput(result, opts.format);
      });
    });

  transactions
    .command('update <id>')
    .description('Update a transaction')
    .option('--data <json>', 'Fields to update as JSON')
    .option('--file <path>', 'Read fields from JSON file (use - for stdin)')
    .action(async (id: string, cmdOpts) => {
      const opts = program.opts();
      await withConnection(opts, async () => {
        const fields = readJsonInput(cmdOpts) as Parameters<
          typeof api.updateTransaction
        >[1];
        await api.updateTransaction(id, fields);
        printOutput({ success: true, id }, opts.format);
      });
    });

  transactions
    .command('delete <id>')
    .description('Delete a transaction')
    .action(async (id: string) => {
      const opts = program.opts();
      await withConnection(opts, async () => {
        await api.deleteTransaction(id);
        printOutput({ success: true, id }, opts.format);
      });
    });
}
