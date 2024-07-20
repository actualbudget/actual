/* eslint-disable rulesdir/typography */
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
         meta TEXT);

      INSERT INTO dashboard (type, width, height, x, y)
      VALUES
        ('cash-flow-card', 6, 2, 6, 0),
        ('net-worth-card', 6, 2, 0, 0);
    `);

    // Add custom reports to the dashboard
    const reports = db.runQuery('SELECT id FROM custom_reports', [], true);
    reports.forEach((report, id) => {
      db.runQuery(
        `INSERT INTO dashboard (type, width, height, x, y, meta) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          'custom-report',
          4,
          2,
          (id * 4) % 12,
          ((id + 1) * 4) % 12,
          JSON.stringify({ id: report.id }),
        ],
      );
    });
  });
}
