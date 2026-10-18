import { readFile, stat } from 'node:fs/promises';

// The Deutsche Kreditwirtschaft's FinTS bank list, bundled with the server.
// ACTUAL_FINTS_BANK_LIST_PATH can point to a newer version.
import bundledBankList from './data/fints_institute.csv?raw';

export type FinTSBank = {
  blz: string;
  name: string;
  city: string;
  url: string;
};

type IndexedBank = FinTSBank & {
  /** Normalised name and city, see `normalise`. */
  searchKey: string;
  normalisedName: string;
};

type BankIndex = {
  byBlz: Map<string, IndexedBank>;
  all: IndexedBank[];
};

type Columns = { blz: number; name: number; city: number; url: number };

// Where the columns of the Deutsche Kreditwirtschaft's `fints_institute.csv`
// are when the file has no recognisable header. Normally they are found by
// their header names, so a new list with added columns still works.
const DEFAULT_COLUMNS: Columns = { blz: 1, name: 3, city: 4, url: 24 };

// How often the server checks whether the bank list file was replaced.
export const RECHECK_INTERVAL_MS = 10_000;

export const MAX_SEARCH_RESULTS = 10;

/**
 * Folds text for matching: case, umlauts written either way ("München",
 * "Muenchen", "Munchen") and punctuation do not matter.
 */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Parses the FinTS bank list distributed to registered FinTS developers. The
 * list is not redistributable, so the server only reads a copy the admin
 * points it to. Banks without a PIN/TAN endpoint are skipped; for bank codes
 * listed more than once, the first entry with an endpoint wins.
 */
export function parseBankList(content: string): Map<string, FinTSBank> {
  return new Map(
    [...indexBankList(content).byBlz].map(([blz, bank]) => [blz, toBank(bank)]),
  );
}

/**
 * Splits semicolon separated values. Fields may be quoted, and quoted fields
 * may contain semicolons and line breaks (the list's header does).
 */
export function parseCsv(content: string, delimiter = ';'): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let isQuoted = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (isQuoted) {
      if (char === '"' && content[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        isQuoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field === '') {
      isQuoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && content[i + 1] === '\n') {
        i++;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Finds the columns by their names in the header, if there is one. */
function findColumns(rows: string[][]): { columns: Columns; start: number } {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const cells = rows[i].map(cell =>
      cell.replace(/\s+/g, ' ').trim().toLowerCase(),
    );
    const blz = cells.indexOf('blz');
    const name = cells.indexOf('institut');
    const url = cells.findIndex(
      cell => cell.includes('pin/tan') && cell.includes('url'),
    );
    if (blz >= 0 && name >= 0 && url >= 0) {
      return {
        columns: { blz, name, url, city: cells.indexOf('ort') },
        start: i + 1,
      };
    }
  }
  return { columns: DEFAULT_COLUMNS, start: 0 };
}

/**
 * The list is published as ISO-8859-1. Should it ever come as UTF-8, that is
 * detected: Latin-1 text with umlauts is never valid UTF-8.
 */
export function decodeBankList(data: Buffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true })
      .decode(data)
      .replace(/^\uFEFF/, '');
  } catch {
    return data.toString('latin1');
  }
}

function indexBankList(content: string): BankIndex {
  const byBlz = new Map<string, IndexedBank>();
  const rows = parseCsv(content);
  const { columns, start } = findColumns(rows);

  for (const cells of rows.slice(start)) {
    const blz = cells[columns.blz]?.trim();
    const name = cells[columns.name]?.trim();
    const city = (columns.city >= 0 ? cells[columns.city]?.trim() : '') ?? '';
    const url = cells[columns.url]?.trim();

    if (
      !blz ||
      !/^\d{8}$/.test(blz) ||
      !name ||
      !url?.startsWith('https://') ||
      byBlz.has(blz)
    ) {
      continue;
    }

    byBlz.set(blz, {
      blz,
      name,
      city,
      url,
      normalisedName: normalise(name),
      searchKey: normalise(`${name} ${city}`),
    });
  }

  return { byBlz, all: [...byBlz.values()] };
}

function toBank({ blz, name, city, url }: IndexedBank): FinTSBank {
  return { blz, name, city, url };
}

/**
 * Finds banks by bank code or by name and city. A query of digits matches
 * bank codes starting with it; otherwise every word of the query has to
 * occur in the bank's name or city. Exact codes and names starting with the
 * query come first.
 */
export function searchBankIndex(
  index: BankIndex,
  query: string,
  limit = MAX_SEARCH_RESULTS,
): FinTSBank[] {
  const compact = query.replace(/\s+/g, '');
  if (/^\d+$/.test(compact)) {
    return index.all
      .filter(bank => bank.blz.startsWith(compact))
      .sort((a, b) => a.blz.localeCompare(b.blz))
      .slice(0, limit)
      .map(toBank);
  }

  const normalisedQuery = normalise(query);
  const words = normalisedQuery.split(' ').filter(Boolean);
  if (words.length === 0) {
    return [];
  }

  return index.all
    .filter(bank => words.every(word => bank.searchKey.includes(word)))
    .map(bank => ({
      bank,
      rank: bank.normalisedName.startsWith(normalisedQuery)
        ? 0
        : bank.normalisedName.startsWith(words[0])
          ? 1
          : 2,
    }))
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.bank.name.localeCompare(b.bank.name, 'de') ||
        a.bank.city.localeCompare(b.bank.city, 'de'),
    )
    .slice(0, limit)
    .map(({ bank }) => toBank(bank));
}

type LoadedList = {
  path: string;
  mtimeMs: number;
  size: number;
  index: BankIndex;
  checkedAt: number;
};

let loaded: LoadedList | null = null;
let pending: Promise<BankIndex> | null = null;
let bundled: BankIndex | null = null;

function getBundledIndex(): BankIndex {
  bundled ??= indexBankList(bundledBankList);
  return bundled;
}

/**
 * Returns the bank list: the configured file if there is one, otherwise the
 * bundled list. A configured file is read again when it changed, so updating
 * the list only means replacing the file; no restart is needed.
 */
async function loadIndex(bankListPath: string): Promise<BankIndex> {
  if (!bankListPath) {
    return getBundledIndex();
  }
  if (
    loaded?.path === bankListPath &&
    Date.now() - loaded.checkedAt < RECHECK_INTERVAL_MS
  ) {
    return loaded.index;
  }

  pending ??= refresh(bankListPath).finally(() => {
    pending = null;
  });
  return pending;
}

async function refresh(bankListPath: string): Promise<BankIndex> {
  const previous = loaded?.path === bankListPath ? loaded : null;

  try {
    const info = await stat(bankListPath);
    if (!info.isFile()) {
      throw new Error('not a file');
    }
    if (
      previous &&
      previous.mtimeMs === info.mtimeMs &&
      previous.size === info.size
    ) {
      previous.checkedAt = Date.now();
      return previous.index;
    }

    const index = indexBankList(decodeBankList(await readFile(bankListPath)));
    if (index.all.length === 0) {
      throw new Error('no banks with a FinTS address found');
    }

    loaded = {
      path: bankListPath,
      mtimeMs: info.mtimeMs,
      size: info.size,
      index,
      checkedAt: Date.now(),
    };
    console.log(
      `Loaded FinTS bank list from ${bankListPath}: ${index.all.length} banks`,
    );
    return index;
  } catch (error) {
    const message = error instanceof Error ? error.message : error;
    if (!previous) {
      // Not readable at all (e.g. a mount of a missing file): use the
      // bundled list rather than none, and try the file again later.
      console.warn(
        `FinTS bank list at ${bankListPath} cannot be read, using the bundled one:`,
        message,
      );
      loaded = {
        path: bankListPath,
        mtimeMs: -1,
        size: -1,
        index: getBundledIndex(),
        checkedAt: Date.now(),
      };
      return loaded.index;
    }
    // While being replaced, the file can be missing or half written for a
    // moment. Keep using the last good list until the new one is readable.
    console.warn(
      `FinTS bank list at ${bankListPath} cannot be read, keeping the previous one:`,
      message,
    );
    previous.checkedAt = Date.now();
    return previous.index;
  }
}

/** For tests: forgets the loaded list. */
export function resetBankListForTests() {
  loaded = null;
  pending = null;
  bundled = null;
}

/** Whether there are banks to search: the bundled list always has some. */
export async function isBankListAvailable(
  bankListPath: string,
): Promise<boolean> {
  return (await loadIndex(bankListPath)).all.length > 0;
}

export async function lookupBank(
  bankListPath: string,
  blz: string,
): Promise<FinTSBank | null> {
  const bank = (await loadIndex(bankListPath)).byBlz.get(blz);
  return bank ? toBank(bank) : null;
}

export async function searchBanks(
  bankListPath: string,
  query: string,
): Promise<FinTSBank[]> {
  return searchBankIndex(await loadIndex(bankListPath), query);
}

/** For tests: builds the search index from the list's content. */
export function createBankIndex(content: string): BankIndex {
  return indexBankList(content);
}
