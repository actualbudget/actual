import { getAccountDb } from '../src/account-db';

export const up = async function () {
  getAccountDb().exec(`
    ALTER TABLE files ADD COLUMN amount_encoding INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE files ADD COLUMN file_path TEXT;
    CREATE TABLE amount_encoding_transitions (
      file_id TEXT NOT NULL,
      transition_id TEXT NOT NULL,
      source_group TEXT NOT NULL,
      target_encoding INTEGER NOT NULL,
      group_id TEXT NOT NULL,
      PRIMARY KEY (file_id, transition_id)
    );
  `);
};

export const down = async function () {
  const db = getAccountDb();
  if (db.first('SELECT id FROM files WHERE file_path IS NOT NULL LIMIT 1')) {
    throw new Error(
      'Cannot downgrade files using protected amount encoding publication',
    );
  }
  db.exec(`
    DROP TABLE amount_encoding_transitions;
    ALTER TABLE files DROP COLUMN file_path;
    ALTER TABLE files DROP COLUMN amount_encoding;
  `);
};
