import { DEFAULT_DASHBOARD_STATE } from '#shared/dashboard';

// Default dashboard names are persisted user data. Mark only the untouched
// seeded page and widgets so clients can localize them without guessing from a
// title that a user may also have chosen.
export default async function runMigration(db) {
  db.transaction(() => {
    db.execQuery(
      'ALTER TABLE dashboard_pages ADD COLUMN builtin_key TEXT DEFAULT NULL;',
    );

    const seeded = db.runQuery(
      `SELECT id FROM dashboard_pages
       WHERE rowid = (SELECT MIN(rowid) FROM dashboard_pages) AND name = 'Main'`,
      [],
      true,
    )[0];

    if (!seeded) {
      return;
    }

    db.runQuery('UPDATE dashboard_pages SET builtin_key = ? WHERE id = ?', [
      'main',
      seeded.id,
    ]);

    for (const widget of DEFAULT_DASHBOARD_STATE) {
      if (!widget.meta || !('builtin_key' in widget.meta)) {
        continue;
      }

      const existing = db.runQuery(
        `SELECT id, meta FROM dashboard
         WHERE dashboard_page_id = ? AND type = ? AND width = ? AND height = ?
           AND x = ? AND y = ? AND tombstone = 0`,
        [
          seeded.id,
          widget.type,
          widget.width,
          widget.height,
          widget.x,
          widget.y,
        ],
        true,
      );
      const originalMeta = { ...widget.meta, builtin_key: undefined };
      const seededMeta = JSON.stringify(widget.meta);

      for (const row of existing) {
        if (
          row.meta !== JSON.stringify(originalMeta) &&
          row.meta !== seededMeta
        ) {
          continue;
        }
        db.runQuery('UPDATE dashboard SET meta = ? WHERE id = ?', [
          seededMeta,
          row.id,
        ]);
      }
    }
  });
}
