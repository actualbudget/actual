import * as api from '@actual-app/api';
import type { Command } from 'commander';

import { withConnection } from '#connection';
import { readJsonInput } from '#input';
import { printOutput } from '#output';

export function registerSchedulesCommand(program: Command) {
  const schedules = program
    .command('schedules')
    .description('Manage scheduled transactions');

  schedules
    .command('list')
    .description('List all schedules')
    .action(async () => {
      const opts = program.opts();
      await withConnection(opts, async () => {
        const result = await api.getSchedules();
        printOutput(result, opts.format);
      });
    });

  schedules
    .command('create')
    .description('Create a new schedule')
    .option('--data <json>', 'Schedule definition as JSON')
    .option('--file <path>', 'Read schedule from JSON file (use - for stdin)')
    .action(async cmdOpts => {
      const opts = program.opts();
      await withConnection(opts, async () => {
        const schedule = readJsonInput(cmdOpts) as Parameters<
          typeof api.createSchedule
        >[0];
        const id = await api.createSchedule(schedule);
        printOutput({ id }, opts.format);
      });
    });

  schedules
    .command('update <id>')
    .description('Update a schedule')
    .option('--data <json>', 'Fields to update as JSON')
    .option('--file <path>', 'Read fields from JSON file (use - for stdin)')
    .option('--reset-next-date', 'Reset next occurrence date', false)
    .action(async (id: string, cmdOpts) => {
      const opts = program.opts();
      await withConnection(opts, async () => {
        const fields = readJsonInput(cmdOpts) as Parameters<
          typeof api.updateSchedule
        >[1];
        await api.updateSchedule(id, fields, cmdOpts.resetNextDate);
        printOutput({ success: true, id }, opts.format);
      });
    });

  schedules
    .command('delete <id>')
    .description('Delete a schedule')
    .action(async (id: string) => {
      const opts = program.opts();
      await withConnection(opts, async () => {
        await api.deleteSchedule(id);
        printOutput({ success: true, id }, opts.format);
      });
    });
}
