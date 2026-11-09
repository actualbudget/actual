import * as db from '#server/db';
import { EVERY_CURRENCY, getOwnLineStart } from '#shared/fx/ownLines';
import {
  getSqlDefaultCurrencyCode,
  getSqlOwnLineStarts,
  isSqlConversionEnabled,
} from '#shared/fx/sql';

// A currency budgeted on its own line in a category. Spending or income of
// accounts in that currency counts in the line, in that currency, from its
// first month on.
export type CurrencyLine = {
  id: string;
  category: string;
  currency: string;
  // YYYYMM, or 0 for every month
  startMonth: number;
  // Whether its category is an income category
  isIncome: boolean;
  // A line that exists only because its currency is budgeted on its own and
  // its category has spending in it; it is stored once it gets a budget
  automatic: boolean;
};

let linesByCategory = new Map<string, CurrencyLine[]>();
let linesById = new Map<string, CurrencyLine>();

function addLine(line: CurrencyLine) {
  linesById.set(line.id, line);
  const lines = linesByCategory.get(line.category) ?? [];
  lines.push(line);
  lines.sort((a, b) => a.currency.localeCompare(b.currency));
  linesByCategory.set(line.category, lines);
}

// The stored line of a category in the currency of the account `a` of the
// transaction `t`, if any. A stored line decides on its own from which month
// the transaction counts in it; a currency budgeted on its own adds lines to
// every other category. Rows without a first month, left by an earlier
// version for removed lines, are ignored.
export const STORED_LINE_JOIN = `LEFT JOIN category_currencies cc
             ON cc.category = t.category
            AND cc.currency = a.currency
            AND cc.tombstone = 0
            AND cc.start_month IS NOT NULL`;

// Whether a transaction `t` (with its account `a`) counts in a line of its
// own because its currency is budgeted on its own, from the currency's
// first month on. Never null, so it can be negated. Null while no currency
// is budgeted on its own.
function getOwnLineSql(): string | null {
  const starts = getSqlOwnLineStarts();
  if (starts == null) {
    return null;
  }
  const listed = [...starts.keys()].filter(code => code !== EVERY_CURRENCY);
  const every = starts.get(EVERY_CURRENCY);
  const conditions = listed.map(
    code =>
      `(a.currency = ${quote(code)} AND t.date / 100 >= ${starts.get(code)})`,
  );
  if (every != null) {
    conditions.push(
      listed.length > 0
        ? `(a.currency NOT IN (${listed.map(quote).join(', ')}) AND t.date / 100 >= ${every})`
        : `t.date / 100 >= ${every}`,
    );
  }
  return `(a.currency IS NOT NULL
           AND a.currency <> ${quote(getSqlDefaultCurrencyCode())}
           AND (${conditions.join(' OR ')}))`;
}

// The categories and currencies budgeted on their own with spending of
// on-budget accounts and no stored row, as the spending queries count it
function getAutomaticPairs(ownLine: string) {
  return db.runQuery<{ category: string; currency: string; is_income: number }>(
    `SELECT t.category AS category,
            a.currency AS currency,
            COALESCE(MAX(c.is_income), 0) AS is_income
       FROM v_transactions_internal_alive t
       LEFT JOIN accounts a ON a.id = t.account
       LEFT JOIN categories c ON c.id = t.category
       ${STORED_LINE_JOIN}
      WHERE t.category IS NOT NULL
        AND a.offbudget = 0
        AND cc.id IS NULL
        AND ${ownLine}
      GROUP BY t.category, a.currency`,
    [],
    true,
  );
}

// Synchronous, as the budget builds and updates its cells synchronously
export function loadCurrencyLines(): void {
  linesByCategory = new Map();
  linesById = new Map();
  for (const row of db.getCategoryCurrenciesSync()) {
    addLine({
      id: row.id,
      category: row.category,
      currency: row.currency,
      startMonth: row.start_month,
      isIncome: row.is_income === 1,
      automatic: false,
    });
  }
  const starts = getSqlOwnLineStarts();
  const ownLine = getOwnLineSql();
  if (starts == null || ownLine == null) {
    return;
  }
  for (const pair of getAutomaticPairs(ownLine)) {
    const id = db.getCategoryCurrencyId(pair.category, pair.currency);
    if (!linesById.has(id)) {
      addLine({
        id,
        category: pair.category,
        currency: pair.currency,
        startMonth: getOwnLineStart(starts, pair.currency) ?? 0,
        isIncome: pair.is_income === 1,
        automatic: true,
      });
    }
  }
}

export function getCurrencyLines(categoryId: string): CurrencyLine[] {
  return linesByCategory.get(categoryId) ?? [];
}

export function getCurrencyLine(id: string): CurrencyLine | undefined {
  return linesById.get(id);
}

export function getAllCurrencyLines(): CurrencyLine[] {
  return [...linesById.values()];
}

export function getCategoriesWithCurrencyLines(): string[] {
  return [...linesByCategory.keys()];
}

// The currency of a category, a currency line or To Budget
export function getLineCurrency(id: string): string {
  return getCurrencyLine(id)?.currency ?? getSqlDefaultCurrencyCode();
}

// The category a currency line belongs to, or the category itself
export function getLineCategory(id: string): string {
  return getCurrencyLine(id)?.category ?? id;
}

// Whether a line can be budgeted in a month ('YYYY-MM'); categories always
export function isLineStarted(id: string, month: string): boolean {
  const line = getCurrencyLine(id);
  return !line || toLineMonth(month) >= line.startMonth;
}

// Stores an automatic line once it gets a budget, a goal or a rollover of
// its own, so they stay with it when its currency stops being budgeted on
// its own
export async function storeAutomaticLine(id: string): Promise<void> {
  const line = getCurrencyLine(id);
  if (!line?.automatic) {
    return;
  }
  // Stored once, however many months a change covers
  line.automatic = false;
  await db.insertCategoryCurrency({
    category: line.category,
    currency: line.currency,
    start_month: line.startMonth,
  });
}

// 'YYYY-MM' to YYYYMM, as the first months of lines are stored
export function toLineMonth(month: string): number {
  return parseInt(month.replace('-', ''));
}

// YYYYMM to 'YYYY-MM'
export function fromLineMonth(month: number): string {
  const text = String(month);
  return `${text.slice(0, 4)}-${text.slice(4, 6)}`;
}

function quote(text: string): string {
  return `'${text.replace(/'/g, "''")}'`;
}

// Whether a transaction counts in a currency line: a stored line from its
// first month on, or a currency budgeted on its own where the category has
// no stored row. Never null, so it can be negated.
function getInLineSql(): string {
  const stored = `(cc.id IS NOT NULL AND cc.start_month <= t.date / 100)`;
  const ownLine = getOwnLineSql();
  return ownLine == null
    ? stored
    : `(${stored} OR (cc.id IS NULL AND ${ownLine}))`;
}

// How the spending of transactions `t` (with their account `a`) is split
// between categories and their currency lines: `line` is the id of the cell
// a transaction counts in and `amount` what it counts for there. A
// transaction in a currency the category has a line for counts in that line,
// in that currency, from the line's first month on; any other counts in the
// category itself, converted into the default currency at the rate of the
// transaction's date. Before a pair's first rate its earliest later rate is
// used, so adding a rate re-values the months that had no earlier one.
// While multiple currencies are off, and for accounts without a currency or
// in the default one, amounts are used as they are. Every query of category
// spending uses this, so they all agree.
export function getSpendingSql(): {
  join: string;
  line: string;
  amount: string;
} {
  if (!isSqlConversionEnabled()) {
    return { join: '', line: 't.category', amount: 't.amount' };
  }
  const defaultCurrency = quote(getSqlDefaultCurrencyCode());
  const inLine = getInLineSql();
  return {
    join: `${STORED_LINE_JOIN}
            AND cc.currency <> ${defaultCurrency}`,
    // The id of a line is its category and currency
    line: `CASE WHEN ${inLine} THEN t.category || '-' || a.currency ELSE t.category END`,
    amount: `CASE WHEN ${inLine} OR a.currency IS NULL OR a.currency = ${defaultCurrency} THEN t.amount ELSE FX_CONVERT_ON_DATE(t.amount, a.currency, t.date) END`,
  };
}

// The condition selecting transactions in another currency that count in
// their category converted, as no line of the category has their currency
export function getConvertedFilterSql(): string {
  if (!isSqlConversionEnabled()) {
    return '0';
  }
  const defaultCurrency = quote(getSqlDefaultCurrencyCode());
  return `a.currency IS NOT NULL AND a.currency <> ${defaultCurrency} AND NOT ${getInLineSql()}`;
}

// The condition selecting the transactions counted in `lineId`, a category
// or one of its currency lines
export function getLineFilterSql(lineId: string): string {
  const line = getCurrencyLine(lineId);
  if (!isSqlConversionEnabled()) {
    // Without multiple currencies a line counts nothing
    return line ? '0' : `t.category = ${quote(lineId)}`;
  }
  const inLine = getInLineSql();
  return line
    ? `t.category = ${quote(line.category)} AND a.currency = ${quote(line.currency)} AND ${inLine}`
    : `t.category = ${quote(lineId)} AND NOT ${inLine}`;
}
