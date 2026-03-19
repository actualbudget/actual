import * as api from '@actual-app/api';
import type { Command } from 'commander';

import { withConnection } from '../connection';
import { readJsonInput } from '../input';
import { printOutput } from '../output';
import { parseIntFlag } from '../utils';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function buildQueryFromFile(
  parsed: Record<string, unknown>,
  fallbackTable: string | undefined,
) {
  const table = typeof parsed.table === 'string' ? parsed.table : fallbackTable;
  if (!table) {
    throw new Error(
      '--table is required when the input file lacks a "table" field',
    );
  }
  let queryObj = api.q(table);
  if (Array.isArray(parsed.select)) queryObj = queryObj.select(parsed.select);
  if (isRecord(parsed.filter)) queryObj = queryObj.filter(parsed.filter);
  if (Array.isArray(parsed.orderBy)) {
    queryObj = queryObj.orderBy(parsed.orderBy);
  }
  if (typeof parsed.limit === 'number') queryObj = queryObj.limit(parsed.limit);
  return queryObj;
}

function buildQueryFromFlags(cmdOpts: Record<string, string | undefined>) {
  if (!cmdOpts.table) {
    throw new Error('--table is required (or use --file)');
  }
  let queryObj = api.q(cmdOpts.table);

  if (cmdOpts.select) {
    queryObj = queryObj.select(cmdOpts.select.split(','));
  }

  if (cmdOpts.filter) {
    queryObj = queryObj.filter(JSON.parse(cmdOpts.filter));
  }

  if (cmdOpts.orderBy) {
    queryObj = queryObj.orderBy(cmdOpts.orderBy.split(','));
  }

  if (cmdOpts.limit) {
    queryObj = queryObj.limit(parseIntFlag(cmdOpts.limit, '--limit'));
  }

  return queryObj;
}

export function registerQueryCommand(program: Command) {
  const query = program
    .command('query')
    .description('Run AQL (Actual Query Language) queries');

  query
    .command('run')
    .description('Execute an AQL query')
    .option(
      '--table <table>',
      'Table to query (transactions, accounts, categories, payees)',
    )
    .option('--select <fields>', 'Comma-separated fields to select')
    .option('--filter <json>', 'Filter expression as JSON')
    .option('--order-by <fields>', 'Comma-separated fields to order by')
    .option('--limit <n>', 'Limit number of results')
    .option(
      '--file <path>',
      'Read full query object from JSON file (use - for stdin)',
    )
    .action(async cmdOpts => {
      const opts = program.opts();
      await withConnection(opts, async () => {
        const parsed = cmdOpts.file ? readJsonInput(cmdOpts) : undefined;
        if (parsed !== undefined && !isRecord(parsed)) {
          throw new Error('Query file must contain a JSON object');
        }
        const queryObj = parsed
          ? buildQueryFromFile(parsed, cmdOpts.table)
          : buildQueryFromFlags(cmdOpts);

        const result = await api.aqlQuery(queryObj);
        printOutput(result, opts.format);
      });
    });
}
