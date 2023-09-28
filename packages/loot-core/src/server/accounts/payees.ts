import * as db from '../db';

/* eslint-disable import/no-unused-modules */
export async function createPayee(description) {
  // Check to make sure no payee already exists with exactly the same
  // name
  let row = await db.first(
    `SELECT id FROM payees WHERE UNICODE_LOWER(name) = ? AND tombstone = 0`,
    [description.toLowerCase()],
  );

  if (row) {
    return row.id;
  } else {
    return db.insertPayee({ name: description });
  }
}

export async function getStartingBalancePayee() {
  let category = await db.first(`
    SELECT * FROM categories
      WHERE is_income = 1 AND
      LOWER(name) = 'starting balances' AND
      tombstone = 0
  `);
  if (category === null) {
    category = await db.first(
      'SELECT * FROM categories WHERE is_income = 1 AND tombstone = 0',
    );
  }

  let id = await createPayee('Starting Balance');
  return {
    id,
    category: category ? category.id : null,
  };
}
