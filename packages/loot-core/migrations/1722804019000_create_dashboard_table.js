import { v4 as uuidv4 } from 'uuid';

/* eslint-disable actual/typography */
export default async function runMigration(db) {
  db.transaction(() => {
    db.execQuery(`
      CREATE TABLE dashboard
        (id TEXT PRIMARY KEY,
         type TEXT,
         width INTEGER,
         height INTEGER,
         x INTEGER,
         y INTEGER,
         meta TEXT,
         tombstone INTEGER DEFAULT 0);

      INSERT INTO dashboard (id, type, width, height, x, y)
      VALUES
        ('${uuidv4()}','net-worth-card', 8, 2, 0, 0),
        ('${uuidv4()}', 'cash-flow-card', 4, 2, 8, 0),
        ('${uuidv4()}', 'spending-card', 4, 2, 0, 2);
    `);

    // Add custom reports to the dashboard
    const reports = db.runQuery(
      'SELECT id FROM custom_reports WHERE tombstone = 0 ORDER BY name COLLATE NOCASE ASC',
      [],
      true,
    );
    reports.forEach((report, id) => {
      db.runQuery(
        `INSERT INTO dashboard (id, type, width, height, x, y, meta) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          'custom-report',
          4,
          2,
          (id * 4) % 12,
          2 + Math.floor(id / 3) * 2,
          JSON.stringify({ id: report.id }),
        ],
      );
    });
  });
}
