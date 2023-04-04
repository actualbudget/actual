export async function init(): unknown;

export function _getModule(): SqlJsStatic;

export function prepare(db, sql): unknown;

export function runQuery(
  db: unknown,
  sql: string,
  params?: string[],
  fetchAll?: false,
): { changes: unknown };
export function runQuery(
  db: unknown,
  sql: string,
  params: string[],
  fetchAll: true,
): unknown[];

export function execQuery(db, sql): void;

export function transaction(db, fn): unknown;

export async function asyncTransaction(db, fn): unknown;

export async function openDatabase(pathOrBuffer?: string | Buffer): unknown;

export function closeDatabase(db): void;

export function exportDatabase(db): void;
