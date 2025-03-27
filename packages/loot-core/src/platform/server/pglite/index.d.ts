import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';

export type PgliteDatabase = ReturnType<typeof drizzle>;

export async function openDatabase(dataDir?: string): Promise<PgliteDatabase>;

export async function exportDatabase(db: PGlite): Promise<Uint8Array>;
