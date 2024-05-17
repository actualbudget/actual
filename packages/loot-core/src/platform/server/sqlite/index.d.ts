import { type Database } from '@jlongster/sql.js';

export async function init(): unknown;

export function _getModule(): SqlJsStatic;

export function prepare(db, sql): unknown;

export function runQuery(
  db: Database,
  sql: string,
  params?: (string | number)[],
  fetchAll?: false,
): { changes: unknown };
export function runQuery<T>(
  db: Database,
  sql: string,
  params: (string | number)[],
  fetchAll: true,
): T[];

export function execQuery(db: Database, sql): void;

export function transaction(db: Database, fn: () => void): void;

export async function asyncTransaction(
  db: Database,
  fn: () => Promise<void>,
): Promise<void>;

export async function openDatabase(pathOrBuffer?: string | Buffer): Database;

export function closeDatabase(db: Database): void;

export async function exportDatabase(db: Database): Promise<Uint8Array>;
