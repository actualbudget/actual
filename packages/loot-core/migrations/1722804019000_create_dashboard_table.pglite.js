import { v4 as uuidv4 } from 'uuid';

/* eslint-disable rulesdir/typography */
export default async function runMigration(db) {
  await db.transaction(async tx => {
    await tx.exec(`
      CREATE TABLE dashboard
        (id VARCHAR(36) PRIMARY KEY,
         type TEXT,
         width INTEGER,
         height INTEGER,
         x INTEGER,
         y INTEGER,
         meta JSONB,
         tombstone BOOLEAN DEFAULT FALSE);

      INSERT INTO dashboard (id, type, width, height, x, y)
      VALUES
        ('${uuidv4()}','net-worth-card', 8, 2, 0, 0),
        ('${uuidv4()}', 'cash-flow-card', 4, 2, 8, 0),
        ('${uuidv4()}', 'spending-card', 4, 2, 0, 2);
    `);

    // Add custom reports to the dashboard
    const { rows: reports } = await tx.query(
      'SELECT id FROM custom_reports WHERE tombstone IS FALSE ORDER BY LOWER(name) ASC',
      [],
      true,
    );
    for (const [idx, report] of reports.entries()) {
      await tx.query(
        `INSERT INTO dashboard (id, type, width, height, x, y, meta) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          uuidv4(),
          'custom-report',
          4,
          2,
          (idx * 4) % 12,
          2 + Math.floor(idx / 3) * 2,
          JSON.stringify({ id: report.id }),
        ],
      );
    }
  });
}
