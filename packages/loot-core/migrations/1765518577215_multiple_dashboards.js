import { v4 as uuidv4 } from 'uuid';

export default async function runMigration(db) {
  db.transaction(() => {
    // 1. Create dashboards table
    db.execQuery(`
      CREATE TABLE dashboard_pages
        (id TEXT PRIMARY KEY,
         name TEXT,
         tombstone INTEGER DEFAULT 0);
    `);

    // 2. Add dashboard_page_id to dashboard (widgets) table
    db.execQuery(`
      ALTER TABLE dashboard ADD COLUMN dashboard_page_id TEXT;
    `);

    // 3. Create a default dashboard
    const defaultDashboardId = uuidv4();
    db.runQuery(`INSERT INTO dashboard_pages (id, name) VALUES (?, ?)`, [
      defaultDashboardId,
      'Main',
    ]);

    // 4. Migrate existing widgets to the default dashboard
    db.runQuery(`UPDATE dashboard SET dashboard_page_id = ?`, [
      defaultDashboardId,
    ]);
  });
}
