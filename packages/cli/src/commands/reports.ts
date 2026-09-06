import * as api from '@actual-app/api';
import type { Command } from 'commander';

import { withConnection } from '#connection';
import { printOutput } from '#output';
import { resolveId } from '#resolve';
import {
  addMonths,
  assertMonth,
  currentMonth,
  isRecord,
  monthEnd,
  monthRange,
  parseIntFlag,
  resolveDateRange,
} from '#utils';

export type ReportTransaction = {
  id: string;
  date: string;
  amount: number;
  transfer_id: string | null;
  'account.name': string;
  'account.offbudget': boolean;
  'payee.name': string | null;
  category: string | null;
  'category.name': string | null;
  'category.is_income': boolean | null;
  'category.group.name': string | null;
};

const REPORT_FIELDS = [
  'id',
  'date',
  'amount',
  'transfer_id',
  'account.name',
  'account.offbudget',
  'payee.name',
  'category',
  'category.name',
  'category.is_income',
  'category.group.name',
];

type RangeFilterOpts = {
  includeIncome?: boolean;
  includeTransfers?: boolean;
  includeOffbudget?: boolean;
  account?: string;
};

async function fetchTransactions(
  start: string,
  end: string,
  accountId?: string,
): Promise<ReportTransaction[]> {
  const filter: Record<string, unknown> = {
    date: { $gte: start, $lte: end },
  };
  if (accountId) filter.account = accountId;
  const query = api
    .q('transactions')
    .filter(filter)
    .select(REPORT_FIELDS)
    .orderBy(['date']);
  const result = await api.aqlQuery(query);
  if (!isRecord(result) || !Array.isArray(result.data)) {
    throw new Error('Query result missing data');
  }
  return result.data as ReportTransaction[];
}

/** Keep only the transactions that count as spending/income for reports. */
export function filterForReport(
  transactions: ReportTransaction[],
  opts: RangeFilterOpts,
): ReportTransaction[] {
  return transactions.filter(tx => {
    if (!opts.includeOffbudget && tx['account.offbudget']) return false;
    if (!opts.includeTransfers && tx.transfer_id) return false;
    if (!opts.includeIncome && tx['category.is_income']) return false;
    return true;
  });
}

type GroupKey = 'category' | 'group' | 'payee' | 'account';

function groupLabel(tx: ReportTransaction, by: GroupKey): string {
  switch (by) {
    case 'category':
      return tx['category.name'] ?? '(uncategorized)';
    case 'group':
      return tx['category.group.name'] ?? '(uncategorized)';
    case 'payee':
      return tx['payee.name'] ?? '(no payee)';
    case 'account':
      return tx['account.name'];
    default:
      throw new Error(`Unknown grouping: ${by as string}`);
  }
}

export type SpendingRow = {
  name: string;
  group?: string;
  transactions: number;
  spent: number;
  percent: number;
};

export function summarizeSpending(
  transactions: ReportTransaction[],
  by: GroupKey,
): SpendingRow[] {
  const buckets = new Map<string, SpendingRow>();
  for (const tx of transactions) {
    const name = groupLabel(tx, by);
    let row = buckets.get(name);
    if (!row) {
      row = { name, transactions: 0, spent: 0, percent: 0 };
      if (by === 'category') {
        row.group = tx['category.group.name'] ?? '';
      }
      buckets.set(name, row);
    }
    row.transactions += 1;
    row.spent += tx.amount;
  }
  const rows = [...buckets.values()].sort((a, b) => a.spent - b.spent);
  const total = rows.reduce((sum, r) => sum + r.spent, 0);
  for (const row of rows) {
    row.percent = total === 0 ? 0 : Math.round((row.spent / total) * 1000) / 10;
  }
  return rows;
}

function withTotalRow(rows: SpendingRow[]): SpendingRow[] {
  const total: SpendingRow = {
    name: 'TOTAL',
    transactions: rows.reduce((s, r) => s + r.transactions, 0),
    spent: rows.reduce((s, r) => s + r.spent, 0),
    percent: 100,
  };
  if (rows.some(r => 'group' in r)) total.group = '';
  return [...rows, total];
}

type BudgetMonthCategory = {
  id: string;
  name: string;
  hidden?: boolean;
  is_income?: boolean;
  budgeted?: number;
  spent?: number;
  received?: number;
  balance?: number;
  carryover?: boolean;
};

type BudgetMonthGroup = {
  id: string;
  name: string;
  hidden?: boolean;
  is_income?: boolean;
  categories?: BudgetMonthCategory[];
};

export type BudgetRow = {
  group: string;
  category: string;
  budgeted: number;
  spent: number;
  balance: number;
  usedPercent: number | null;
};

export function flattenBudgetMonth(
  groups: BudgetMonthGroup[],
  includeHidden: boolean,
): BudgetRow[] {
  const rows: BudgetRow[] = [];
  for (const group of groups) {
    if (!includeHidden && group.hidden) continue;
    for (const cat of group.categories ?? []) {
      if (!includeHidden && cat.hidden) continue;
      const budgeted = cat.budgeted ?? 0;
      const spent = group.is_income ? (cat.received ?? 0) : (cat.spent ?? 0);
      const balance = cat.balance ?? 0;
      const usedPercent =
        budgeted === 0
          ? null
          : Math.round((Math.abs(spent) / Math.abs(budgeted)) * 1000) / 10;
      rows.push({
        group: group.name,
        category: cat.name,
        budgeted,
        spent,
        balance,
        usedPercent,
      });
    }
  }
  return rows;
}

async function sumThrough(end: string, offbudget: boolean): Promise<number> {
  const result = await api.aqlQuery(
    api
      .q('transactions')
      .filter({ date: { $lte: end }, 'account.offbudget': offbudget })
      .calculate({ $sum: '$amount' }),
  );
  if (!isRecord(result)) return 0;
  const value = result.data;
  return typeof value === 'number' ? value : 0;
}

const RANGE_HELP = `
Date range:
  --month YYYY-MM         A single month (default: current month)
  --start/--end           Explicit YYYY-MM-DD range (both required)`;

export function registerReportsCommand(program: Command) {
  const reports = program
    .command('reports')
    .description('Spending, budget and net worth reports');

  reports
    .command('spending')
    .description('Spending grouped by category, group, payee or account')
    .option('--month <month>', 'Month to report on (YYYY-MM)')
    .option('--start <date>', 'Start date (YYYY-MM-DD)')
    .option('--end <date>', 'End date (YYYY-MM-DD)')
    .option(
      '--by <key>',
      'Group by: category, group, payee, account',
      'category',
    )
    .option('--account <idOrName>', 'Only this account')
    .option('--include-income', 'Include income categories', false)
    .option('--include-transfers', 'Include transfers', false)
    .option('--include-offbudget', 'Include off-budget accounts', false)
    .option('--limit <n>', 'Show only the top N rows')
    .option('--no-total', 'Omit the TOTAL row')
    .addHelpText('after', RANGE_HELP)
    .action(async cmdOpts => {
      const opts = program.opts();
      const by = cmdOpts.by as string;
      if (!['category', 'group', 'payee', 'account'].includes(by)) {
        throw new Error(
          `Invalid --by "${by}". Expected category, group, payee or account.`,
        );
      }
      const range = resolveDateRange(cmdOpts);
      const limit = cmdOpts.limit
        ? parseIntFlag(cmdOpts.limit, '--limit')
        : undefined;
      await withConnection(
        opts,
        async () => {
          const accountId = cmdOpts.account
            ? await resolveId('accounts', cmdOpts.account)
            : undefined;
          const all = await fetchTransactions(
            range.start,
            range.end,
            accountId,
          );
          const filtered = filterForReport(all, cmdOpts);
          let rows = summarizeSpending(filtered, by as GroupKey);
          if (limit !== undefined) rows = rows.slice(0, limit);
          printOutput(cmdOpts.total ? withTotalRow(rows) : rows, opts.format);
        },
        { mutates: false },
      );
    });

  reports
    .command('payees')
    .description('Top payees by amount spent')
    .option('--month <month>', 'Month to report on (YYYY-MM)')
    .option('--start <date>', 'Start date (YYYY-MM-DD)')
    .option('--end <date>', 'End date (YYYY-MM-DD)')
    .option('--limit <n>', 'Number of payees to show', '20')
    .option('--account <idOrName>', 'Only this account')
    .option('--include-income', 'Include income categories', false)
    .option('--include-transfers', 'Include transfers', false)
    .option('--include-offbudget', 'Include off-budget accounts', false)
    .addHelpText('after', RANGE_HELP)
    .action(async cmdOpts => {
      const opts = program.opts();
      const range = resolveDateRange(cmdOpts);
      const limit = parseIntFlag(cmdOpts.limit, '--limit');
      await withConnection(
        opts,
        async () => {
          const accountId = cmdOpts.account
            ? await resolveId('accounts', cmdOpts.account)
            : undefined;
          const all = await fetchTransactions(
            range.start,
            range.end,
            accountId,
          );
          const rows = summarizeSpending(
            filterForReport(all, cmdOpts),
            'payee',
          ).slice(0, limit);
          printOutput(rows, opts.format);
        },
        { mutates: false },
      );
    });

  reports
    .command('budget')
    .description('Budgeted vs actual for a month, per category')
    .option('--month <month>', 'Budget month (YYYY-MM, default: current)')
    .option('--include-hidden', 'Include hidden groups and categories', false)
    .option('--summary', 'Show month totals instead of category rows', false)
    .option(
      '--over-only',
      'Only categories that spent more than budgeted',
      false,
    )
    .action(async cmdOpts => {
      const opts = program.opts();
      const month = assertMonth(cmdOpts.month ?? currentMonth());
      await withConnection(
        opts,
        async () => {
          const data = (await api.getBudgetMonth(month)) as Record<
            string,
            unknown
          >;
          if (cmdOpts.summary) {
            const { categoryGroups: _groups, ...summary } = data;
            printOutput(summary, opts.format);
            return;
          }
          const groups = Array.isArray(data.categoryGroups)
            ? (data.categoryGroups as BudgetMonthGroup[])
            : [];
          let rows = flattenBudgetMonth(groups, cmdOpts.includeHidden);
          if (cmdOpts.overOnly) {
            rows = rows.filter(r => r.balance < 0);
          }
          printOutput(rows, opts.format);
        },
        { mutates: false },
      );
    });

  reports
    .command('net-worth')
    .description('Month-end balances across on- and off-budget accounts')
    .option('--months <n>', 'Number of months to show', '12')
    .option(
      '--end <month>',
      'Last month to include (YYYY-MM, default: current)',
    )
    .action(async cmdOpts => {
      const opts = program.opts();
      const months = parseIntFlag(cmdOpts.months, '--months');
      if (months < 1) throw new Error('--months must be at least 1');
      const last = assertMonth(cmdOpts.end ?? currentMonth(), '--end');
      const first = addMonths(last, -(months - 1));
      await withConnection(
        opts,
        async () => {
          const rows: Array<{
            month: string;
            onBudget: number;
            offBudget: number;
            netWorth: number;
            change: number;
          }> = [];
          let previous: number | null = null;
          for (const month of monthRange(first, last)) {
            const end = monthEnd(month);
            const onBudget = await sumThrough(end, false);
            const offBudget = await sumThrough(end, true);
            const netWorth = onBudget + offBudget;
            rows.push({
              month,
              onBudget,
              offBudget,
              netWorth,
              change: previous === null ? 0 : netWorth - previous,
            });
            previous = netWorth;
          }
          printOutput(rows, opts.format);
        },
        { mutates: false },
      );
    });

  reports
    .command('trend')
    .description('Monthly income, expenses and net over time')
    .option('--months <n>', 'Number of months to show', '6')
    .option(
      '--end <month>',
      'Last month to include (YYYY-MM, default: current)',
    )
    .option(
      '--category <idOrName>',
      'Show monthly spending for one category instead',
    )
    .option('--include-transfers', 'Include transfers', false)
    .option('--include-offbudget', 'Include off-budget accounts', false)
    .action(async cmdOpts => {
      const opts = program.opts();
      const months = parseIntFlag(cmdOpts.months, '--months');
      if (months < 1) throw new Error('--months must be at least 1');
      const last = assertMonth(cmdOpts.end ?? currentMonth(), '--end');
      const first = addMonths(last, -(months - 1));
      await withConnection(
        opts,
        async () => {
          const categoryId = cmdOpts.category
            ? await resolveId('categories', cmdOpts.category)
            : undefined;
          const all = await fetchTransactions(`${first}-01`, monthEnd(last));
          const usable = filterForReport(all, {
            includeIncome: true,
            includeTransfers: cmdOpts.includeTransfers,
            includeOffbudget: cmdOpts.includeOffbudget,
          });
          let categoryName: string | undefined;
          if (categoryId) {
            const categories = await api.getCategories({});
            categoryName = categories.find(c => c.id === categoryId)?.name;
          }
          const rows = monthRange(first, last).map(month => {
            const inMonth = usable.filter(tx => tx.date.startsWith(month));
            if (categoryId !== undefined) {
              const mine = inMonth.filter(tx => tx.category === categoryId);
              return {
                month,
                category: categoryName ?? categoryId,
                transactions: mine.length,
                spent: mine.reduce((s, tx) => s + tx.amount, 0),
              };
            }
            const income = inMonth
              .filter(tx => tx['category.is_income'])
              .reduce((s, tx) => s + tx.amount, 0);
            const expenses = inMonth
              .filter(tx => !tx['category.is_income'])
              .reduce((s, tx) => s + tx.amount, 0);
            return { month, income, expenses, net: income + expenses };
          });
          printOutput(rows, opts.format);
        },
        { mutates: false },
      );
    });
}
