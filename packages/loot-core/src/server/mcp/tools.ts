import { aqlQuery } from '#server/aql';
import * as prefs from '#server/prefs';
import * as monthUtils from '#shared/months';
import { q } from '#shared/query';
import type { Query } from '#shared/query';
import type { Handlers } from '#types/handlers';

import type { McpTool, McpToolDefinition } from './protocol';

/**
 * The only handlers the MCP tools are allowed to call. Every one of them is a
 * plain read: none is wrapped in `mutator`, writes to the database or changes
 * the state of the open budget. Keep it that way: the MCP server must never be
 * able to modify the user's data.
 */
export const MCP_READ_ONLY_HANDLERS = [
  'api/accounts-get',
  'api/account-groups-get',
  'api/budget-months',
  'api/budget-month',
  'api/category-groups-get',
  'api/payees-get',
  'api/tags-get',
  'api/schedules-get',
  'api/rules-get',
  'api/note-get',
  'preferences/get',
] as const;

export type McpReadOnlyHandlers = Pick<
  Handlers,
  (typeof MCP_READ_ONLY_HANDLERS)[number]
>;

// Tables the generic `query` tool may read. Internal tables (sync messages,
// dashboards, saved report layouts, ...) are left out on purpose.
const QUERYABLE_TABLES = [
  'transactions',
  'accounts',
  'account_groups',
  'categories',
  'category_groups',
  'payees',
  'schedules',
  'rules',
  'notes',
  'zero_budgets',
  'reflect_budgets',
] as const;

const SPLITS_OPTIONS = ['inline', 'grouped', 'all', 'none'] as const;

const SUMMARY_GROUPS = [
  'category',
  'category_group',
  'payee',
  'account',
  'month',
  'year',
] as const;

const DEFAULT_ROW_LIMIT = 1000;
const MAX_ROW_LIMIT = 10000;

export const MCP_SERVER_INSTRUCTIONS = [
  'Read-only access to the budget currently open in the Actual Budget app.',
  'This server cannot create, change or delete anything.',
  'All money amounts are integers in minor units (cents): divide by 100 to get the',
  'value in the budget currency (for example -4599 means -45.99). Negative amounts',
  'are outflows (spending), positive amounts are inflows (income).',
  'Dates are YYYY-MM-DD strings and budget months are YYYY-MM strings.',
  'Start with get_budget_info, then list_accounts and list_categories to learn the',
  'ids used by the other tools.',
].join(' ');

const READ_ONLY_ANNOTATIONS: McpToolDefinition['annotations'] = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

class McpToolError extends Error {}

function ensureBudgetOpen() {
  if (!prefs.getPrefs()?.id) {
    throw new McpToolError(
      'No budget is open in Actual. Open a budget in the app and try again.',
    );
  }
}

function optionalString(args: Record<string, unknown>, key: string) {
  const value = args[key];
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new McpToolError(`"${key}" must be a string`);
  }
  return value;
}

function optionalId(args: Record<string, unknown>, key: string) {
  const value = optionalString(args, key);
  if (value !== undefined && !/^[\w-]+$/.test(value)) {
    throw new McpToolError(`"${key}" is not a valid id`);
  }
  return value;
}

function optionalDate(args: Record<string, unknown>, key: string) {
  const value = optionalString(args, key);
  if (value !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new McpToolError(`"${key}" must be a date formatted as YYYY-MM-DD`);
  }
  return value;
}

function optionalInteger(args: Record<string, unknown>, key: string) {
  const value = args[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new McpToolError(`"${key}" must be an integer`);
  }
  return value;
}

function optionalBoolean(args: Record<string, unknown>, key: string) {
  const value = args[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'boolean') {
    throw new McpToolError(`"${key}" must be a boolean`);
  }
  return value;
}

function oneOf<T extends string>(
  args: Record<string, unknown>,
  key: string,
  options: readonly T[],
): T | undefined {
  const value = optionalString(args, key);
  if (value === undefined) {
    return undefined;
  }
  const match = options.find(option => option === value);
  if (!match) {
    throw new McpToolError(`"${key}" must be one of: ${options.join(', ')}`);
  }
  return match;
}

function rowLimit(args: Record<string, unknown>) {
  const limit = optionalInteger(args, 'limit') ?? DEFAULT_ROW_LIMIT;
  if (limit < 1 || limit > MAX_ROW_LIMIT) {
    throw new McpToolError(`"limit" must be between 1 and ${MAX_ROW_LIMIT}`);
  }
  return limit;
}

function rowOffset(args: Record<string, unknown>) {
  const offset = optionalInteger(args, 'offset') ?? 0;
  if (offset < 0) {
    throw new McpToolError('"offset" must not be negative');
  }
  return offset;
}

function dateRangeFilters(args: Record<string, unknown>) {
  const startDate = optionalDate(args, 'startDate');
  const endDate = optionalDate(args, 'endDate');
  return [
    startDate && { date: { $gte: startDate } },
    endDate && { date: { $lte: endDate } },
  ].filter(filter => !!filter);
}

async function runQuery(query: Query): Promise<Record<string, unknown>[]> {
  const { data } = await aqlQuery(query);
  return data;
}

const dateRangeProperties = {
  startDate: {
    type: 'string',
    description:
      'Only include transactions on or after this date (YYYY-MM-DD).',
  },
  endDate: {
    type: 'string',
    description:
      'Only include transactions on or before this date (YYYY-MM-DD).',
  },
};

function tool(
  definition: Omit<McpToolDefinition, 'annotations'>,
  run: McpTool['run'],
): McpTool {
  return {
    ...definition,
    annotations: READ_ONLY_ANNOTATIONS,
    run: async args => {
      ensureBudgetOpen();
      return run(args);
    },
  };
}

/**
 * Builds the read-only tools exposed over MCP. `handlers` is deliberately
 * typed to the read-only subset so a mutating handler can't be reached.
 */
export function createMcpTools(handlers: McpReadOnlyHandlers): McpTool[] {
  return [
    tool(
      {
        name: 'get_budget_info',
        title: 'Budget information',
        description:
          'Returns general information about the open budget: its name, budget type (envelope or tracking), currency, number format, the range of budget months and the current month.',
        inputSchema: { type: 'object', properties: {} },
      },
      async () => {
        const metadata = prefs.getPrefs();
        const syncedPrefs = await handlers['preferences/get']();
        const months = await handlers['api/budget-months']();
        return {
          budgetName: metadata.budgetName,
          budgetId: metadata.id,
          budgetType:
            syncedPrefs.budgetType === 'tracking' ? 'tracking' : 'envelope',
          currencyCode: syncedPrefs.defaultCurrencyCode || null,
          numberFormat: syncedPrefs.numberFormat || null,
          dateFormat: syncedPrefs.dateFormat || null,
          firstMonth: months[0] ?? null,
          lastMonth: months[months.length - 1] ?? null,
          currentMonth: monthUtils.currentMonth(),
          today: monthUtils.currentDay(),
          amountUnit:
            'Amounts are integers in cents (1/100 of the currency unit).',
        };
      },
    ),

    tool(
      {
        name: 'list_accounts',
        title: 'List accounts',
        description:
          'Lists all accounts with their current balance, cleared balance, whether they are on or off budget, closed, and the account group they belong to. Balances are integers in cents.',
        inputSchema: {
          type: 'object',
          properties: {
            includeClosed: {
              type: 'boolean',
              description: 'Include closed accounts (default true).',
            },
          },
        },
      },
      async args => {
        const includeClosed = optionalBoolean(args, 'includeClosed') ?? true;
        const [accounts, groups, balances, clearedBalances] = await Promise.all(
          [
            handlers['api/accounts-get'](),
            handlers['api/account-groups-get'](),
            runQuery(
              q('transactions')
                .groupBy('account')
                .select(['account', { balance: { $sum: '$amount' } }]),
            ),
            runQuery(
              q('transactions')
                .filter({ cleared: true })
                .groupBy('account')
                .select(['account', { balance: { $sum: '$amount' } }]),
            ),
          ],
        );

        const balanceByAccount = new Map(
          balances.map(row => [row.account, row.balance]),
        );
        const clearedByAccount = new Map(
          clearedBalances.map(row => [row.account, row.balance]),
        );
        const groupNames = new Map(groups.map(group => [group.id, group.name]));

        return accounts
          .filter(account => includeClosed || !account.closed)
          .map(account => ({
            ...account,
            account_group_name: account.account_group_id
              ? (groupNames.get(account.account_group_id) ?? null)
              : null,
            balance: balanceByAccount.get(account.id) ?? 0,
            cleared_balance: clearedByAccount.get(account.id) ?? 0,
          }));
      },
    ),

    tool(
      {
        name: 'list_categories',
        title: 'List categories',
        description:
          'Lists the category groups and the categories inside each of them, including whether they are income categories or hidden.',
        inputSchema: { type: 'object', properties: {} },
      },
      async () => handlers['api/category-groups-get'](),
    ),

    tool(
      {
        name: 'list_payees',
        title: 'List payees',
        description:
          'Lists all payees. Payees with a transfer_acct are transfer payees that represent another account.',
        inputSchema: { type: 'object', properties: {} },
      },
      async () => handlers['api/payees-get'](),
    ),

    tool(
      {
        name: 'list_tags',
        title: 'List tags',
        description:
          'Lists the tags used in transaction notes (written as #tag in the notes).',
        inputSchema: { type: 'object', properties: {} },
      },
      async () => handlers['api/tags-get'](),
    ),

    tool(
      {
        name: 'get_transactions',
        title: 'Get transactions',
        description:
          'Returns transactions with the account, payee and category names resolved. Split transactions are returned as their individual parts so each part has its own category. Results are sorted by date, newest first. Amounts are integers in cents; negative is an outflow.',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: {
              type: 'string',
              description: 'Only include transactions from this account id.',
            },
            categoryId: {
              type: 'string',
              description: 'Only include transactions in this category id.',
            },
            payeeId: {
              type: 'string',
              description: 'Only include transactions with this payee id.',
            },
            ...dateRangeProperties,
            minAmount: {
              type: 'integer',
              description: 'Minimum amount in cents (inclusive).',
            },
            maxAmount: {
              type: 'integer',
              description: 'Maximum amount in cents (inclusive).',
            },
            search: {
              type: 'string',
              description:
                'Case-insensitive text to look for in the notes, payee name or imported payee.',
            },
            uncategorizedOnly: {
              type: 'boolean',
              description:
                'Only include on-budget transactions without a category (excluding transfers).',
            },
            limit: {
              type: 'integer',
              description: `Maximum number of transactions to return (default ${DEFAULT_ROW_LIMIT}, max ${MAX_ROW_LIMIT}).`,
            },
            offset: {
              type: 'integer',
              description: 'Number of transactions to skip, for paging.',
            },
          },
        },
      },
      async args => {
        const accountId = optionalId(args, 'accountId');
        const categoryId = optionalId(args, 'categoryId');
        const payeeId = optionalId(args, 'payeeId');
        const minAmount = optionalInteger(args, 'minAmount');
        const maxAmount = optionalInteger(args, 'maxAmount');
        const search = optionalString(args, 'search');
        const uncategorizedOnly = optionalBoolean(args, 'uncategorizedOnly');
        const limit = rowLimit(args);
        const offset = rowOffset(args);

        const filters = [
          accountId && { account: accountId },
          categoryId && { category: categoryId },
          payeeId && { payee: payeeId },
          ...dateRangeFilters(args),
          minAmount !== undefined && { amount: { $gte: minAmount } },
          maxAmount !== undefined && { amount: { $lte: maxAmount } },
          search && {
            $or: [
              { notes: { $like: `%${search}%` } },
              { 'payee.name': { $like: `%${search}%` } },
              { imported_payee: { $like: `%${search}%` } },
            ],
          },
          uncategorizedOnly && {
            category: null,
            transfer_id: null,
            'account.offbudget': false,
          },
        ].filter(filter => !!filter);

        const transactions = await runQuery(
          q('transactions')
            .filter({ $and: filters })
            .select([
              'id',
              'date',
              'amount',
              'notes',
              'imported_payee',
              'cleared',
              'reconciled',
              'is_child',
              'parent_id',
              'transfer_id',
              'schedule',
              'account',
              { account_name: 'account.name' },
              'payee',
              { payee_name: 'payee.name' },
              'category',
              { category_name: 'category.name' },
              { category_group_name: 'category.group.name' },
            ])
            .orderBy([{ date: 'desc' }, { sort_order: 'desc' }, 'id'])
            .limit(limit)
            .offset(offset),
        );

        return {
          count: transactions.length,
          limit,
          offset,
          hasMore: transactions.length === limit,
          transactions,
        };
      },
    ),

    tool(
      {
        name: 'summarize_transactions',
        title: 'Summarize transactions',
        description:
          'Aggregates transactions and returns the total amount (in cents) and the number of transactions per group. Group by category, category_group, payee, account, month or year. Useful for spending breakdowns and trends. Split transactions are counted by their parts. Transfers between on-budget accounts have no category.',
        inputSchema: {
          type: 'object',
          properties: {
            groupBy: {
              type: 'string',
              enum: [...SUMMARY_GROUPS],
              description: 'What to group the totals by.',
            },
            ...dateRangeProperties,
            accountId: {
              type: 'string',
              description: 'Only include transactions from this account id.',
            },
            categoryId: {
              type: 'string',
              description: 'Only include transactions in this category id.',
            },
            onlyOutflows: {
              type: 'boolean',
              description: 'Only include negative amounts (spending).',
            },
            onlyInflows: {
              type: 'boolean',
              description: 'Only include positive amounts (income).',
            },
            excludeOffBudget: {
              type: 'boolean',
              description:
                'Exclude transactions in off-budget accounts (default false).',
            },
          },
          required: ['groupBy'],
        },
      },
      async args => {
        const groupBy = oneOf(args, 'groupBy', SUMMARY_GROUPS);
        if (!groupBy) {
          throw new McpToolError('"groupBy" is required');
        }
        const accountId = optionalId(args, 'accountId');
        const categoryId = optionalId(args, 'categoryId');
        const onlyOutflows = optionalBoolean(args, 'onlyOutflows');
        const onlyInflows = optionalBoolean(args, 'onlyInflows');
        const excludeOffBudget = optionalBoolean(args, 'excludeOffBudget');

        const filters = [
          accountId && { account: accountId },
          categoryId && { category: categoryId },
          ...dateRangeFilters(args),
          onlyOutflows && { amount: { $lt: 0 } },
          onlyInflows && { amount: { $gt: 0 } },
          excludeOffBudget && { 'account.offbudget': false },
        ].filter(filter => !!filter);

        const totals = [
          { total: { $sum: '$amount' } },
          { count: { $count: '$id' } },
        ];
        let query = q('transactions').filter({ $and: filters });

        switch (groupBy) {
          case 'category':
            query = query
              .groupBy(['category'])
              .select([
                'category',
                { category_name: 'category.name' },
                { category_group_name: 'category.group.name' },
                ...totals,
              ]);
            break;
          case 'category_group':
            query = query
              .groupBy(['category.group'])
              .select([
                { category_group: 'category.group' },
                { category_group_name: 'category.group.name' },
                ...totals,
              ]);
            break;
          case 'payee':
            query = query
              .groupBy(['payee'])
              .select(['payee', { payee_name: 'payee.name' }, ...totals]);
            break;
          case 'account':
            query = query
              .groupBy(['account'])
              .select(['account', { account_name: 'account.name' }, ...totals]);
            break;
          case 'month':
            query = query
              .groupBy([{ $month: '$date' }])
              .select([{ month: { $month: '$date' } }, ...totals]);
            break;
          case 'year':
            query = query
              .groupBy([{ $year: '$date' }])
              .select([{ year: { $year: '$date' } }, ...totals]);
            break;
          default:
            throw new McpToolError(`Unsupported groupBy: ${String(groupBy)}`);
        }

        const rows = await runQuery(query);
        if (groupBy === 'month' || groupBy === 'year') {
          return rows.sort((a, b) =>
            String(a[groupBy]).localeCompare(String(b[groupBy])),
          );
        }
        return rows.sort((a, b) => Number(a.total) - Number(b.total));
      },
    ),

    tool(
      {
        name: 'list_budget_months',
        title: 'List budget months',
        description: 'Lists the months (YYYY-MM) that have a budget.',
        inputSchema: { type: 'object', properties: {} },
      },
      async () => handlers['api/budget-months'](),
    ),

    tool(
      {
        name: 'get_budget_month',
        title: 'Get budget month',
        description:
          'Returns the budget for one month: income, amount to budget, totals, and for every category the budgeted amount, the amount spent (or received) and the remaining balance. All amounts are integers in cents.',
        inputSchema: {
          type: 'object',
          properties: {
            month: {
              type: 'string',
              description: 'The month to read, formatted as YYYY-MM.',
            },
          },
          required: ['month'],
        },
      },
      async args => {
        const month = optionalString(args, 'month');
        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
          throw new McpToolError('"month" must be formatted as YYYY-MM');
        }
        return handlers['api/budget-month']({ month });
      },
    ),

    tool(
      {
        name: 'list_schedules',
        title: 'List schedules',
        description:
          'Lists scheduled (recurring or upcoming) transactions such as bills and subscriptions, with their next date and amount.',
        inputSchema: { type: 'object', properties: {} },
      },
      async () => handlers['api/schedules-get'](),
    ),

    tool(
      {
        name: 'list_rules',
        title: 'List rules',
        description:
          'Lists the rules Actual uses to automatically categorize and rename imported transactions.',
        inputSchema: { type: 'object', properties: {} },
      },
      async () => handlers['api/rules-get'](),
    ),

    tool(
      {
        name: 'get_note',
        title: 'Get note',
        description:
          'Returns the note attached to an account, category, category group or budget month. Pass the id of the account/category, or "budget-YYYY-MM" for a month.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The id the note is attached to.',
            },
          },
          required: ['id'],
        },
      },
      async args => {
        const id = optionalId(args, 'id');
        if (!id) {
          throw new McpToolError('"id" is required');
        }
        return (await handlers['api/note-get']({ id })) ?? null;
      },
    ),

    tool(
      {
        name: 'query',
        title: 'Run a read-only query',
        description: [
          "Runs a read-only query using Actual's query language (AQL) for custom analysis.",
          `Tables: ${QUERYABLE_TABLES.join(', ')}.`,
          'Related fields can be read with dot paths, e.g. "payee.name", "category.group.name", "account.offbudget".',
          'filter examples: {"date": {"$gte": "2025-01-01"}}, {"amount": {"$lt": 0}}, {"$or": [{"category": null}, {"payee.name": {"$like": "%amazon%"}}]}.',
          'Operators: $eq, $ne, $lt, $lte, $gt, $gte, $oneof, $like, $notlike, $regexp, $and, $or.',
          'select examples: ["date", "amount", {"payee_name": "payee.name"}] or ["*"]. Aggregates must be named: [{"total": {"$sum": "$amount"}}, {"n": {"$count": "$id"}}].',
          'groupBy examples: ["category"] or [{"$month": "$date"}]. orderBy examples: [{"date": "desc"}].',
          'Functions: $sum, $count, $month, $year, $abs, $neg, $lower, $substr.',
          'For transactions, options.splits controls split transactions: "inline" (default, only the parts), "grouped", "all" or "none" (only the parent).',
          'Amounts are integers in cents.',
        ].join(' '),
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', enum: [...QUERYABLE_TABLES] },
            filter: {
              type: 'object',
              description: 'AQL filter expression.',
            },
            select: {
              type: 'array',
              description:
                'Fields or named expressions to return. Defaults to all fields.',
            },
            groupBy: { type: 'array', description: 'Fields to group by.' },
            orderBy: { type: 'array', description: 'Sort order.' },
            calculate: {
              type: 'object',
              description:
                'A single aggregate to return instead of rows, e.g. {"$sum": "$amount"}.',
            },
            options: {
              type: 'object',
              properties: {
                splits: { type: 'string', enum: [...SPLITS_OPTIONS] },
              },
            },
            limit: {
              type: 'integer',
              description: `Maximum number of rows (default ${DEFAULT_ROW_LIMIT}, max ${MAX_ROW_LIMIT}).`,
            },
            offset: { type: 'integer' },
          },
          required: ['table'],
        },
      },
      async args => {
        const table = oneOf(args, 'table', QUERYABLE_TABLES);
        if (!table) {
          throw new McpToolError('"table" is required');
        }

        let query = q(table);

        if (args.options !== undefined) {
          const options = args.options;
          if (
            table !== 'transactions' ||
            options === null ||
            typeof options !== 'object' ||
            Array.isArray(options)
          ) {
            throw new McpToolError(
              '"options" is only supported for the transactions table',
            );
          }
          const splits = oneOf(
            options as Record<string, unknown>,
            'splits',
            SPLITS_OPTIONS,
          );
          if (splits) {
            query = query.options({ splits });
          }
        }

        if (args.filter !== undefined) {
          if (
            args.filter === null ||
            typeof args.filter !== 'object' ||
            Array.isArray(args.filter)
          ) {
            throw new McpToolError('"filter" must be an object');
          }
          query = query.filter(args.filter as Record<string, unknown>);
        }

        if (args.calculate !== undefined) {
          if (
            args.calculate === null ||
            typeof args.calculate !== 'object' ||
            Array.isArray(args.calculate)
          ) {
            throw new McpToolError('"calculate" must be an object');
          }
          const { data } = await aqlQuery(
            query.calculate(args.calculate as Record<string, unknown>),
          );
          return { result: data };
        }

        for (const key of ['select', 'groupBy', 'orderBy'] as const) {
          if (args[key] !== undefined && !Array.isArray(args[key])) {
            throw new McpToolError(`"${key}" must be an array`);
          }
        }

        const limit = rowLimit(args);
        const offset = rowOffset(args);

        query = query.select(
          Array.isArray(args.select) && args.select.length > 0
            ? args.select
            : ['*'],
        );
        if (Array.isArray(args.groupBy) && args.groupBy.length > 0) {
          query = query.groupBy(args.groupBy);
        }
        if (Array.isArray(args.orderBy) && args.orderBy.length > 0) {
          query = query.orderBy(args.orderBy);
        }
        query = query.limit(limit).offset(offset);

        const rows = await runQuery(query);
        return {
          count: rows.length,
          limit,
          offset,
          hasMore: rows.length === limit,
          rows,
        };
      },
    ),
  ];
}
