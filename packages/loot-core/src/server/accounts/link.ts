// @ts-strict-ignore

import * as db from '#server/db';

export async function findOrCreateBank(institution, requisitionId) {
  const bank = await db.first<Pick<db.DbBank, 'id' | 'bank_id'>>(
    'SELECT id, bank_id FROM banks WHERE bank_id = ?',
    [requisitionId],
  );

  if (bank) {
    return bank;
  }

  const bankData = {
    id: crypto.randomUUID(),
    bank_id: requisitionId,
    name: institution.name,
  };

  await db.insertWithUUID('banks', bankData);

  return bankData;
}
