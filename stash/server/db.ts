import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = process.env.DATA_DIR || './data';
const DB_PATH = path.join(DATA_DIR, 'stash.db');

import fs from 'fs';
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent reads
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_es TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    icon TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#6366f1',
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES categories(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    amount REAL NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Seed default PIN (hashed)
function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin + 'stash-salt-2024').digest('hex');
}

const configStmt = db.prepare('SELECT value FROM app_config WHERE key = ?');
if (!configStmt.get('pin_hash')) {
  const defaultPin = process.env.STASH_PIN || '1234';
  db.prepare('INSERT INTO app_config (key, value) VALUES (?, ?)').run('pin_hash', hashPin(defaultPin));
}

// Seed default categories if empty
const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
if (catCount.count === 0) {
  const insertCat = db.prepare('INSERT INTO categories (id, name, name_es, amount, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const defaults = [
    ['saving', 'Saving', 'Ahorro', 2200, '💰', '#10B981', 0],
    ['giving', 'Giving', 'Diezmo', 1400, '🤲', '#8B5CF6', 1],
    ['travel', 'Travel', 'Viajes', 0, '✈️', '#3B82F6', 2],
    ['kupuri', 'Kupuri', 'Kupuri', 2000, '🌟', '#F59E0B', 3],
    ['bills', 'Bills', 'Cuentas', 800, '📄', '#EF4444', 4],
    ['emergency', 'Emergency', 'Emergencia', 2000, '🚨', '#F97316', 5],
    ['pleasure', 'Pleasure', 'Placer', 500, '🎉', '#EC4899', 6],
    ['medical', 'Medical', 'Médico', 0, '🏥', '#06B6D4', 7],
  ];
  const seedAll = db.transaction(() => {
    for (const cat of defaults) {
      insertCat.run(...cat);
    }
  });
  seedAll();
}

export { db, hashPin };
