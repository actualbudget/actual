export default async function runMigration(db) {
  function getValue(node) {
    return node.expr != null ? node.expr : node.cachedValue;
  }

  await db.exec(`
CREATE TABLE zero_budget_months
  (id TEXT PRIMARY KEY,
   buffered BIGINT DEFAULT 0);

CREATE TABLE zero_budgets
  (id TEXT PRIMARY KEY,
   month DATE,
   category VARCHAR(36),
   amount BIGINT DEFAULT 0,
   carryover BOOLEAN DEFAULT FALSE);

CREATE TABLE reflect_budgets
  (id TEXT PRIMARY KEY,
   month DATE,
   category VARCHAR(36),
   amount INTEGER DEFAULT 0,
   carryover BOOLEAN DEFAULT FALSE);

CREATE TABLE notes
  (id TEXT PRIMARY KEY,
   note TEXT);

CREATE TABLE kvcache (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE kvcache_key (id INTEGER PRIMARY KEY, key REAL);
`);

  // Migrate budget amounts and carryover
  const { rows: budget } = await db.query(
    // eslint-disable-next-line rulesdir/typography
    `SELECT * FROM spreadsheet_cells WHERE name LIKE 'budget%!budget-%'`,
  );
  await db.transaction(async tx => {
    for (const monthBudget of budget) {
      const match = monthBudget.name.match(
        /^(budget-report|budget)(\d+)!budget-(.+)$/,
      );
      if (match == null) {
        console.log('Warning: invalid budget month name', monthBudget.name);
        return;
      }

      const type = match[1];
      const month = match[2].slice(0, 4) + '-' + match[2].slice(4);
      const dbmonth = parseInt(match[2]);
      const cat = match[3];

      let amount = parseInt(getValue(monthBudget));
      if (isNaN(amount)) {
        amount = 0;
      }

      const sheetName = monthBudget.name.split('!')[0];
      const { rows: carryover } = await tx.query(
        'SELECT * FROM spreadsheet_cells WHERE name = $1',
        [`${sheetName}!carryover-${cat}`],
      );

      const table =
        type === 'budget-report' ? 'reflect_budgets' : 'zero_budgets';
      await tx.query(
        `INSERT INTO ${table} (id, month, category, amount, carryover) VALUES ($1, $2, $3, $4, $5)`,
        [
          `${month}-${cat}`,
          dbmonth,
          cat,
          amount,
          carryover.length > 0 && getValue(carryover[0]) === 'true' ? 1 : 0,
        ],
      );
    }
  });

  // Migrate buffers
  const { rows: buffers } = await db.query(
    // eslint-disable-next-line rulesdir/typography
    `SELECT * FROM spreadsheet_cells WHERE name LIKE 'budget%!buffered'`,
  );
  await db.transaction(async tx => {
    for (const buffer of buffers) {
      const match = buffer.name.match(/^budget(\d+)!buffered$/);
      if (match) {
        const month = match[1].slice(0, 4) + '-' + match[1].slice(4);
        let amount = parseInt(getValue(buffer));
        if (isNaN(amount)) {
          amount = 0;
        }

        await tx.query(
          `INSERT INTO zero_budget_months (id, buffered) VALUES ($1, $2)`,
          [month, amount],
        );
      }
    }
  });

  // Migrate notes
  const { rows: notes } = await db.query(
    // eslint-disable-next-line rulesdir/typography
    `SELECT * FROM spreadsheet_cells WHERE name LIKE 'notes!%'`,
  );

  const parseNote = str => {
    try {
      const value = JSON.parse(str);
      return value && value !== '' ? value : null;
    } catch (e) {
      return null;
    }
  };

  await db.transaction(async tx => {
    for (const note of notes) {
      const parsed = parseNote(getValue(note));
      if (parsed) {
        const [, id] = note.name.split('!');
        await tx.query(`INSERT INTO notes (id, note) VALUES ($1, $2)`, [
          id,
          parsed,
        ]);
      }
    }
  });

  await db.exec(`
    DROP TABLE spreadsheet_cells;
    -- PostgreSQL does this automatically.
    -- ANALYZE;
    -- VACUUM;
  `);
}
