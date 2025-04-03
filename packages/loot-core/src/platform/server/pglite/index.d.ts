import { drizzle } from 'drizzle-orm/pglite';

export type PgliteDatabase = ReturnType<typeof drizzle>;

export async function openDatabase(dataDir?: string): Promise<PgliteDatabase>;

export async function exportDatabase(db: PgliteDatabase): Promise<Uint8Array>;
