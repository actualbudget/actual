const SYNCED_PREF_KEYS = [
  'firstDayOfWeekIdx',
  'dateFormat',
  'numberFormat',
  'hideFraction',
  'isPrivacyEnabled',
  /^show-extra-balances-/,
  /^hide-cleared-/,
  /^parse-date-/,
  /^csv-mappings-/,
  /^csv-delimiter-/,
  /^csv-has-header-/,
  /^ofx-fallback-missing-payee-/,
  /^flip-amount-/,
  'budgetType',
  /^flags\./,
];

export default async function runMigration(db, { fs, fileId }) {
  await db.execQuery(`
    CREATE TABLE preferences
       (id TEXT PRIMARY KEY,
        value TEXT);
  `);

  try {
    const budgetDir = fs.getBudgetDir(fileId);
    const fullpath = fs.join(budgetDir, 'metadata.json');

    const prefs = JSON.parse(await fs.readFile(fullpath));

    if (typeof prefs !== 'object') {
      return;
    }

    await Promise.all(
      Object.keys(prefs).map(async key => {
        // Check if the current key is of synced-keys type
        if (
          !SYNCED_PREF_KEYS.find(keyMatcher =>
            keyMatcher instanceof RegExp
              ? keyMatcher.test(key)
              : keyMatcher === key,
          )
        ) {
          return;
        }

        // insert the synced prefs in the new table
        db.runQuery('INSERT INTO preferences (id, value) VALUES (?, ?)', [
          key,
          String(prefs[key]),
        ]);
      }),
    );
  } catch {
    // Do nothing
  }
}
