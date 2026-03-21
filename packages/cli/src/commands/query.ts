import * as api from '@actual-app/api';
import type { Command } from 'commander';

import { withConnection } from '../connection';
import { readJsonInput } from '../input';
import { printOutput } from '../output';
import { parseIntFlag } from '../utils';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Parse order-by strings like "date:desc,amount:asc,id" into
 * AQL orderBy format: [{ date: 'desc' }, { amount: 'asc' }, 'id']
 */
export function parseOrderBy(
  input: string,
): Array<string | Record<string, string>> {
  return input.split(',').map(part => {
    const trimmed = part.trim();
    if (!trimmed) {
      throw new Error('--order-by contains an empty field');
    }
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) {
      return trimmed;
    }
    const field = trimmed.slice(0, colonIndex).trim();
    if (!field) {
      throw new Error(
        `Invalid order field in "${trimmed}". Field name cannot be empty.`,
      );
    }
    const direction = trimmed.slice(colonIndex + 1);
    if (direction !== 'asc' && direction !== 'desc') {
      throw new Error(
        `Invalid order direction "${direction}" for field "${field}". Expected "asc" or "desc".`,
      );
    }
    return { [field]: direction };
  });
}

// TODO: Import schema from API once it exposes table/field metadata
const TABLE_SCHEMA: Record<
  string,
  Record<string, { type: string; ref?: string }>
> = {
  transactions: {
    id: { type: 'id' },
    account: { type: 'id', ref: 'accounts' },
    date: { type: 'date' },
    amount: { type: 'integer' },
    payee: { type: 'id', ref: 'payees' },
    category: { type: 'id', ref: 'categories' },
    notes: { type: 'string' },
    imported_id: { type: 'string' },
    transfer_id: { type: 'id' },
    cleared: { type: 'boolean' },
    reconciled: { type: 'boolean' },
    starting_balance_flag: { type: 'boolean' },
    imported_payee: { type: 'string' },
    is_parent: { type: 'boolean' },
    is_child: { type: 'boolean' },
    parent_id: { type: 'id' },
    sort_order: { type: 'float' },
    schedule: { type: 'id', ref: 'schedules' },
    'account.name': { type: 'string', ref: 'accounts' },
    'payee.name': { type: 'string', ref: 'payees' },
    'category.name': { type: 'string', ref: 'categories' },
    'category.group.name': { type: 'string', ref: 'category_groups' },
  },
  accounts: {
    id: { type: 'id' },
    name: { type: 'string' },
    offbudget: { type: 'boolean' },
    closed: { type: 'boolean' },
    sort_order: { type: 'float' },
  },
  categories: {
    id: { type: 'id' },
    name: { type: 'string' },
    is_income: { type: 'boolean' },
    group_id: { type: 'id', ref: 'category_groups' },
    sort_order: { type: 'float' },
    hidden: { type: 'boolean' },
    'group.name': { type: 'string', ref: 'category_groups' },
  },
  payees: {
    id: { type: 'id' },
    name: { type: 'string' },
    transfer_acct: { type: 'id', ref: 'accounts' },
  },
  rules: {
    id: { type: 'id' },
    stage: { type: 'string' },
    conditions_op: { type: 'string' },
    conditions: { type: 'json' },
    actions: { type: 'json' },
  },
  schedules: {
    id: { type: 'id' },
    name: { type: 'string' },
    rule: { type: 'id', ref: 'rules' },
    next_date: { type: 'date' },
    completed: { type: 'boolean' },
  },
};

const AVAILABLE_TABLES = Object.keys(TABLE_SCHEMA).join(', ');

const LAST_DEFAULT_SELECT = [
  'date',
  'account.name',
  'payee.name',
  'category.name',
  'amount',
  'notes',
];

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
  if (typeof parsed.offset === 'number') {
    queryObj = queryObj.offset(parsed.offset);
  }
  if (Array.isArray(parsed.groupBy)) {
    queryObj = queryObj.groupBy(parsed.groupBy);
  }
  return queryObj;
}

function buildQueryFromFlags(cmdOpts: Record<string, string | undefined>) {
  const last = cmdOpts.last ? parseIntFlag(cmdOpts.last, '--last') : undefined;

  if (last !== undefined) {
    if (cmdOpts.table && cmdOpts.table !== 'transactions') {
      throw new Error(
        '--last implies --table transactions. Cannot use with --table ' +
          cmdOpts.table,
      );
    }
    if (cmdOpts.limit) {
      throw new Error('--last and --limit are mutually exclusive');
    }
  }

  const table =
    cmdOpts.table ?? (last !== undefined ? 'transactions' : undefined);
  if (!table) {
    throw new Error('--table is required (or use --file or --last)');
  }

  if (!(table in TABLE_SCHEMA)) {
    throw new Error(
      `Unknown table "${table}". Available tables: ${AVAILABLE_TABLES}`,
    );
  }

  if (cmdOpts.where && cmdOpts.filter) {
    throw new Error('--where and --filter are mutually exclusive');
  }

  if (cmdOpts.count && cmdOpts.select) {
    throw new Error('--count and --select are mutually exclusive');
  }

  let queryObj = api.q(table);

  if (cmdOpts.count) {
    queryObj = queryObj.calculate({ $count: '*' });
  } else if (cmdOpts.select) {
    queryObj = queryObj.select(cmdOpts.select.split(','));
  } else if (last !== undefined) {
    queryObj = queryObj.select(LAST_DEFAULT_SELECT);
  }

  const filterStr = cmdOpts.filter ?? cmdOpts.where;
  if (filterStr) {
    queryObj = queryObj.filter(JSON.parse(filterStr));
  }

  const orderByStr =
    cmdOpts.orderBy ??
    (last !== undefined && !cmdOpts.count ? 'date:desc' : undefined);
  if (orderByStr) {
    queryObj = queryObj.orderBy(parseOrderBy(orderByStr));
  }

  const limitVal =
    last ??
    (cmdOpts.limit ? parseIntFlag(cmdOpts.limit, '--limit') : undefined);
  if (limitVal !== undefined) {
    queryObj = queryObj.limit(limitVal);
  }

  if (cmdOpts.offset) {
    queryObj = queryObj.offset(parseIntFlag(cmdOpts.offset, '--offset'));
  }

  if (cmdOpts.groupBy) {
    queryObj = queryObj.groupBy(cmdOpts.groupBy.split(','));
  }

  return queryObj;
}

const RUN_EXAMPLES = `
Examples:
  # Show last 5 transactions (shortcut)
  actual query run --last 5

  # Transactions ordered by date descending
  actual query run --table transactions --select "date,amount,payee.name" --order-by "date:desc" --limit 10

  # Filter with JSON (negative amounts = expenses)
  actual query run --table transactions --filter '{"amount":{"$lt":0}}' --limit 5

  # Count transactions
  actual query run --table transactions --count

  # Group by category (use --file for aggregate expressions)
  echo '{"table":"transactions","groupBy":["category.name"],"select":["category.name",{"amount":{"$sum":"$amount"}}]}' | actual query run --file -

  # Pagination
  actual query run --table transactions --order-by "date:desc" --limit 10 --offset 20

  # Use --where (alias for --filter)
  actual query run --table transactions --where '{"payee.name":"Grocery Store"}' --limit 5

  # Read query from a JSON file
  actual query run --file query.json

  # Pipe query from stdin
  echo '{"table":"transactions","limit":5}' | actual query run --file -

Available tables: ${AVAILABLE_TABLES}
Use "actual query tables" and "actual query fields <table>" for schema info.

Common filter operators: $eq, $ne, $lt, $lte, $gt, $gte, $like, $and, $or
See ActualQL docs for full reference: https://actualbudget.org/docs/api/actual-ql/`;

export function registerQueryCommand(program: Command) {
  const query = program
    .command('query')
    .description('Run AQL (Actual Query Language) queries');

  query
    .command('run')
    .description('Execute an AQL query')
    .option(
      '--table <table>',
      'Table to query (use "actual query tables" to list available tables)',
    )
    .option('--select <fields>', 'Comma-separated fields to select')
    .option('--filter <json>', 'Filter as JSON (e.g. \'{"amount":{"$lt":0}}\')')
    .option(
      '--where <json>',
      'Alias for --filter (cannot be used together with --filter)',
    )
    .option(
      '--order-by <fields>',
      'Fields with optional direction: field1:desc,field2 (default: asc)',
    )
    .option('--limit <n>', 'Limit number of results')
    .option('--offset <n>', 'Skip first N results (for pagination)')
    .option(
      '--last <n>',
      'Show last N transactions (implies --table transactions, --order-by date:desc)',
    )
    .option('--count', 'Count matching rows instead of returning them')
    .option(
      '--group-by <fields>',
      'Comma-separated fields to group by (use with aggregate selects)',
    )
    .option(
      '--file <path>',
      'Read full query object from JSON file (use - for stdin)',
    )
    .addHelpText('after', RUN_EXAMPLES)
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

        if (cmdOpts.count) {
          printOutput({ count: result.data }, opts.format);
        } else {
          printOutput(result, opts.format);
        }
      });
    });

  query
    .command('tables')
    .description('List available tables for querying')
    .action(() => {
      const opts = program.opts();
      const tables = Object.keys(TABLE_SCHEMA).map(name => ({ name }));
      printOutput(tables, opts.format);
    });

  query
    .command('fields <table>')
    .description('List fields for a given table')
    .action((table: string) => {
      const opts = program.opts();
      const schema = TABLE_SCHEMA[table];
      if (!schema) {
        throw new Error(
          `Unknown table "${table}". Available tables: ${Object.keys(TABLE_SCHEMA).join(', ')}`,
        );
      }
      const fields = Object.entries(schema).map(([name, info]) => ({
        name,
        type: info.type,
        ...(info.ref ? { ref: info.ref } : {}),
      }));
      printOutput(fields, opts.format);
    });
}
