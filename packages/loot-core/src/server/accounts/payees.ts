// @ts-strict-ignore
import { CategoryEntity, PayeeEntity } from '../../types/models';
import * as db from '../db';

export async function createPayee(description) {
  // Check to make sure no payee already exists with exactly the same
  // name
  const row: Pick<PayeeEntity, 'id'> = await db.first(
    `SELECT id FROM payees WHERE UNICODE_LOWER(name) = ? AND tombstone = 0`,
    [description.toLowerCase()],
  );

  if (row) {
    return row.id;
  } else {
    return (await db.insertPayee({ name: description })) as PayeeEntity['id'];
  }
}

export async function getStartingBalancePayee() {
  let category: CategoryEntity = await db.first(`
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

  const id = await createPayee('Starting Balance');
  return {
    id,
    category: category ? category.id : null,
  };
}
