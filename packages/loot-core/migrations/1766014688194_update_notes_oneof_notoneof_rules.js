export default async function runMigration(db) {
  // Migrate note rules
  const rules = db.runQuery(
    `SELECT *
     FROM rules
     WHERE conditions IS NOT NULL`,
    [],
    true,
  );

  db.transaction(() => {
    for (const rule of rules) {
      const conditions = JSON.parse(rule.conditions);

      const conditionsToUpdate = conditions
        .filter(c => c.field === 'notes')
        .filter(c => c.op === 'oneOf');

      if(conditionsToUpdate.length === 0) continue;

      const updatedConditions = conditionsToUpdate.map(c => {
        const values = Array.isArray(c.value) ? c.value : [];
        const newValues = values
          .map(v => v.toLowerCase())
          .join('|');

        return {...c, op: "matches", value: newValues}
      });

      const otherConditions = conditions
        .filter(c => !conditionsToUpdate.some(o => o.id === c.id));

      const newConditionsValue = [
        ...otherConditions,
        ...updatedConditions
      ];

      db.runQuery('UPDATE rules SET conditions = ? WHERE id = ?', [JSON.stringify(newConditionsValue), rule.id])
    }
  });
}
