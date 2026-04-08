import * as api from '@actual-app/api';
import type { Command } from 'commander';

import { resolveConfig } from '../config';
import { withConnection } from '../connection';
import { printOutput } from '../output';
import { parseBoolFlag, parseIntFlag } from '../utils';

export function registerBudgetsCommand(program: Command) {
  const budgets = program.command('budgets').description('Manage budgets');

  budgets
    .command('list')
    .description('List all available budgets')
    .action(async () => {
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          const result = await api.getBudgets();
          printOutput(result, opts.format);
        },
        { loadBudget: false },
      );
    });

  budgets
    .command('download <syncId>')
    .description('Download a budget by sync ID')
    .option('--encryption-password <password>', 'Encryption password')
    .action(async (syncId: string, cmdOpts) => {
      const opts = program.opts();
      const config = await resolveConfig(opts);
      const password = config.encryptionPassword ?? cmdOpts.encryptionPassword;
      await withConnection(
        opts,
        async () => {
          await api.downloadBudget(syncId, {
            password,
          });
          printOutput({ success: true, syncId }, opts.format);
        },
        { loadBudget: false },
      );
    });

  budgets
    .command('sync')
    .description('Sync the current budget')
    .action(async () => {
      const opts = program.opts();
      await withConnection(opts, async () => {
        await api.sync();
        printOutput({ success: true }, opts.format);
      });
    });

  budgets
    .command('months')
    .description('List available budget months')
    .action(async () => {
      const opts = program.opts();
      await withConnection(opts, async () => {
        const result = await api.getBudgetMonths();
        printOutput(result, opts.format);
      });
    });

  budgets
    .command('month <month>')
    .description('Get budget data for a specific month (YYYY-MM)')
    .action(async (month: string) => {
      const opts = program.opts();
      await withConnection(opts, async () => {
        const result = await api.getBudgetMonth(month);
        printOutput(result, opts.format);
      });
    });

  budgets
    .command('set-amount')
    .description('Set budget amount for a category in a month')
    .requiredOption('--month <month>', 'Budget month (YYYY-MM)')
    .requiredOption('--category <id>', 'Category ID')
    .requiredOption(
      '--amount <amount>',
      'Amount in cents (e.g. 50000 = 500.00)',
    )
    .action(async cmdOpts => {
      const amount = parseIntFlag(cmdOpts.amount, '--amount');
      const opts = program.opts();
      await withConnection(opts, async () => {
        await api.setBudgetAmount(cmdOpts.month, cmdOpts.category, amount);
        printOutput({ success: true }, opts.format);
      });
    });

  budgets
    .command('set-carryover')
    .description('Enable/disable carryover for a category')
    .requiredOption('--month <month>', 'Budget month (YYYY-MM)')
    .requiredOption('--category <id>', 'Category ID')
    .requiredOption('--flag <bool>', 'Enable (true) or disable (false)')
    .action(async cmdOpts => {
      const flag = parseBoolFlag(cmdOpts.flag, '--flag');
      const opts = program.opts();
      await withConnection(opts, async () => {
        await api.setBudgetCarryover(cmdOpts.month, cmdOpts.category, flag);
        printOutput({ success: true }, opts.format);
      });
    });

  budgets
    .command('hold-next-month')
    .description('Hold budget amount for next month')
    .requiredOption('--month <month>', 'Budget month (YYYY-MM)')
    .requiredOption(
      '--amount <amount>',
      'Amount in cents (e.g. 50000 = 500.00)',
    )
    .action(async cmdOpts => {
      const parsedAmount = parseIntFlag(cmdOpts.amount, '--amount');
      const opts = program.opts();
      await withConnection(opts, async () => {
        await api.holdBudgetForNextMonth(cmdOpts.month, parsedAmount);
        printOutput({ success: true }, opts.format);
      });
    });

  budgets
    .command('reset-hold')
    .description('Reset budget hold for a month')
    .requiredOption('--month <month>', 'Budget month (YYYY-MM)')
    .action(async cmdOpts => {
      const opts = program.opts();
      await withConnection(opts, async () => {
        await api.resetBudgetHold(cmdOpts.month);
        printOutput({ success: true }, opts.format);
      });
    });
}
