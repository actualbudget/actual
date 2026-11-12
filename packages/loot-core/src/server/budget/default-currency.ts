import * as db from '#server/db';
import { APIError } from '#server/errors';
import { resetFormulaPreferencesCache } from '#server/formulas/bootstrap';
import { pinAccountCurrencies } from '#server/fx/accountCurrency';
import { batchMessages } from '#server/sync';
import { isSupportedCurrencyCode } from '#shared/fx/currency';
import {
  getOwnLineStart,
  parseOwnLines,
  serializeOwnLines,
} from '#shared/fx/ownLines';
import {
  convertAtMonthRate,
  getSqlDefaultCurrencyCode,
  isSqlConversionEnabled,
} from '#shared/fx/sql';
import type { SyncedPrefs } from '#types/prefs';

import { createMissingPreferences, editBudgets } from './budget-rows';

// How amounts of a currency are written, saved along with it
const FORMAT_PREFERENCES = [
  'numberFormat',
  'hideFraction',
  'currencySymbolPosition',
  'currencySpaceBetweenAmountAndSymbol',
] as const;

export type DefaultCurrencyFormat = Partial<
  Pick<Required<SyncedPrefs>, (typeof FORMAT_PREFERENCES)[number]>
>;

async function isMultiCurrencyOn(): Promise<boolean> {
  const flags = await db.all<Pick<db.DbPreference, 'id' | 'value'>>(
    `SELECT id, value FROM preferences
      WHERE id IN ('flags.currency', 'flags.multiCurrency')`,
  );
  return flags.length === 2 && flags.every(flag => flag.value === 'true');
}

// What becomes of what was recorded in `from`, the default currency until
// now, once `to` is the default. Accounts without a currency of their own
// get `from`, so their transactions keep their currency. Categories follow
// the currencies budgeted on their own, like every other currency: from the
// month `from` is budgeted on its own, the budgets, rollovers and goals of
// each category move into a line in `from`, which takes its spending in
// `from`, so nothing is converted; in earlier months, or every month when
// `from` isn't budgeted on its own, they become budgets in `to`, converted
// at each month's rate, and spending in `from` is converted into its
// category. Lines in `to` become the categories' own budgets. Amounts held
// for next month are converted, as To Budget is in the default currency.
async function moveToDefault(from: string, to: string) {
  await pinAccountCurrencies(from);

  const categories = new Set((await db.getCategories()).map(row => row.id));
  const lines = (
    await db.all<Pick<db.DbCategoryCurrency, 'id' | 'category' | 'currency'>>(
      `SELECT id, category, currency FROM category_currencies
        WHERE tombstone = 0 AND start_month IS NOT NULL`,
    )
  ).filter(line => categories.has(line.category));
  const linesIn = (currency: string) =>
    lines.filter(line => line.currency === currency);

  const ownLines = await db.first<Pick<db.DbPreference, 'value'>>(
    "SELECT value FROM preferences WHERE id = 'currency-own-lines'",
  );
  const starts = parseOwnLines(ownLines?.value);
  starts.delete(to);
  // The first month (YYYYMM) `from` is budgeted on its own in
  const since = getOwnLineStart(starts, from) ?? Number.POSITIVE_INFINITY;
  const isBefore = (month: number) => month < since;
  const isSince = (month: number) => month >= since;

  const budgeted = Number.isFinite(since)
    ? (
        await db.all<{ category: string }>(
          `SELECT DISTINCT category FROM (
             SELECT category, month, amount, carryover, goal, long_goal
               FROM zero_budgets
             UNION ALL
             SELECT category, month, amount, carryover, goal, long_goal
               FROM reflect_budgets
           )
           WHERE month >= ?
             AND (amount != 0 OR carryover != 0
                  OR goal IS NOT NULL OR long_goal IS NOT NULL)`,
          [since],
        )
      )
        .map(row => row.category)
        .filter(category => categories.has(category))
    : [];
  // Lines for the budgets; spending elsewhere gets lines by itself
  for (const category of budgeted) {
    await db.insertCategoryCurrency({
      category,
      currency: from,
      start_month: since,
    });
  }

  await editBudgets(rows => {
    // Lines in `from` left from earlier: before `since` their budgets join
    // the category, to be converted with it
    for (const line of linesIn(from)) {
      rows.move(line.id, line.category, isBefore);
    }
    for (const category of budgeted) {
      rows.move(category, db.getCategoryCurrencyId(category, from), isSince);
    }
    rows.convert(categories, from, to, isBefore);
    for (const line of linesIn(to)) {
      rows.move(line.id, line.category);
    }
  });
  if (!Number.isFinite(since)) {
    for (const line of linesIn(from)) {
      await db.deleteCategoryCurrency({ id: line.id });
    }
  }
  for (const line of linesIn(to)) {
    await db.deleteCategoryCurrency({ id: line.id });
  }

  const held = await db.all<db.DbZeroBudgetMonth>(
    'SELECT id, buffered FROM zero_budget_months WHERE buffered != 0',
  );
  for (const month of held) {
    await db.update('zero_budget_months', {
      id: month.id,
      buffered: convertAtMonthRate(month.buffered, from, to, month.id),
    });
  }

  await db.update('preferences', {
    id: 'currency-own-lines',
    value: serializeOwnLines(starts),
  });
}

// Makes `currency` the default; see `moveToDefault` for what happens to
// what was recorded in the old one while multiple currencies are on.
// Accounts that followed no default before take the new one. `format` is
// saved in the same change, so one undo brings everything back.
export async function changeDefaultCurrency({
  currency,
  format = {},
}: {
  currency: string;
  format?: DefaultCurrencyFormat;
}): Promise<void> {
  if (!isSupportedCurrencyCode(currency)) {
    throw APIError(`Unsupported currency: ${currency}`);
  }
  const previous = getSqlDefaultCurrencyCode();
  const isMoving = isSqlConversionEnabled() && previous !== currency;
  const isPinning = !isMoving && (await isMultiCurrencyOn());
  await createMissingPreferences([
    'defaultCurrencyCode',
    'currency-own-lines',
    ...FORMAT_PREFERENCES.filter(id => format[id] != null),
  ]);

  await batchMessages(async () => {
    if (isMoving) {
      await moveToDefault(previous, currency);
    } else if (isPinning) {
      await pinAccountCurrencies(currency);
    }
    await db.update('preferences', {
      id: 'defaultCurrencyCode',
      value: currency,
    });
    for (const id of FORMAT_PREFERENCES) {
      const value = format[id];
      if (value != null) {
        await db.update('preferences', { id, value });
      }
    }
  });
  resetFormulaPreferencesCache();
}
