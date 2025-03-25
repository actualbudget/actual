import { PGlite } from '@electric-sql/pglite';

export async function init(): Promise<void>;

export async function runQuery(
  db: PGlite,
  sql: string,
  params?: (string | number)[],
  fetchAll?: false,
): Promise<{ changes: unknown }>;
export async function runQuery<T>(
  db: PGlite,
  sql: string,
  params: (string | number)[],
  fetchAll: true,
): Promise<T[]>;

export async function execQuery(db: PGlite, sql: string): Promise<void>;

export function transaction(
  db: PGlite,
  fn: Parameters<typeof db.transaction>[0],
): void;

export async function openDatabase(dataDir?: string): Promise<PGlite>;

export async function closeDatabase(db: PGlite): Promise<void>;

export async function exportDatabase(db: PGlite): Promise<Uint8Array>;
