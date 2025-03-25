export default async function runMigration(db) {
  const { rows: categories } = await db.query(
    'SELECT id FROM categories WHERE tombstone IS FALSE',
  );

  const { rows: customReports } = await db.query(
    'SELECT id, selected_categories, conditions FROM custom_reports WHERE tombstone IS FALSE AND selected_categories IS NOT NULL',
  );

  // Move all `selected_categories` to `conditions` if possible.. otherwise skip
  for (const report of customReports) {
    const conditions = report.conditions ? JSON.parse(report.conditions) : [];
    const selectedCategories = report.selected_categories
      ? JSON.parse(report.selected_categories)
      : [];
    const selectedCategoryIds = selectedCategories.map(({ id }) => id);

    const areAllCategoriesSelected = !categories.find(
      ({ id }) => !selectedCategoryIds.includes(id),
    );

    // Do nothing if all categories are selected.. we don't need to add a new condition for that
    if (areAllCategoriesSelected) {
      continue;
    }

    // If `conditions` already has a "category" filter - skip the entry
    if (conditions.find(({ field }) => field === 'category')) {
      continue;
    }

    // Append a new condition with the selected category IDs
    await db.query('UPDATE custom_reports SET conditions = $1 WHERE id = $2', [
      JSON.stringify([
        ...conditions,
        {
          field: 'category',
          op: 'oneOf',
          value: selectedCategoryIds,
          type: 'id',
        },
      ]),
      report.id,
    ]);
  }

  // Remove all the `selectedCategories` values - we don't need them anymore
  await db.query(
    'UPDATE custom_reports SET selected_categories = NULL WHERE tombstone IS FALSE',
  );
}
