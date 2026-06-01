import { getAccountDb } from '../src/account-db';

export const up = async function () {
  await getAccountDb().exec(`
    CREATE TABLE IF NOT EXISTS secrets_new (
      file_id TEXT NOT NULL,
      name TEXT NOT NULL,
      value BLOB,
      PRIMARY KEY(file_id, name)
    );

    INSERT OR IGNORE INTO secrets_new (file_id, name, value)
    SELECT files.id, secrets.name, secrets.value
    FROM secrets
    CROSS JOIN files
    WHERE files.deleted = 0;

    DROP TABLE secrets;
    ALTER TABLE secrets_new RENAME TO secrets;
  `);
};

export const down = async function () {
  const db = getAccountDb();

  // Detect secrets that have multiple distinct values across different budget files
  const conflicts = db.all(`
    SELECT name
    FROM secrets
    GROUP BY name
    HAVING COUNT(DISTINCT value) > 1
  `);

  if (conflicts.length > 0) {
    const conflictNames = conflicts.map(r => r.name).join(', ');
    console.warn(
      `[Bank Sync Migration] Rolling back per-file bank sync. ` +
        `The following secrets have different values across budget files and ` +
        `only one value will be kept (others discarded): ${conflictNames}. ` +
        `You will need to reconfigure bank sync for your budget files after this rollback.`,
    );
  } else {
    console.warn(
      `[Bank Sync Migration] Rolling back per-file bank sync. ` +
        `You will need to reconfigure bank sync for your budget files after this rollback.`,
    );
  }

  await db.exec(`
    CREATE TABLE IF NOT EXISTS secrets_old (
      name TEXT PRIMARY KEY,
      value BLOB
    );

    INSERT OR IGNORE INTO secrets_old (name, value)
    SELECT name, value FROM secrets;

    DROP TABLE secrets;
    ALTER TABLE secrets_old RENAME TO secrets;
  `);
};
