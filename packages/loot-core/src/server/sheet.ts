// @ts-strict-ignore
import { type Database } from '@jlongster/sql.js';

import { captureBreadcrumb } from '../platform/exceptions';
import * as sqlite from '../platform/server/sqlite';
import { sheetForMonth } from '../shared/months';
import * as Platform from '../shared/platform';

import {
  DbPreference,
  DbReflectBudget,
  DbZeroBudget,
  DbZeroBudgetMonth,
} from './db';
import { Spreadsheet } from './spreadsheet/spreadsheet';
import { resolveName } from './spreadsheet/util';

let globalSheet: Spreadsheet;
let globalOnChange;
let globalCacheDb;

export function get(): Spreadsheet {
  return globalSheet;
}

async function updateSpreadsheetCache(rawDb, names: string[]) {
  await sqlite.transaction(rawDb, () => {
    names.forEach(name => {
      const node = globalSheet._getNode(name);

      // Don't cache query nodes yet
      if (node.sql == null) {
        sqlite.runQuery(
          rawDb,
          'INSERT OR REPLACE INTO kvcache (key, value) VALUES (?, ?)',
          [name, JSON.stringify(node.value)],
        );
      }
    });
  });
}

function setCacheStatus(
  mainDb: Database,
  cacheDb: Database,
  { clean }: { clean: boolean },
) {
  if (clean) {
    // Generate random number and stick in both places
    const num = Math.random() * 10000000;
    sqlite.runQuery(
      cacheDb,
      'INSERT OR REPLACE INTO kvcache_key (id, key) VALUES (1, ?)',
      [num],
    );

    if (mainDb) {
      sqlite.runQuery(
        mainDb,
        'INSERT OR REPLACE INTO kvcache_key (id, key) VALUES (1, ?)',
        [num],
      );
    }
  } else {
    sqlite.runQuery(cacheDb, 'DELETE FROM kvcache_key');
  }
}

function isCacheDirty(mainDb: Database, cacheDb: Database): boolean {
  let rows = sqlite.runQuery<{ key?: number }>(
    cacheDb,
    'SELECT key FROM kvcache_key WHERE id = 1',
    [],
    true,
  );
  const num = rows.length === 0 ? null : rows[0].key;

  if (num == null) {
    return true;
  }

  if (mainDb) {
    const rows = sqlite.runQuery<{ key?: number }>(
      mainDb,
      'SELECT key FROM kvcache_key WHERE id = 1',
      [],
      true,
    );
    if (rows.length === 0 || rows[0].key !== num) {
      return true;
    }
  }

  // Always also check if there is anything in `kvcache`. We ask for one item;
  // if we didn't get back anything it's empty so there is no cache
  rows = sqlite.runQuery(cacheDb, 'SELECT * FROM kvcache LIMIT 1', [], true);
  return rows.length === 0;
}

export async function loadSpreadsheet(
  db,
  onSheetChange?,
): Promise<Spreadsheet> {
  const cacheEnabled = process.env.NODE_ENV !== 'test';
  const mainDb = db.getDatabase();
  let cacheDb;

  if (!Platform.isBrowser && cacheEnabled) {
    // Desktop apps use a separate database for the cache. This is because it is
    // much more likely to directly work with files on desktop, and this makes
    // it a lot clearer what the true filesize of the main db is (and avoid
    // copying the cache data around).
    const cachePath = db
      .getDatabasePath()
      .replace(/db\.sqlite$/, 'cache.sqlite');
    globalCacheDb = cacheDb = sqlite.openDatabase(cachePath);

    sqlite.execQuery(
      cacheDb,
      `
        CREATE TABLE IF NOT EXISTS kvcache (key TEXT PRIMARY KEY, value TEXT);
        CREATE TABLE IF NOT EXISTS kvcache_key (id INTEGER PRIMARY KEY, key REAL)
      `,
    );
  } else {
    // All other platforms use the same database for cache
    cacheDb = mainDb;
  }

  let sheet;
  if (cacheEnabled) {
    sheet = new Spreadsheet(
      updateSpreadsheetCache.bind(null, cacheDb),
      setCacheStatus.bind(null, mainDb, cacheDb),
    );
  } else {
    sheet = new Spreadsheet();
  }

  captureBreadcrumb({
    message: 'loading spreadsheet',
    category: 'server',
  });

  globalSheet = sheet;
  globalOnChange = onSheetChange;

  if (onSheetChange) {
    sheet.addEventListener('change', onSheetChange);
  }

  if (cacheEnabled && !isCacheDirty(mainDb, cacheDb)) {
    const cachedRows = await sqlite.runQuery<{ key?: number; value: string }>(
      cacheDb,
      'SELECT * FROM kvcache',
      [],
      true,
    );
    console.log(`Loaded spreadsheet from cache (${cachedRows.length} items)`);

    for (const row of cachedRows) {
      const parsed = JSON.parse(row.value);
      sheet.load(row.key, parsed);
    }
  } else {
    console.log('Loading fresh spreadsheet');
    await loadUserBudgets(db);
  }

  captureBreadcrumb({
    message: 'loaded spreadsheet',
    category: 'server',
  });

  return sheet;
}

export function unloadSpreadsheet(): void {
  if (globalSheet) {
    // TODO: Should wait for the sheet to finish
    globalSheet.unload();
    globalSheet = null;
  }

  if (globalCacheDb) {
    sqlite.closeDatabase(globalCacheDb);
    globalCacheDb = null;
  }
}

export async function reloadSpreadsheet(db): Promise<Spreadsheet> {
  if (globalSheet) {
    unloadSpreadsheet();
    return loadSpreadsheet(db, globalOnChange);
  }
}

export async function loadUserBudgets(
  db: typeof import('./db'),
): Promise<void> {
  const sheet = globalSheet;

  // TODO: Clear out the cache here so make sure future loads of the app
  // don't load any extra values that aren't set here

  const { value: budgetType = 'envelope' } =
    (await db.first<Pick<DbPreference, 'value'>>(
      'SELECT value from preferences WHERE id = ?',
      ['budgetType'],
    )) ?? {};

  const table = budgetType === 'tracking' ? 'reflect_budgets' : 'zero_budgets';
  const budgets = await db.all<DbReflectBudget | DbZeroBudget>(`
      SELECT * FROM ${table} b
      LEFT JOIN categories c ON c.id = b.category
      WHERE c.tombstone = 0
    `);

  sheet.startTransaction();

  // Load all the budget amounts and carryover values
  for (const budget of budgets) {
    if (budget.month && budget.category) {
      const sheetName = `budget${budget.month}`;
      sheet.set(`${sheetName}!budget-${budget.category}`, budget.amount);
      sheet.set(
        `${sheetName}!carryover-${budget.category}`,
        budget.carryover === 1 ? true : false,
      );
      sheet.set(`${sheetName}!goal-${budget.category}`, budget.goal);
      sheet.set(`${sheetName}!long-goal-${budget.category}`, budget.long_goal);
    }
  }

  // For zero-based budgets, load the buffered amounts
  if (budgetType !== 'tracking') {
    const budgetMonths = await db.all<DbZeroBudgetMonth>(
      'SELECT * FROM zero_budget_months',
    );
    for (const budgetMonth of budgetMonths) {
      const sheetName = sheetForMonth(budgetMonth.id);
      sheet.set(`${sheetName}!buffered`, budgetMonth.buffered);
    }
  }

  sheet.endTransaction();
}

export function getCell(sheet: string, name: string) {
  return globalSheet._getNode(resolveName(sheet, name));
}

export function getCellValue(
  sheet: string,
  name: string,
): string | number | boolean {
  return globalSheet.getValue(resolveName(sheet, name));
}

export function startTransaction(): void {
  if (globalSheet) {
    globalSheet.startTransaction();
  }
}

export function endTransaction(): void {
  if (globalSheet) {
    globalSheet.endTransaction();
  }
}

export function waitOnSpreadsheet(): Promise<void> {
  return new Promise(resolve => {
    if (globalSheet) {
      globalSheet.onFinish(resolve);
    } else {
      resolve(undefined);
    }
  });
}
