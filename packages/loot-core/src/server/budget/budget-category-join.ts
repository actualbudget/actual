// Joins the category `c` of each budget amount `b`: its own, or the one of
// the currency line it was budgeted on (see `category-currencies.ts`).
// Amounts of removed lines have none.
export const BUDGET_CATEGORY_JOIN = `
  LEFT JOIN category_currencies cc
    ON cc.id = b.category
   AND cc.tombstone = 0
   AND cc.start_month IS NOT NULL
  JOIN categories c ON c.id = COALESCE(cc.category, b.category)`;
