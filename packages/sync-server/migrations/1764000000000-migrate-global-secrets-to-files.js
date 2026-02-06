import { getAccountDb } from '../src/account-db';

export const up = async function () {
  const db = getAccountDb();

  const files = db.all('SELECT id FROM files WHERE deleted = 0');
  const globalSecrets = db.all(
    "SELECT name, value FROM secrets WHERE file_id = '__global__' OR file_id IS NULL",
  );

  for (const secret of globalSecrets) {
    for (const file of files) {
      db.mutate(
        'INSERT OR IGNORE INTO secrets (file_id, name, value) VALUES (?, ?, ?)',
        [file.id, secret.name, secret.value],
      );
    }
  }

  db.mutate(
    "DELETE FROM secrets WHERE file_id = '__global__' OR file_id IS NULL",
  );
};

export const down = async function () {
  const db = getAccountDb();

  const fileSecrets = db.all(
    "SELECT DISTINCT name, value FROM secrets WHERE file_id != '__global__'",
  );

  for (const secret of fileSecrets) {
    db.mutate(
      "INSERT OR IGNORE INTO secrets (file_id, name, value) VALUES ('__global__', ?, ?)",
      [secret.name, secret.value],
    );
  }

  db.exec("DELETE FROM secrets WHERE file_id != '__global__'");
};
