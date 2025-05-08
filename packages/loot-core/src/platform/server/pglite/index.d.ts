import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';

export type PgliteDatabase = ReturnType<typeof drizzle>;

export async function openDatabase(id?: string): Promise<PgliteDatabase>;
export async function exportDatabase(db: PGlite): Promise<Uint8Array>;
