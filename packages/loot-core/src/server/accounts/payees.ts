// @ts-strict-ignore
import * as db from '../db';

export async function createPayee(description) {
  // Check to make sure no payee already exists with exactly the same
  // name
  const row = await db.first<Pick<db.DbPayee, 'id'>>(
    `SELECT id FROM payees WHERE UNICODE_LOWER(name) = ? AND tombstone = 0`,
    [description.toLowerCase()],
  );

  if (row) {
    return row.id;
  } else {
    return (await db.insertPayee({ name: description })) as db.DbPayee['id'];
  }
}

export async function getStartingBalancePayee() {
  let category = await db.first<db.DbCategory>(`
    SELECT * FROM categories
      WHERE is_income = 1 AND
      LOWER(name) = 'starting balances' AND
      tombstone = 0
  `);
  if (category === null) {
    category = await db.first<db.DbCategory>(
      'SELECT * FROM categories WHERE is_income = 1 AND tombstone = 0',
    );
  }

  const id = await createPayee('Starting Balance');
  return {
    id,
    category: category ? category.id : null,
  };
}
