import { DEFAULT_DASHBOARD_PAGE_ID } from '#shared/dashboard';

// The `multiple_dashboards` migration seeded `dashboard_pages` with a
// `uuidv4()` generated at migration time. Migrations run locally on every
// device and emit no sync messages, so each device ended up with its own
// "Main" page id. Widgets, which *do* sync, carry a `dashboard_page_id` —
// so a widget added on one device arrived on the other pointing at a page
// that device had never heard of, and was filtered out of the UI entirely.
//
// Re-point that seeded page at a constant id so every device agrees on it,
// then adopt the widgets that have been orphaned in the meantime.
//
// Every write here is a raw query on purpose: these are local repairs, and
// syncing them would have the two devices overwriting each other's
// `dashboard_page_id` values back and forth.
export default async function runMigration(db) {
  db.transaction(() => {
    // Tombstoned pages count as known: their widgets were tombstoned along
    // with them and should stay deleted, not be adopted below
    const pages = db.runQuery(`SELECT id FROM dashboard_pages`, [], true);

    const isCanonical = ({ id }) => id === DEFAULT_DASHBOARD_PAGE_ID;

    if (pages.length > 0 && !pages.some(isCanonical)) {
      const seededId = findSeededPageId(db, pages);

      if (seededId) {
        db.runQuery(`UPDATE dashboard_pages SET id = ? WHERE id = ?`, [
          DEFAULT_DASHBOARD_PAGE_ID,
          seededId,
        ]);
        db.runQuery(
          `UPDATE dashboard SET dashboard_page_id = ? WHERE dashboard_page_id = ?`,
          [DEFAULT_DASHBOARD_PAGE_ID, seededId],
        );
      }
    }

    // Adopt the widgets whose page does not exist on this device — either
    // synced in from a device with a different seeded page id, or left
    // without a page at all
    const adoptingPageId = db.runQuery(
      `SELECT id FROM dashboard_pages
       ORDER BY id = ? DESC, rowid ASC
       LIMIT 1`,
      [DEFAULT_DASHBOARD_PAGE_ID],
      true,
    )[0]?.id;

    if (adoptingPageId) {
      db.runQuery(
        `UPDATE dashboard SET dashboard_page_id = ?
         WHERE dashboard_page_id IS NULL
            OR dashboard_page_id NOT IN (SELECT id FROM dashboard_pages)`,
        [adoptingPageId],
      );
    }
  });
}

// Which page did the migration seed? Pages created through the app go
// through `insertWithSchema`, which records sync messages; the seeded one
// has none. `sync-reset` clears `messages_crdt` though, so this can come
// back ambiguous — leave the ids alone in that case rather than guess, and
// let the orphan adoption above keep the widgets visible.
function findSeededPageId(db, pages) {
  if (pages.length === 1) {
    return pages[0].id;
  }

  const unsynced = db.runQuery(
    `SELECT id FROM dashboard_pages
     WHERE id NOT IN (
       SELECT row FROM messages_crdt WHERE dataset = 'dashboard_pages'
     )`,
    [],
    true,
  );

  return unsynced.length === 1 ? unsynced[0].id : null;
}
