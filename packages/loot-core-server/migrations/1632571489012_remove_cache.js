export default async function runMigration(db) {
  function getValue(node) {
    return node.expr != null ? node.expr : node.cachedValue;
  }

  db.execQuery(`
CREATE TABLE zero_budget_months
  (id TEXT PRIMARY KEY,
   buffered INTEGER DEFAULT 0);

CREATE TABLE zero_budgets
  (id TEXT PRIMARY KEY,
   month INTEGER,
   category TEXT,
   amount INTEGER DEFAULT 0,
   carryover INTEGER DEFAULT 0);

CREATE TABLE reflect_budgets
  (id TEXT PRIMARY KEY,
   month INTEGER,
   category TEXT,
   amount INTEGER DEFAULT 0,
   carryover INTEGER DEFAULT 0);

CREATE TABLE notes
  (id TEXT PRIMARY KEY,
   note TEXT);

CREATE TABLE kvcache (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE kvcache_key (id INTEGER PRIMARY KEY, key REAL);
`);

  // Migrate budget amounts and carryover
  const budget = db.runQuery(
    `SELECT * FROM spreadsheet_cells WHERE name LIKE 'budget%!budget-%'`,
    [],
    true,
  );
  db.transaction(() => {
    budget.forEach(monthBudget => {
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
      const carryover = db.runQuery(
        'SELECT * FROM spreadsheet_cells WHERE name = ?',
        [`${sheetName}!carryover-${cat}`],
        true,
      );

      const table =
        type === 'budget-report' ? 'reflect_budgets' : 'zero_budgets';
      db.runQuery(
        `INSERT INTO ${table} (id, month, category, amount, carryover) VALUES (?, ?, ?, ?, ?)`,
        [
          `${month}-${cat}`,
          dbmonth,
          cat,
          amount,
          carryover.length > 0 && getValue(carryover[0]) === 'true' ? 1 : 0,
        ],
      );
    });
  });

  // Migrate buffers
  const buffers = db.runQuery(
    `SELECT * FROM spreadsheet_cells WHERE name LIKE 'budget%!buffered'`,
    [],
    true,
  );
  db.transaction(() => {
    buffers.forEach(buffer => {
      const match = buffer.name.match(/^budget(\d+)!buffered$/);
      if (match) {
        const month = match[1].slice(0, 4) + '-' + match[1].slice(4);
        let amount = parseInt(getValue(buffer));
        if (isNaN(amount)) {
          amount = 0;
        }

        db.runQuery(
          `INSERT INTO zero_budget_months (id, buffered) VALUES (?, ?)`,
          [month, amount],
        );
      }
    });
  });

  // Migrate notes
  const notes = db.runQuery(
    `SELECT * FROM spreadsheet_cells WHERE name LIKE 'notes!%'`,
    [],
    true,
  );

  const parseNote = str => {
    try {
      const value = JSON.parse(str);
      return value && value !== '' ? value : null;
    } catch (e) {
      return null;
    }
  };

  db.transaction(() => {
    notes.forEach(note => {
      const parsed = parseNote(getValue(note));
      if (parsed) {
        const [, id] = note.name.split('!');
        db.runQuery(`INSERT INTO notes (id, note) VALUES (?, ?)`, [id, parsed]);
      }
    });
  });

  db.execQuery(`
    DROP TABLE spreadsheet_cells;
    ANALYZE;
    VACUUM;
  `);
}
