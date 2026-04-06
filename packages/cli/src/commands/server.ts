import * as api from '@actual-app/api';
import { Option } from 'commander';
import type { Command } from 'commander';

import { withConnection } from '../connection';
import { printOutput } from '../output';

export function registerServerCommand(program: Command) {
  const server = program.command('server').description('Server utilities');

  server
    .command('version')
    .description('Get server version')
    .action(async () => {
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          const version = await api.getServerVersion();
          printOutput({ version }, opts.format);
        },
        { loadBudget: false },
      );
    });

  server
    .command('get-id')
    .description('Get entity ID by name')
    .addOption(
      new Option('--type <type>', 'Entity type')
        .choices(['accounts', 'categories', 'payees', 'schedules'])
        .makeOptionMandatory(),
    )
    .requiredOption('--name <name>', 'Entity name')
    .action(async cmdOpts => {
      const opts = program.opts();
      await withConnection(opts, async () => {
        const id = await api.getIDByName(cmdOpts.type, cmdOpts.name);
        printOutput(
          { id, type: cmdOpts.type, name: cmdOpts.name },
          opts.format,
        );
      });
    });

  server
    .command('bank-sync')
    .description('Run bank synchronization')
    .option('--account <id>', 'Specific account ID to sync')
    .action(async cmdOpts => {
      const opts = program.opts();
      await withConnection(opts, async () => {
        const args = cmdOpts.account
          ? { accountId: cmdOpts.account }
          : undefined;
        await api.runBankSync(args);
        printOutput({ success: true }, opts.format);
      });
    });
}
