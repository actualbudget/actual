import { readFileSync } from 'fs';

import * as api from '@actual-app/api';
import type { Command } from 'commander';

import { withConnection } from '#connection';
import type { CsvRecord } from '#csv';
import { findHeader, parseColumnMap, parseCsvRecords } from '#csv';
import { readJsonInput } from '#input';
import { printOutput } from '#output';
import { resolveId } from '#resolve';
import {
  isRecord,
  normalizeDate,
  parseAmountToCents,
  parseIntFlag,
  resolveDateRange,
} from '#utils';

const CSV_FIELDS = [
  'date',
  'amount',
  'inflow',
  'outflow',
  'payee',
  'notes',
  'category',
  'imported_id',
] as const;
type CsvField = (typeof CSV_FIELDS)[number];

const DEFAULT_HEADERS: Record<CsvField, string[]> = {
  date: ['date', 'transaction date', 'posted date', 'post date'],
  amount: ['amount', 'transaction amount', 'value'],
  inflow: ['inflow', 'credit', 'deposit', 'credit amount'],
  outflow: ['outflow', 'debit', 'withdrawal', 'debit amount'],
  payee: ['payee', 'description', 'merchant', 'name', 'payee name'],
  notes: ['notes', 'memo', 'note', 'comment'],
  category: ['category'],
  imported_id: ['id', 'transaction id', 'reference', 'fitid'],
};

export type CsvImportRow = {
  date: string;
  amount: number;
  payee_name?: string;
  notes?: string;
  imported_id?: string;
  category?: string;
};

export type CsvMapping = Partial<Record<CsvField, string>>;

/** Resolve which CSV header supplies each transaction field. */
export function resolveCsvMapping(
  headers: string[],
  explicit: Record<string, string>,
): CsvMapping {
  const mapping: CsvMapping = {};
  for (const [field, column] of Object.entries(explicit)) {
    if (!(CSV_FIELDS as readonly string[]).includes(field)) {
      throw new Error(
        `Unknown --map field "${field}". Expected one of ${CSV_FIELDS.join(', ')}.`,
      );
    }
    if (!headers.includes(column)) {
      throw new Error(
        `CSV has no column "${column}". Columns: ${headers.join(', ')}`,
      );
    }
    mapping[field as CsvField] = column;
  }
  for (const field of CSV_FIELDS) {
    if (mapping[field]) continue;
    const guess = findHeader(headers, DEFAULT_HEADERS[field]);
    if (guess) mapping[field] = guess;
  }
  if (!mapping.date) {
    throw new Error(
      'Could not find a date column. Use --map date=<Column Header>.',
    );
  }
  if (!mapping.amount && !mapping.inflow && !mapping.outflow) {
    throw new Error(
      'Could not find an amount column. Use --map amount=<Column Header> (or inflow=/outflow=).',
    );
  }
  return mapping;
}

export function csvRecordToRow(
  record: CsvRecord,
  mapping: CsvMapping,
  opts: { dateFormat?: string; invert?: boolean },
): CsvImportRow {
  const date = normalizeDate(record[mapping.date!], opts.dateFormat);
  let amount = 0;
  if (mapping.amount && record[mapping.amount]?.trim()) {
    amount = parseAmountToCents(record[mapping.amount], 'amount');
  } else {
    const inflow =
      mapping.inflow && record[mapping.inflow]?.trim()
        ? parseAmountToCents(record[mapping.inflow], 'inflow')
        : 0;
    const outflow =
      mapping.outflow && record[mapping.outflow]?.trim()
        ? parseAmountToCents(record[mapping.outflow], 'outflow')
        : 0;
    amount = Math.abs(inflow) - Math.abs(outflow);
  }
  if (opts.invert) amount = -amount;

  const row: CsvImportRow = { date, amount };
  const payee = mapping.payee ? record[mapping.payee]?.trim() : '';
  if (payee) row.payee_name = payee;
  const notes = mapping.notes ? record[mapping.notes]?.trim() : '';
  if (notes) row.notes = notes;
  const importedId = mapping.imported_id
    ? record[mapping.imported_id]?.trim()
    : '';
  if (importedId) row.imported_id = importedId;
  const category = mapping.category ? record[mapping.category]?.trim() : '';
  if (category) row.category = category;
  return row;
}

type DuplicateCandidate = {
  id: string;
  date: string;
  amount: number;
  account: string;
  payee: string;
  notes: string;
  imported_id: string;
};

export type DuplicateRow = DuplicateCandidate & { duplicateOf: string };

function daysBetween(a: string, b: string): number {
  return Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000;
}

/**
 * Find transactions in the same account with the same amount within `days`
 * of each other. The earlier transaction is treated as the original.
 */
export function findDuplicates(
  transactions: DuplicateCandidate[],
  days: number,
  samePayee: boolean,
): DuplicateRow[] {
  const sorted = [...transactions].sort((a, b) =>
    a.date === b.date ? a.id.localeCompare(b.id) : a.date < b.date ? -1 : 1,
  );
  const results: DuplicateRow[] = [];
  const flagged = new Set<string>();
  for (let i = 0; i < sorted.length; i++) {
    const original = sorted[i];
    if (flagged.has(original.id)) continue;
    for (let j = i + 1; j < sorted.length; j++) {
      const candidate = sorted[j];
      if (daysBetween(original.date, candidate.date) > days) break;
      if (flagged.has(candidate.id)) continue;
      if (candidate.account !== original.account) continue;
      if (candidate.amount !== original.amount) continue;
      if (
        samePayee &&
        candidate.payee.toLowerCase() !== original.payee.toLowerCase()
      ) {
        continue;
      }
      flagged.add(candidate.id);
      results.push({ ...candidate, duplicateOf: original.id });
    }
  }
  return results;
}

type MatchedTransaction = {
  id: string;
  date: string;
  amount: number;
  'account.name': string;
  'payee.name': string | null;
  'category.name': string | null;
  notes: string | null;
};

const MATCH_FIELDS = [
  'id',
  'date',
  'amount',
  'account.name',
  'payee.name',
  'category.name',
  'notes',
];

async function findTransactions(
  filter: Record<string, unknown>,
  limit?: number,
): Promise<MatchedTransaction[]> {
  let query = api
    .q('transactions')
    .filter(filter)
    .select(MATCH_FIELDS)
    .orderBy([{ date: 'desc' }]);
  if (limit !== undefined) query = query.limit(limit);
  const result = await api.aqlQuery(query);
  if (!isRecord(result) || !Array.isArray(result.data)) {
    throw new Error('Query result missing data');
  }
  return result.data as MatchedTransaction[];
}

async function applyUpdates(
  ids: string[],
  fields: Record<string, unknown>,
): Promise<number> {
  let updated = 0;
  await api.batchBudgetUpdates(async () => {
    for (const id of ids) {
      await api.updateTransaction(
        id,
        fields as Parameters<typeof api.updateTransaction>[1],
      );
      updated += 1;
    }
  });
  return updated;
}

const IMPORT_CSV_HELP = `
Columns are auto-detected from common headers (Date, Amount, Payee/Description,
Memo/Notes, Category, Debit/Credit). Override with --map, e.g.
  --map "date=Posted Date,amount=Amount,payee=Merchant,notes=Memo"
  --map "date=Date,outflow=Debit,inflow=Credit,payee=Description"

Amounts: negative = money out, positive = money in. Pass --invert if your bank
exports spending as positive numbers. Category values are matched by name.

Examples:
  actual transactions import-csv --account "Fidelity Checking" --file export.csv --dry-run
  actual transactions import-csv --account "Schwab Checking" --file chase.csv --date-format MM/DD/YYYY --invert`;

const BULK_HELP = `
Select transactions with an AQL filter (same syntax as "actual query run --filter").
Examples:
  # Move everything from a payee into a category
  actual transactions categorize --payee "Trader Joe" --category Groceries --dry-run

  # Categorize all uncategorized transactions in a month
  actual transactions categorize --uncategorized --month 2026-08 --category "Misc"

  # Arbitrary bulk edit
  actual transactions bulk-update --filter '{"payee.name":"Old Name"}' --data '{"notes":"migrated"}'`;

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
      await withConnection(
        opts,
        async () => {
          const result = await api.getTransactions(
            cmdOpts.account,
            cmdOpts.start,
            cmdOpts.end,
          );
          printOutput(result, opts.format);
        },
        { mutates: false },
      );
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
      await withConnection(
        opts,
        async () => {
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
        },
        { mutates: true },
      );
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
      await withConnection(
        opts,
        async () => {
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
        },
        { mutates: true },
      );
    });

  transactions
    .command('update <id>')
    .description('Update a transaction')
    .option('--data <json>', 'Fields to update as JSON')
    .option('--file <path>', 'Read fields from JSON file (use - for stdin)')
    .action(async (id: string, cmdOpts) => {
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          const fields = readJsonInput(cmdOpts) as Parameters<
            typeof api.updateTransaction
          >[1];
          await api.updateTransaction(id, fields);
          printOutput({ success: true, id }, opts.format);
        },
        { mutates: true },
      );
    });

  transactions
    .command('delete <id>')
    .description('Delete a transaction')
    .action(async (id: string) => {
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          await api.deleteTransaction(id);
          printOutput({ success: true, id }, opts.format);
        },
        { mutates: true },
      );
    });

  transactions
    .command('import-csv')
    .description('Import transactions from a CSV file (bank export)')
    .requiredOption('--account <idOrName>', 'Account ID or name')
    .requiredOption('--file <path>', 'CSV file path (use - for stdin)')
    .option('--map <fields>', 'Column mapping: field=Header,field=Header')
    .option(
      '--date-format <format>',
      'Date format, e.g. MM/DD/YYYY or DD.MM.YYYY',
    )
    .option('--delimiter <char>', 'Field delimiter', ',')
    .option('--invert', 'Flip the sign of every amount', false)
    .option('--dry-run', 'Preview without importing', false)
    .option(
      '--skip-unknown-categories',
      'Ignore category names that do not exist',
      false,
    )
    .addHelpText('after', IMPORT_CSV_HELP)
    .action(async cmdOpts => {
      const opts = program.opts();
      const text =
        cmdOpts.file === '-'
          ? readFileSync(0, 'utf-8')
          : readFileSync(cmdOpts.file, 'utf-8');
      const { headers, records } = parseCsvRecords(text, cmdOpts.delimiter);
      if (headers.length === 0) {
        throw new Error('CSV file is empty');
      }
      const mapping = resolveCsvMapping(
        headers,
        cmdOpts.map ? parseColumnMap(cmdOpts.map) : {},
      );
      const rows: CsvImportRow[] = [];
      const parseErrors: string[] = [];
      records.forEach((record, idx) => {
        if (Object.values(record).every(v => v.trim() === '')) return;
        try {
          rows.push(
            csvRecordToRow(record, mapping, {
              dateFormat: cmdOpts.dateFormat,
              invert: cmdOpts.invert,
            }),
          );
        } catch (err) {
          parseErrors.push(
            `Row ${idx + 2}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      });
      if (parseErrors.length > 0) {
        throw new Error(
          `Could not parse ${parseErrors.length} row(s):\n` +
            parseErrors.slice(0, 10).join('\n'),
        );
      }

      await withConnection(
        opts,
        async () => {
          const accountId = await resolveId('accounts', cmdOpts.account);
          const categories = await api.getCategories({});
          const byName = new Map(
            categories.map(c => [c.name.trim().toLowerCase(), c.id]),
          );
          const unknownCategories = new Set<string>();
          const payload = rows.map(row => {
            const { category, ...rest } = row;
            const entry: Record<string, unknown> = {
              ...rest,
              account: accountId,
            };
            if (category) {
              const id = byName.get(category.toLowerCase());
              if (id) entry.category = id;
              else unknownCategories.add(category);
            }
            return entry;
          });
          if (unknownCategories.size > 0 && !cmdOpts.skipUnknownCategories) {
            throw new Error(
              `Unknown categories in CSV: ${[...unknownCategories].join(', ')}. ` +
                'Create them first or pass --skip-unknown-categories.',
            );
          }
          const result = await api.importTransactions(
            accountId,
            payload as Parameters<typeof api.importTransactions>[1],
            { defaultCleared: true, dryRun: cmdOpts.dryRun },
          );
          printOutput(
            {
              account: accountId,
              dryRun: Boolean(cmdOpts.dryRun),
              parsed: rows.length,
              mapping,
              skippedCategories: [...unknownCategories],
              ...(isRecord(result) ? result : { result }),
            },
            opts.format,
          );
        },
        { mutates: !cmdOpts.dryRun },
      );
    });

  transactions
    .command('bulk-update')
    .description('Update every transaction matching an AQL filter')
    .requiredOption('--filter <json>', 'AQL filter as JSON')
    .option('--data <json>', 'Fields to set as JSON')
    .option('--file <path>', 'Read fields from JSON file (use - for stdin)')
    .option('--limit <n>', 'Only touch the newest N matches')
    .option('--dry-run', 'List matches without changing anything', false)
    .addHelpText('after', BULK_HELP)
    .action(async cmdOpts => {
      const opts = program.opts();
      const filter = JSON.parse(cmdOpts.filter);
      if (!isRecord(filter) || Object.keys(filter).length === 0) {
        throw new Error('--filter must be a non-empty JSON object');
      }
      const fields = readJsonInput(cmdOpts);
      if (!isRecord(fields) || Object.keys(fields).length === 0) {
        throw new Error('--data must be a non-empty JSON object');
      }
      const limit = cmdOpts.limit
        ? parseIntFlag(cmdOpts.limit, '--limit')
        : undefined;
      await withConnection(
        opts,
        async () => {
          const matches = await findTransactions(filter, limit);
          if (cmdOpts.dryRun) {
            printOutput(matches, opts.format);
            return;
          }
          const updated = await applyUpdates(
            matches.map(m => m.id),
            fields,
          );
          printOutput(
            { success: true, matched: matches.length, updated, fields },
            opts.format,
          );
        },
        { mutates: !cmdOpts.dryRun },
      );
    });

  transactions
    .command('categorize')
    .description('Bulk-assign a category to matching transactions')
    .requiredOption('--category <idOrName>', 'Category to assign')
    .option(
      '--payee <text>',
      'Payee name contains this text (case-insensitive)',
    )
    .option('--uncategorized', 'Only transactions with no category', false)
    .option('--account <idOrName>', 'Only this account')
    .option('--filter <json>', 'Additional AQL filter as JSON')
    .option('--month <month>', 'Limit to a month (YYYY-MM)')
    .option('--start <date>', 'Start date (YYYY-MM-DD)')
    .option('--end <date>', 'End date (YYYY-MM-DD)')
    .option('--limit <n>', 'Only touch the newest N matches')
    .option('--dry-run', 'List matches without changing anything', false)
    .addHelpText('after', BULK_HELP)
    .action(async cmdOpts => {
      const opts = program.opts();
      if (!cmdOpts.payee && !cmdOpts.uncategorized && !cmdOpts.filter) {
        throw new Error(
          'Narrow the selection with --payee, --uncategorized and/or --filter',
        );
      }
      const conditions: Record<string, unknown>[] = [];
      if (cmdOpts.payee) {
        conditions.push({ 'payee.name': { $like: `%${cmdOpts.payee}%` } });
      }
      if (cmdOpts.uncategorized) {
        conditions.push({ category: null });
      }
      if (cmdOpts.filter) {
        const extra = JSON.parse(cmdOpts.filter);
        if (!isRecord(extra)) throw new Error('--filter must be a JSON object');
        conditions.push(extra);
      }
      if (cmdOpts.month || cmdOpts.start || cmdOpts.end) {
        const range = resolveDateRange(cmdOpts);
        conditions.push({ date: { $gte: range.start, $lte: range.end } });
      }
      const limit = cmdOpts.limit
        ? parseIntFlag(cmdOpts.limit, '--limit')
        : undefined;
      await withConnection(
        opts,
        async () => {
          const categoryId = await resolveId('categories', cmdOpts.category);
          if (cmdOpts.account) {
            conditions.push({
              account: await resolveId('accounts', cmdOpts.account),
            });
          }
          // Transfers must keep their category empty.
          conditions.push({ transfer_id: null });
          const matches = await findTransactions({ $and: conditions }, limit);
          if (cmdOpts.dryRun) {
            printOutput(matches, opts.format);
            return;
          }
          const updated = await applyUpdates(
            matches.map(m => m.id),
            { category: categoryId },
          );
          printOutput(
            {
              success: true,
              category: categoryId,
              matched: matches.length,
              updated,
            },
            opts.format,
          );
        },
        { mutates: !cmdOpts.dryRun },
      );
    });

  transactions
    .command('duplicates')
    .description(
      'Find likely duplicate transactions (same account, amount, close dates)',
    )
    .option('--month <month>', 'Limit to a month (YYYY-MM)')
    .option('--start <date>', 'Start date (YYYY-MM-DD)')
    .option('--end <date>', 'End date (YYYY-MM-DD)')
    .option('--account <idOrName>', 'Only this account')
    .option('--days <n>', 'Maximum days apart to count as a duplicate', '3')
    .option('--same-payee', 'Require the payee to match too', false)
    .option('--delete', 'Delete the later transaction of each pair', false)
    .action(async cmdOpts => {
      const opts = program.opts();
      const days = parseIntFlag(cmdOpts.days, '--days');
      const range = resolveDateRange(cmdOpts);
      await withConnection(
        opts,
        async () => {
          const filter: Record<string, unknown> = {
            date: { $gte: range.start, $lte: range.end },
          };
          if (cmdOpts.account) {
            filter.account = await resolveId('accounts', cmdOpts.account);
          }
          const result = await api.aqlQuery(
            api
              .q('transactions')
              .filter(filter)
              .select([
                'id',
                'date',
                'amount',
                'account.name',
                'payee.name',
                'notes',
                'imported_id',
              ]),
          );
          if (!isRecord(result) || !Array.isArray(result.data)) {
            throw new Error('Query result missing data');
          }
          const candidates = (
            result.data as Array<Record<string, unknown>>
          ).map(raw => ({
            id: String(raw.id),
            date: String(raw.date),
            amount: Number(raw.amount),
            account: String(raw['account.name'] ?? ''),
            payee: String(raw['payee.name'] ?? ''),
            notes: String(raw.notes ?? ''),
            imported_id: String(raw.imported_id ?? ''),
          }));
          const duplicates = findDuplicates(
            candidates,
            days,
            cmdOpts.samePayee,
          );
          if (!cmdOpts.delete) {
            printOutput(duplicates, opts.format);
            return;
          }
          for (const dup of duplicates) {
            await api.deleteTransaction(dup.id);
          }
          printOutput(
            {
              success: true,
              deleted: duplicates.length,
              ids: duplicates.map(d => d.id),
            },
            opts.format,
          );
        },
        { mutates: Boolean(cmdOpts.delete) },
      );
    });
}
