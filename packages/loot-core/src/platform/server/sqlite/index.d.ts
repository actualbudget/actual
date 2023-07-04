import { type Database } from 'better-sqlite3';

export async function init(): unknown;

export function _getModule(): SqlJsStatic;

export function prepare(db, sql): unknown;

export function runQuery(
  db: unknown,
  sql: string,
  params?: (string | number)[],
  fetchAll?: false,
): { changes: unknown };
export function runQuery<T>(
  db: unknown,
  sql: string,
  params: (string | number)[],
  fetchAll: true,
): T[];

export function execQuery(db, sql): void;

export function transaction(db, fn): unknown;

export async function asyncTransaction(db, fn): unknown;

export async function openDatabase(pathOrBuffer?: string | Buffer): Database;

export function closeDatabase(db): void;

export async function exportDatabase(db): Buffer;
