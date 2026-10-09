import { createBudget } from '#server/budget/base';
import * as db from '#server/db';
import { handlers } from '#server/main';
import { isMutating } from '#server/mutators';
import * as prefs from '#server/prefs';
import * as sheet from '#server/sheet';

import { MCP_READ_ONLY_HANDLERS } from './tools';

let requestId = 0;

async function callTool(name: string, args: Record<string, unknown> = {}) {
  const response = await handlers['mcp-handle-message']({
    message: {
      jsonrpc: '2.0',
      id: ++requestId,
      method: 'tools/call',
      params: { name, arguments: args },
    },
    version: 'test',
  });

  if (!response || Array.isArray(response) || !('result' in response)) {
    throw new Error(`Unexpected response: ${JSON.stringify(response)}`);
  }
  const result = response.result as {
    content: Array<{ text: string }>;
    isError: boolean;
  };
  if (result.isError) {
    return { error: result.content[0].text };
  }
  return JSON.parse(result.content[0].text);
}

async function dumpTables() {
  return Promise.all(
    ['transactions', 'accounts', 'categories', 'payees', 'zero_budgets'].map(
      table => db.all(`SELECT * FROM ${table} ORDER BY id`),
    ),
  );
}

async function countCrdtMessages() {
  const row = await db.first<{ count: number }>(
    'SELECT COUNT(*) AS count FROM messages_crdt',
  );
  return row?.count ?? 0;
}

describe('MCP tools', () => {
  beforeEach(async () => {
    await global.emptyDatabase()();
    global.currentMonth = '2026-03';

    await sheet.loadSpreadsheet(db);
    await prefs.loadPrefs();

    await db.insertCategoryGroup({
      id: 'income-group',
      name: 'Income',
      is_income: 1,
    });
    await db.insertCategory({
      id: 'salary',
      name: 'Salary',
      cat_group: 'income-group',
      is_income: 1,
    });
    await db.insertCategoryGroup({ id: 'food-group', name: 'Food' });
    await db.insertCategory({
      id: 'groceries',
      name: 'Groceries',
      cat_group: 'food-group',
    });
    await db.insertCategory({
      id: 'restaurants',
      name: 'Restaurants',
      cat_group: 'food-group',
    });
    await db.insertAccount({ id: 'checking', name: 'Checking' });
    await db.insertAccount({ id: 'savings', name: 'Savings', offbudget: 1 });
    await db.insertPayee({ id: 'market', name: 'Super Market' });

    await createBudget(['2026-02', '2026-03']);

    await db.insertTransaction({
      id: 't1',
      date: '2026-02-10',
      account: 'checking',
      amount: -4500,
      payee: 'market',
      category: 'groceries',
      notes: 'weekly shop',
    });
    await db.insertTransaction({
      id: 't2',
      date: '2026-03-05',
      account: 'checking',
      amount: -2000,
      category: 'restaurants',
      cleared: false,
    });
    await db.insertTransaction({
      id: 't3',
      date: '2026-03-07',
      account: 'checking',
      amount: -1000,
      payee: 'market',
      category: 'groceries',
    });
    await db.insertTransaction({
      id: 't4',
      date: '2026-03-08',
      account: 'savings',
      amount: 100000,
    });
    await sheet.waitOnSpreadsheet();
  });

  afterEach(() => {
    global.currentMonth = null;
  });

  it('only exposes non-mutating handlers', () => {
    for (const name of MCP_READ_ONLY_HANDLERS) {
      expect(handlers[name], name).toBeDefined();
      expect(isMutating(handlers[name]), name).toBe(false);
    }
    expect(isMutating(handlers['mcp-handle-message'])).toBe(false);
  });

  it('marks every tool as read-only', async () => {
    const response = await handlers['mcp-handle-message']({
      message: { jsonrpc: '2.0', id: 1, method: 'tools/list' },
    });
    const { tools } = (response as { result: { tools: unknown[] } }).result;

    expect(tools.length).toBeGreaterThan(5);
    for (const tool of tools) {
      expect(tool).toMatchObject({
        annotations: { readOnlyHint: true, destructiveHint: false },
      });
    }
  });

  it('returns budget info', async () => {
    await expect(callTool('get_budget_info')).resolves.toMatchObject({
      budgetType: 'envelope',
      currentMonth: '2026-03',
    });
  });

  it('lists accounts with balances', async () => {
    const accounts = await callTool('list_accounts');
    expect(accounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'checking',
          balance: -7500,
          cleared_balance: -5500,
          offbudget: false,
        }),
        expect.objectContaining({
          id: 'savings',
          balance: 100000,
          offbudget: true,
        }),
      ]),
    );
  });

  it('filters transactions and resolves names', async () => {
    const result = await callTool('get_transactions', {
      categoryId: 'groceries',
      startDate: '2026-03-01',
    });

    expect(result).toMatchObject({ count: 1, hasMore: false });
    expect(result.transactions).toEqual([
      expect.objectContaining({
        id: 't3',
        date: '2026-03-07',
        amount: -1000,
        account_name: 'Checking',
        payee_name: 'Super Market',
        category_name: 'Groceries',
        category_group_name: 'Food',
      }),
    ]);

    const searched = await callTool('get_transactions', { search: 'WEEKLY' });
    expect(searched.transactions.map((t: { id: string }) => t.id)).toEqual([
      't1',
    ]);
  });

  it('summarizes transactions', async () => {
    await expect(
      callTool('summarize_transactions', {
        groupBy: 'category',
        onlyOutflows: true,
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        category: 'groceries',
        category_name: 'Groceries',
        total: -5500,
        count: 2,
      }),
      expect.objectContaining({ category: 'restaurants', total: -2000 }),
    ]);

    await expect(
      callTool('summarize_transactions', {
        groupBy: 'month',
        excludeOffBudget: true,
      }),
    ).resolves.toEqual([
      { month: '2026-02', total: -4500, count: 1 },
      { month: '2026-03', total: -3000, count: 2 },
    ]);
  });

  it('reads a budget month', async () => {
    const month = await callTool('get_budget_month', { month: '2026-03' });
    expect(month).toMatchObject({ month: '2026-03', totalSpent: -3000 });
  });

  it('runs read-only AQL queries', async () => {
    await expect(
      callTool('query', {
        table: 'transactions',
        filter: { amount: { $lt: 0 } },
        calculate: { $sum: '$amount' },
      }),
    ).resolves.toEqual({ result: -7500 });

    const result = await callTool('query', {
      table: 'transactions',
      filter: { 'payee.name': { $like: '%market%' } },
      select: ['id', { payee_name: 'payee.name' }],
      orderBy: [{ date: 'asc' }],
    });
    expect(result.rows).toEqual([
      { id: 't1', payee_name: 'Super Market' },
      { id: 't3', payee_name: 'Super Market' },
    ]);
  });

  it('rejects queries on tables that are not allowed', async () => {
    await expect(
      callTool('query', { table: 'messages_crdt' }),
    ).resolves.toMatchObject({ error: expect.stringContaining('"table"') });
  });

  it('does not allow quotes in ids to break out of the query', async () => {
    const result = await callTool('query', {
      table: 'transactions',
      filter: { category: "groceries' OR '1'='1" },
    });
    expect(result.rows).toEqual([]);
  });

  it('never changes the budget', async () => {
    const before = await countCrdtMessages();
    const dumpBefore = await dumpTables();

    await callTool('get_budget_info');
    await callTool('list_accounts');
    await callTool('list_categories');
    await callTool('list_payees');
    await callTool('list_tags');
    await callTool('get_transactions');
    await callTool('summarize_transactions', { groupBy: 'payee' });
    await callTool('list_budget_months');
    await callTool('get_budget_month', { month: '2026-02' });
    await callTool('list_schedules');
    await callTool('list_rules');
    await callTool('get_note', { id: 'groceries' });
    await callTool('query', { table: 'accounts' });

    expect(await countCrdtMessages()).toBe(before);
    expect(await dumpTables()).toEqual(dumpBefore);
  });

  it('reports an error when no budget is open', async () => {
    prefs.unloadPrefs();
    await expect(callTool('list_accounts')).resolves.toEqual({
      error:
        'Error: No budget is open in Actual. Open a budget in the app and try again.',
    });
  });
});
