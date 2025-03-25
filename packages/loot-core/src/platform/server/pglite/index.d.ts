import { PGlite } from '@electric-sql/pglite';

export async function openDatabase(dataDir?: string): Promise<PGlite>;

export async function exportDatabase(db: PGlite): Promise<Uint8Array>;
