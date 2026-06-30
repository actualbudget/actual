import { Command, Option } from 'commander';

import { registerAccountsCommand } from './commands/accounts';
import { registerBudgetsCommand } from './commands/budgets';
import { registerCategoriesCommand } from './commands/categories';
import { registerCategoryGroupsCommand } from './commands/category-groups';
import { registerPayeesCommand } from './commands/payees';
import { registerQueryCommand } from './commands/query';
import { registerRulesCommand } from './commands/rules';
import { registerSchedulesCommand } from './commands/schedules';
import { registerServerCommand } from './commands/server';
import { registerSyncCommand } from './commands/sync';
import { registerTagsCommand } from './commands/tags';
import { registerTransactionsCommand } from './commands/transactions';
import { parseNonNegativeIntFlag } from './utils';

declare const __CLI_VERSION__: string;

const program = new Command();

program
  .name('actual')
  .description('CLI for Actual Budget')
  .version(__CLI_VERSION__)
  .option('--server-url <url>', 'Actual server URL (env: ACTUAL_SERVER_URL)')
  .option('--password <password>', 'Server password (env: ACTUAL_PASSWORD)')
  .option(
    '--session-token <token>',
    'Session token (env: ACTUAL_SESSION_TOKEN)',
  )
  .option('--sync-id <id>', 'Budget sync ID (env: ACTUAL_SYNC_ID)')
  .option('--data-dir <path>', 'Data directory (env: ACTUAL_DATA_DIR)')
  .option(
    '--encryption-password <password>',
    'E2E encryption password (env: ACTUAL_ENCRYPTION_PASSWORD)',
  )
  .option(
    '--cache-ttl <seconds>',
    'Cache TTL in seconds (env: ACTUAL_CACHE_TTL; default: 60)',
    value => parseNonNegativeIntFlag(value, '--cache-ttl'),
  )
  .option('--refresh', 'Force a sync on this call, ignoring the cache', false)
  .option('--no-cache', 'Alias for --refresh')
  .option(
    '--lock-timeout <seconds>',
    'How long to wait for another CLI process to release the lock (env: ACTUAL_LOCK_TIMEOUT; default: 10)',
    value => parseNonNegativeIntFlag(value, '--lock-timeout'),
  )
  .option(
    '--no-lock',
    'Disable the budget directory lock (use with care, env: ACTUAL_NO_LOCK)',
  )
  .addOption(
    new Option('--format <format>', 'Output format: json, table, csv')
      .choices(['json', 'table', 'csv'] as const)
      .default('json'),
  )
  .option('--verbose', 'Show informational messages', false);

registerAccountsCommand(program);
registerBudgetsCommand(program);
registerCategoriesCommand(program);
registerCategoryGroupsCommand(program);
registerTransactionsCommand(program);
registerPayeesCommand(program);
registerTagsCommand(program);
registerRulesCommand(program);
registerSchedulesCommand(program);
registerQueryCommand(program);
registerServerCommand(program);
registerSyncCommand(program);

function normalizeThrownMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null) {
    try {
      return JSON.stringify(err);
    } catch {
      return '<non-serializable error>';
    }
  }
  return String(err);
}

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = normalizeThrownMessage(err);
  process.stderr.write(`Error: ${message}\n`);
  process.exitCode = 1;
});
